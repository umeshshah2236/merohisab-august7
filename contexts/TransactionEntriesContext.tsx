import React, { useState, useCallback, useRef, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Platform } from 'react-native';
import { auth, firestoreHelpers, handleFirebaseError } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';

export interface TransactionEntry {
  id: string;
  user_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  transaction_type: 'given' | 'received';
  description: string | null;
  transaction_date: string;
  balance_after: number;
  created_at: string;
  updated_at: string;
}

export interface TransactionEntryInsert {
  user_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  transaction_type: 'given' | 'received';
  description?: string | null;
  transaction_date?: string;
  balance_after: number;
}

export interface CustomerBalance {
  id: string;
  name: string;
  phone: string | null;
  customer_type: 'customer' | 'supplier';
  balance: number;
  last_transaction_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardTotals {
  to_receive: number;
  to_give: number;
  total_customers: number;
}

export const [TransactionEntriesProvider, useTransactionEntries] = createContextHook(() => {
  // Always call hooks in the same order - never conditionally
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to ensure valid session
  const ensureValidSession = async () => {
    try {
      // Check both Firebase Auth current user and our context user
      const currentUser = auth.currentUser;
      const contextUser = firebaseUser;
      
      if (!currentUser && !contextUser) {
        console.error('No current user found');
        throw new Error('No valid session found');
      }

      // Use context user if Firebase Auth user is not available (for mock users)
      const activeUser = currentUser || contextUser;
      if (!activeUser) {
        console.error('No active user found');
        throw new Error('No valid session found');
      }

      console.log('Session validation successful');
    } catch (error) {
      console.error('Error ensuring valid session:', error);
      throw error;
    }
  };

  // Add a new transaction entry
  const addTransactionEntry = async (
    customerName: string,
    amount: number,
    transactionType: 'given' | 'received',
    description?: string
  ): Promise<TransactionEntry> => {
    if (!firebaseUser) {
      throw new Error('Your account session has expired. Please sign out and sign in again.');
    }

    setLoading(true);
    setError(null);

    try {
      await ensureValidSession();

      // Get the active user (Firebase Auth or context user)
      const currentUser = auth.currentUser;
      const contextUser = firebaseUser;
      const activeUser = currentUser || contextUser;

      // Get the user ID - handle both real Firebase Auth (uid) and mock auth (id)
      const userId = activeUser.uid || activeUser.id;
      
      if (!userId) {
        console.error('Active user has no UID or ID in addTransactionEntry');
        throw new Error('Active user has no UID or ID');
      }

      const transactionData = {
        user_id: userId,
        customer_id: '', // You might want to get this from customer lookup
        customer_name: customerName.trim(),
        amount: amount,
        transaction_type: transactionType,
        description: description?.trim() || null,
        transaction_date: new Date().toISOString(),
        balance_after: 0, // You might want to calculate this
      };

      const result = await firestoreHelpers.addTransactionEntry(transactionData);
      
      if (!result.success) {
        throw new Error('Failed to add transaction entry');
      }

      console.log('Transaction entry added successfully:', result.data);
      
      return result.data;
      
    } catch (error) {
      console.error('Error in addTransactionEntry:', error);
      
      if (error instanceof Error && error.message.includes('session has expired')) {
        setError(error.message);
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get customer transaction history with improved error handling
  const getCustomerTransactions = async (customerName: string): Promise<TransactionEntry[]> => {
    console.log('getCustomerTransactions called with customerName:', customerName);
    console.log('firebaseUser in context:', firebaseUser?.uid);
    console.log('auth.currentUser:', auth.currentUser?.uid);
    
    return retryWithUser(async () => {
      // Try to get user from multiple sources
      const currentUser = auth.currentUser;
      const contextUser = firebaseUser;
      const activeUser = currentUser || contextUser;

      console.log('getCustomerTransactions - currentUser:', currentUser);
      console.log('getCustomerTransactions - contextUser:', contextUser);
      console.log('getCustomerTransactions - activeUser:', activeUser);
      console.log('getCustomerTransactions - activeUser type:', typeof activeUser);
      console.log('getCustomerTransactions - activeUser keys:', activeUser ? Object.keys(activeUser) : 'null');

      if (!activeUser) {
        console.error('No active user found in getCustomerTransactions');
        console.log('currentUser:', currentUser);
        console.log('contextUser:', contextUser);
        console.log('firebaseUser:', firebaseUser);
        throw new Error('No active user available');
      }

      // Get the user ID - handle both real Firebase Auth (uid) and mock auth (id)
      const userId = activeUser.uid || activeUser.id;
      
      if (!userId) {
        console.error('Active user has no UID or ID');
        console.log('activeUser object:', activeUser);
        console.log('activeUser.uid:', activeUser.uid);
        console.log('activeUser.id:', activeUser.id);
        console.log('activeUser type:', typeof activeUser);
        throw new Error('Active user has no UID or ID');
      }

      console.log('Getting customer transactions for:', customerName);
      console.log('Using active user ID:', userId);
      
      // For now, we'll get all transactions and filter by customer name
      // In a real implementation, you might want to add a helper function for this
      const allTransactions = await firestoreHelpers.getTransactionEntries(userId);
      
      console.log('All transactions fetched:', allTransactions.length, 'entries');
      console.log('Sample transactions:', allTransactions.slice(0, 3).map(t => ({
        id: t.id,
        customer_name: t.customer_name,
        customer_id: t.customer_id,
        amount: t.amount,
        transaction_type: t.transaction_type
      })));
      
      const customerTransactions = allTransactions.filter(transaction => 
        transaction.customer_name.toLowerCase() === customerName.toLowerCase()
      );
      
      console.log('Customer transactions filtered successfully:', customerTransactions.length, 'entries');
      console.log('Filtered transactions:', customerTransactions.map(t => ({
        id: t.id,
        customer_name: t.customer_name,
        customer_id: t.customer_id,
        amount: t.amount,
        transaction_type: t.transaction_type
      })));
      
      return customerTransactions;
    });
  };

  // Get customer balance
  const getCustomerBalance = async (customerName: string): Promise<number> => {
    if (!firebaseUser) {
      return 0;
    }

    try {
      await ensureValidSession();

      // Get the active user (Firebase Auth or context user)
      const currentUser = auth.currentUser;
      const contextUser = firebaseUser;
      const activeUser = currentUser || contextUser;

      // Get the user ID - handle both real Firebase Auth (uid) and mock auth (id)
      const userId = activeUser.uid || activeUser.id;
      
      if (!userId) {
        console.error('Active user has no UID or ID in getCustomerBalance');
        return 0;
      }
      
      // For now, we'll calculate balance from transactions
      // In a real implementation, you might want to add a helper function for this
      const allTransactions = await firestoreHelpers.getTransactionEntries(userId);
      
      const customerTransactions = allTransactions.filter(transaction => 
        transaction.customer_name.toLowerCase() === customerName.toLowerCase()
      );
      
      let balance = 0;
      for (const transaction of customerTransactions) {
        if (transaction.transaction_type === 'given') {
          balance += transaction.amount;
        } else {
          balance -= transaction.amount;
        }
      }
      
      return balance;
    } catch (error) {
      console.error('Error in getCustomerBalance:', error);
      return 0;
    }
  };

  // Get all transaction entries for the current user
  const getAllTransactionEntries = async (forceRefresh: boolean = false): Promise<TransactionEntry[]> => {
    console.log('getAllTransactionEntries called, forceRefresh:', forceRefresh);
    console.log('firebaseUser in context:', firebaseUser?.uid);
    console.log('auth.currentUser:', auth.currentUser?.uid);
    
    return retryWithUser(async () => {
      // Try to get user from multiple sources
      const currentUser = auth.currentUser;
      const contextUser = firebaseUser;
      const activeUser = currentUser || contextUser;
      
      if (!activeUser) {
        console.error('No active user found in getAllTransactionEntries');
        console.log('currentUser:', currentUser);
        console.log('contextUser:', contextUser);
        console.log('firebaseUser:', firebaseUser);
        throw new Error('No active user available');
      }
      
      // Get the user ID - handle both real Firebase Auth (uid) and mock auth (id)
      const userId = activeUser.uid || activeUser.id;
      
      if (!userId) {
        console.error('Active user has no UID or ID');
        console.log('activeUser object:', activeUser);
        console.log('activeUser.uid:', activeUser.uid);
        console.log('activeUser.id:', activeUser.id);
        throw new Error('Active user has no UID or ID');
      }

      // 🚀 CHECK FOR PRELOADED DATA FIRST (from OTP verification)
      if (!forceRefresh && (globalThis as any).__preloadedData) {
        const preloadedData = (globalThis as any).__preloadedData;
        if (preloadedData.userId === userId && preloadedData.transactions) {
          console.log('✅ Using preloaded transactions data for instant display');
          const transactions = preloadedData.transactions;
          
          // Clear preloaded data after use
          delete (globalThis as any).__preloadedData.transactions;
          
          console.log('Preloaded transactions:', transactions.length, 'entries');
          return transactions;
        }
      }

      console.log('Getting all transaction entries from Firebase');
      console.log('Using active user ID:', userId);
      
      const allTransactions = await firestoreHelpers.getTransactionEntries(userId);
      
      console.log('All transactions fetched:', allTransactions.length, 'entries');
      console.log('Sample transactions:', allTransactions.slice(0, 3).map(t => ({
        id: t.id,
        customer_name: t.customer_name,
        customer_id: t.customer_id,
        amount: t.amount,
        transaction_type: t.transaction_type
      })));
      
      return allTransactions;
    });
  };

  // Get all customers with their balances
  const getCustomersWithBalances = async (): Promise<CustomerBalance[]> => {
    if (!firebaseUser) {
      return [];
    }

    try {
      await ensureValidSession();

      // For now, we'll return an empty array
      // In a real implementation, you might want to add a helper function for this
      return [];
    } catch (error) {
      console.error('Error in getCustomersWithBalances:', error);
      return [];
    }
  };

  // Get dashboard totals
  const getDashboardTotals = async (): Promise<DashboardTotals> => {
    if (!firebaseUser) {
      return { to_receive: 0, to_give: 0, total_customers: 0 };
    }

    try {
      await ensureValidSession();

      // For now, we'll return default values
      // In a real implementation, you might want to add a helper function for this
      return { to_receive: 0, to_give: 0, total_customers: 0 };
    } catch (error) {
      console.error('Error in getDashboardTotals:', error);
      return { to_receive: 0, to_give: 0, total_customers: 0 };
    }
  };

  // Get a single transaction entry
  const getTransactionEntry = async (transactionId: string): Promise<TransactionEntry | null> => {
    if (!firebaseUser) {
      return null;
    }

    try {
      await ensureValidSession();

      // For now, we'll return null
      // In a real implementation, you might want to add a helper function for this
      return null;
    } catch (error) {
      console.error('Error in getTransactionEntry:', error);
      return null;
    }
  };

  // Update a transaction entry
  const updateTransactionEntry = async (
    transactionId: string,
    amount: number,
    transactionType: 'given' | 'received',
    description?: string,
    transactionDate?: string
  ): Promise<TransactionEntry> => {
    if (!firebaseUser) {
      throw new Error('Your account session has expired. Please sign out and sign in again.');
    }

    setLoading(true);
    setError(null);

    try {
      await ensureValidSession();

      // Call the Firebase helper function to update the transaction
      const updateData = {
        amount: amount,
        transaction_type: transactionType,
        description: description?.trim() || null,
        ...(transactionDate && { transaction_date: transactionDate }),
      };

      const result = await firestoreHelpers.updateTransactionEntry(transactionId, updateData);
      
      if (!result.success) {
        throw new Error('Failed to update transaction entry');
      }

      console.log('Transaction entry updated successfully:', result.data);
      
      // Return the updated transaction entry
      return {
        id: transactionId,
        user_id: firebaseUser?.uid || firebaseUser?.id || '',
        customer_id: '',
        customer_name: '',
        amount: amount,
        transaction_type: transactionType,
        description: description?.trim() || null,
        transaction_date: transactionDate || new Date().toISOString(),
        balance_after: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
    } catch (error) {
      console.error('Error in updateTransactionEntry:', error);
      
      if (error instanceof Error && error.message.includes('session has expired')) {
        setError(error.message);
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Delete a transaction entry
  const deleteTransactionEntry = async (transactionId: string): Promise<void> => {
    if (!firebaseUser) {
      throw new Error('Your account session has expired. Please sign out and sign in again.');
    }

    setLoading(true);
    setError(null);

    try {
      await ensureValidSession();

      // Call the Firebase helper function to delete the transaction
      const result = await firestoreHelpers.deleteTransactionEntry(transactionId);
      
      if (!result.success) {
        throw new Error('Failed to delete transaction entry');
      }

      console.log('Transaction entry deleted successfully');
      
    } catch (error) {
      console.error('Error in deleteTransactionEntry:', error);
      
      if (error instanceof Error && error.message.includes('session has expired')) {
        setError(error.message);
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Set firebase user function
  const updateFirebaseUser = useCallback((user: any) => {
    console.log('TransactionEntriesContext: updateFirebaseUser called with user:', user);
    console.log('TransactionEntriesContext: user.uid:', user?.uid);
    console.log('TransactionEntriesContext: user object keys:', user ? Object.keys(user) : 'null');
    setFirebaseUser(user);
  }, []);

  // Retry mechanism for when user is not available
  const retryWithUser = useCallback(async (
    operation: () => Promise<any>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!firebaseUser && !auth.currentUser) {
          console.log(`Attempt ${attempt}: No user available, waiting ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Operation failed after all retries');
  }, [firebaseUser]);

  return {
    loading,
    error,
    addTransactionEntry,
    getCustomerTransactions,
    getCustomerBalance,
    getAllTransactionEntries,
    getCustomersWithBalances,
    getDashboardTotals,
    getTransactionEntry,
    updateTransactionEntry,
    deleteTransactionEntry,
    refreshTransactionEntries: getAllTransactionEntries,
    setFirebaseUser: updateFirebaseUser,
  };
});


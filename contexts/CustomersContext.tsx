import React, { useState, useEffect, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Platform } from 'react-native';
import { auth, firestoreHelpers, handleFirebaseError } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { offlineStorage } from '@/utils/offline-storage';
import { useNetwork } from './NetworkContext';

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  customer_type: 'customer' | 'supplier';
  created_at: string;
  updated_at: string;
}

export const [CustomersProvider, useCustomers] = createContextHook(() => {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  // 🚀 Initialize with preloaded data if available for instant UI display
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const preloadedData = (globalThis as any).__preloadedData;
    if (preloadedData?.uiReady && preloadedData?.customers) {
      console.log('🚀 CustomersContext: Initializing with preloaded data for instant display');
      return preloadedData.customers;
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isOnline, addPendingOperation } = useNetwork();

  // Test if customers collection exists and check its structure
  const testCollectionAccess = async () => {
    try {
      console.log('Testing customers collection access...');
      
      // Test basic collection access with simple query
      const customers = await firestoreHelpers.getCustomers('test');
      
      console.log('Collection access test successful');
      return true;
    } catch (error) {
      console.error('Collection access test error:', JSON.stringify(error, null, 2));
      return false;
    }
  };

  const fetchCustomers = async (forceRefresh: boolean = false) => {
    if (!firebaseUser) {
      setCustomers([]);
      return;
    }

    const userId = firebaseUser?.uid || firebaseUser?.id;

    // 🚀 CHECK FOR PRELOADED DATA FIRST (from OTP verification)
    if (!forceRefresh && (globalThis as any).__preloadedData) {
      const preloadedData = (globalThis as any).__preloadedData;
      if (preloadedData.userId === userId && preloadedData.customers) {
        console.log('✅ Using preloaded customers data for instant display');
        setCustomers(preloadedData.customers);
        setLoading(false);
        
        // Save to offline storage for future use
        try {
          await offlineStorage.saveCustomers(userId, preloadedData.customers);
        } catch (e) {
          console.warn('Failed to save preloaded customers to offline storage:', e);
        }
        
        // Clear preloaded data after use
        delete (globalThis as any).__preloadedData.customers;
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      console.log('CustomersContext: fetchCustomers called, forceRefresh:', forceRefresh);
      
      // If offline, try to load from local storage first
      if (!isOnline) {
        console.log('📱 Offline mode: Loading customers from local storage');
        const offlineCustomers = await offlineStorage.loadCustomers(userId);
        if (offlineCustomers) {
          setCustomers(offlineCustomers);
          setLoading(false);
          return;
        } else {
          console.log('📱 No offline data available');
          setCustomers([]);
          setLoading(false);
          return;
        }
      }

      // Ensure we have a valid session
      await ensureValidSession();
      
      // Test collection access
      const collectionAccessible = await testCollectionAccess();
      if (!collectionAccessible) {
        throw new Error('Customers collection is not accessible. Please ensure the collection exists and you have proper permissions.');
      }

      // Force cache invalidation by adding a timestamp parameter
      const cacheKey = forceRefresh ? `?t=${Date.now()}` : '';
      console.log('CustomersContext: Cache key:', cacheKey);
      
      // Get the active user (Firebase Auth or context user)
      const currentUser = auth.currentUser;
      const contextUser = firebaseUser;
      const activeUser = currentUser || contextUser;
      
      // userId is already declared at the top of the function
      
      if (!userId) {
        console.error('Active user has no UID or ID in fetchCustomers');
        throw new Error('Active user has no UID or ID');
      }
      
      // Get customers from Firestore
      const data = await firestoreHelpers.getCustomers(userId);

      console.log('CustomersContext: Raw data from Firestore:', data?.length || 0, 'customers');
      console.log('CustomersContext: Sample customer data:', data?.slice(0, 2));
      
      // Ensure phone numbers are properly formatted with +977 prefix
      const formattedCustomers = (data || []).map((customer: any) => ({
        ...customer,
        phone: customer.phone && !customer.phone.startsWith('+') 
          ? '+977' + customer.phone 
          : customer.phone
      }));
      
      console.log('CustomersContext: Setting customers:', formattedCustomers.length);
      console.log('CustomersContext: Formatted customers:', formattedCustomers.map((c: any) => ({ id: c.id, name: c.name })));
      
      // Force state update by creating a new array reference
      setCustomers([...formattedCustomers]);
      
      // Save to offline storage for offline access
      if (isOnline) {
        try {
          const userId = firebaseUser?.uid || firebaseUser?.id;
          await offlineStorage.saveCustomers(formattedCustomers, userId);
          console.log('💾 Saved customers to offline storage');
        } catch (error) {
          console.error('Error saving customers to offline storage:', error);
        }
      }
      
      // Clear any previous errors on successful fetch
      setError(null);
    } catch (error) {
      console.error('Firebase fetching customers error:', JSON.stringify(error, null, 2));
      
      // Use the enhanced error handler
      const errorInfo = handleFirebaseError(error, 'fetching customers');
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to ensure valid session with better error handling
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

  const addCustomer = async (customerData: any) => {
    try {
      console.log('=== ADD CUSTOMER START ===');
      console.log('Firebase user ID:', firebaseUser?.uid);
      console.log('Network status:', isOnline ? 'Online' : 'Offline');
      
      // Get the user ID - handle both real Firebase Auth (uid) and mock auth (id)
      const userId = firebaseUser?.uid || firebaseUser?.id;
      
      if (!userId) {
        console.error('Firebase user has no UID or ID in addCustomer');
        throw new Error('Firebase user has no UID or ID');
      }
      
      // Ensure user_id is included in the customer data
      const customerDataWithUserId = {
        ...customerData,
        user_id: userId
      };
      
      console.log('Customer data with user_id prepared');
      
      // If offline, add to pending operations and local state
      if (!isOnline) {
        console.log('📱 Offline mode: Adding customer to pending operations');
        
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempCustomer = {
          ...customerDataWithUserId,
          id: tempId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // Add to pending operations
        addPendingOperation({
          id: tempId,
          type: 'CREATE',
          entity: 'customer',
          data: customerDataWithUserId,
          timestamp: Date.now(),
        });
        
        // Update local state immediately
        setCustomers(prev => [tempCustomer, ...prev]);
        
        console.log('=== ADD CUSTOMER OFFLINE SUCCESS ===');
        return { success: true, data: tempCustomer, offline: true };
      }
      
      await ensureValidSession();
      console.log('Session validation passed');
      
      const result = await firestoreHelpers.addCustomer(customerDataWithUserId);

      console.log('Customer added successfully');
      
      // Update local state
      setCustomers(prev => [result.data, ...prev]);
      
      console.log('=== ADD CUSTOMER SUCCESS ===');
      return { success: true, data: result.data };
    } catch (error) {
      console.error('=== ADD CUSTOMER ERROR ===');
      console.error('Error in addCustomer:', error);
      throw error;
    }
  };

  const updateCustomer = async (id: string, updates: any) => {
    try {
      console.log('=== UPDATE CUSTOMER START ===');
      console.log('Customer ID:', id);
      console.log('Network status:', isOnline ? 'Online' : 'Offline');
      
      // Find the customer to get the old name
      const customerToUpdate = customers.find(c => c.id === id);
      const oldName = customerToUpdate?.name;
      const newName = updates.name;
      
      console.log('Old customer name:', oldName);
      console.log('New customer name:', newName);
      
      // If offline, add to pending operations and update local state
      if (!isOnline) {
        console.log('📱 Offline mode: Adding customer update to pending operations');
        
        // Add to pending operations
        addPendingOperation({
          id: id,
          type: 'UPDATE',
          entity: 'customer',
          data: { id, ...updates },
          timestamp: Date.now(),
        });
        
        // Update local state immediately
        setCustomers(prev => 
          prev.map(customer => customer.id === id ? { ...customer, ...updates, updated_at: new Date().toISOString() } : customer)
        );
        
        console.log('=== UPDATE CUSTOMER OFFLINE SUCCESS ===');
        return { success: true, data: { id, ...updates }, offline: true };
      }
      
      await ensureValidSession();
      
      const result = await firestoreHelpers.updateCustomer(id, updates);

      // Update local state
      setCustomers(prev => 
        prev.map(customer => customer.id === id ? { ...customer, ...updates, updated_at: new Date().toISOString() } : customer)
      );
      
      // If the customer name changed, update all related transaction entries
      if (oldName && newName && oldName !== newName) {
        console.log('=== UPDATING TRANSACTION ENTRIES FOR NAME CHANGE ===');
        console.log('Updating transactions from:', oldName, 'to:', newName);
        
        try {
          // Get the user ID for the query
          const userId = firebaseUser?.uid || firebaseUser?.id;
          if (!userId) {
            console.error('No user ID available for transaction update');
            return;
          }
          
          // Get all transaction entries for the old customer name
          const transactionEntries = await firestoreHelpers.getTransactionEntriesByCustomerName(userId, oldName);
          console.log('Found transaction entries to update:', transactionEntries.length);
          
          // Update each transaction entry with the new customer name
          const updatePromises = transactionEntries.map(async (transaction) => {
            const updateData = {
              customer_name: newName,
              updated_at: new Date().toISOString()
            };
            
            console.log('Updating transaction:', transaction.id, 'with new name:', newName);
            return await firestoreHelpers.updateTransactionEntry(transaction.id, updateData);
          });
          
          await Promise.all(updatePromises);
          console.log('=== TRANSACTION ENTRIES UPDATED SUCCESSFULLY ===');
        } catch (transactionError) {
          console.error('Error updating transaction entries:', transactionError);
          // Don't throw error here as customer update was successful
          // Just log the error for debugging
        }
      }
      
      console.log('=== UPDATE CUSTOMER SUCCESS ===');
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error in updateCustomer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      console.log('=== DELETE CUSTOMER START ===');
      console.log('Customer ID:', id);
      console.log('Network status:', isOnline ? 'Online' : 'Offline');
      
      // If offline, add to pending operations and update local state
      if (!isOnline) {
        console.log('📱 Offline mode: Adding customer deletion to pending operations');
        
        // Add to pending operations
        addPendingOperation({
          id: id,
          type: 'DELETE',
          entity: 'customer',
          data: { id },
          timestamp: Date.now(),
        });
        
        // Update local state immediately
        setCustomers(prev => prev.filter(customer => customer.id !== id));
        
        console.log('=== DELETE CUSTOMER OFFLINE SUCCESS ===');
        return { success: true, offline: true };
      }
      
      await ensureValidSession();
      
      await firestoreHelpers.deleteCustomer(id);

      // Update local state
      setCustomers(prev => prev.filter(customer => customer.id !== id));
      
      console.log('=== DELETE CUSTOMER SUCCESS ===');
      return { success: true };
    } catch (error) {
      console.error('Error in deleteCustomer:', error);
      throw error;
    }
  };

  const getCustomerByPhone = (phone: string): Customer | undefined => {
    return customers.find(customer => customer.phone === phone);
  };

  const getCustomersByType = (type: 'customer' | 'supplier'): Customer[] => {
    return customers.filter(customer => customer.customer_type === type);
  };

  const searchCustomers = async (searchTerm: string): Promise<Customer[]> => {
    if (!firebaseUser || !searchTerm.trim()) {
      return [];
    }

    try {
      // Get the user ID - handle both real Firebase Auth (uid) and mock auth (id)
      const userId = firebaseUser?.uid || firebaseUser?.id;
      
      if (!userId) {
        console.error('Firebase user has no UID or ID in searchCustomers');
        return [];
      }
      
      // For now, we'll do client-side search
      // In a real implementation, you might want to use Firestore's full-text search
      const allCustomers = await firestoreHelpers.getCustomers(userId);
      const searchLower = searchTerm.toLowerCase();
      
      return allCustomers.filter((customer: any) =>
        customer.name.toLowerCase().includes(searchLower) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchLower))
      ) as Customer[];
    } catch (error) {
      console.error('Error in searchCustomers:', error);
      return [];
    }
  };

  // Fetch customers when user changes
  useEffect(() => {
    console.log('CustomersContext: useEffect triggered, firebaseUser:', firebaseUser ? 'exists' : 'null');
    
    // Add a small delay to avoid race conditions
    const timeoutId = setTimeout(() => {
      if (firebaseUser) {
        console.log('CustomersContext: Calling fetchCustomers...');
        fetchCustomers().catch((error) => {
          console.error('Failed to fetch customers on initialization:', error);
          // Set loading to false even on error
          setLoading(false);
        });
      } else {
        console.log('CustomersContext: No firebaseUser, skipping fetch');
        setCustomers([]);
        setLoading(false);
      }
    }, 150); // Slightly increased delay to avoid race conditions
    
    return () => clearTimeout(timeoutId);
  }, [firebaseUser]);

  return {
    customers,
    loading,
    error,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerByPhone,
    getCustomersByType,
    searchCustomers,
    testCollectionAccess,
    setFirebaseUser,
  };
});
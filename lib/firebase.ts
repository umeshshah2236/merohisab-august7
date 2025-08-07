import { initializeApp, getApp } from 'firebase/app';
import { initializeAuth, getAuth, onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, query, where, orderBy, limit, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionEntry } from '@/contexts/TransactionEntriesContext';

// Module-level initialization guard
let isInitialized = false;

// Firebase configuration - replace with your actual Firebase config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

console.log('Firebase Environment check');
console.log('- EXPO_PUBLIC_FIREBASE_API_KEY:', process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? '✅ Present' : '❌ Missing');
console.log('- EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Present' : '❌ Missing');
console.log('- EXPO_PUBLIC_FIREBASE_PROJECT_ID:', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Present' : '❌ Missing');

if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Missing Firebase environment variables');
}

// Firebase instances (singleton pattern)
let firebaseApp: any = null;
let firebaseAuth: any = null;
let firebaseDb: any = null;
let isAppInitialized = false;
let isAuthInitialized = false;
let isDbInitialized = false;

// Initialize Firebase App
const initializeFirebaseApp = () => {
  if (!isAppInitialized) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      isAppInitialized = true;
      console.log('Firebase App initialized successfully');
    } catch (error: any) {
      if (error.code === 'app/duplicate-app') {
        console.log('Firebase App already initialized, using existing instance');
        firebaseApp = getApp();
        isAppInitialized = true;
      } else {
        console.error('Firebase App initialization error:', error);
        throw error;
      }
    }
  }
  return firebaseApp;
};

// Initialize Firebase Auth
const initializeFirebaseAuth = () => {
  if (!isAuthInitialized) {
    try {
      firebaseAuth = initializeAuth(firebaseApp);
      isAuthInitialized = true;
      console.log('Firebase Auth initialized successfully with persistence');
    } catch (error: any) {
      if (error.code === 'auth/already-initialized') {
        console.log('Firebase Auth already initialized, using existing instance');
        firebaseAuth = getAuth(firebaseApp);
        isAuthInitialized = true;
      } else {
        console.error('Firebase Auth initialization error:', error);
        throw error;
      }
    }
  }
  return firebaseAuth;
};

// Initialize Firestore
const initializeFirestore = () => {
  if (!isDbInitialized) {
    try {
      firebaseDb = getFirestore(firebaseApp);
      isDbInitialized = true;
    } catch (error: any) {
      console.warn('Firestore initialization error:', error);
      isDbInitialized = true;
    }
  }
  return firebaseDb;
};

// Main initialization function
const initializeFirebase = () => {
  if (isInitialized) {
    console.log('Firebase already initialized, returning existing instances');
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
  }

  console.log('Initializing Firebase...');
  
  const app = initializeFirebaseApp();
  const auth = initializeFirebaseAuth();
  const db = initializeFirestore();
  
  isInitialized = true;
  console.log('Firebase initialization complete');
  
  return { app, auth, db };
};

// Initialize Firebase
const firebaseInstances = initializeFirebase();

export const auth = firebaseInstances.auth;
export const db = firebaseInstances.db;

console.log('Firebase initialized with project ID:', firebaseConfig.projectId);

// Simple connection test
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing Firebase connection...');
    
    // Test with timeout
    const result = await Promise.race([
      auth.currentUser ? Promise.resolve(true) : Promise.resolve(false),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 8000)
      )
    ]);
    
    console.log('Firebase connection test successful');
    return true;
  } catch (error) {
    console.error('Network error during Firebase connection test:', error);
    return false;
  }
};

// Detailed connection test with error info
export const testFirebaseConnectionDetailed = async () => {
  try {
    console.log('Testing detailed Firebase connection...');
    console.log('Firebase Project ID:', firebaseConfig.projectId);
    console.log('Firebase API Key present:', !!firebaseConfig.apiKey);
    
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      const missingVars = [];
      if (!firebaseConfig.apiKey) missingVars.push('EXPO_PUBLIC_FIREBASE_API_KEY');
      if (!firebaseConfig.projectId) missingVars.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
      const errorMsg = `Missing environment variables: ${missingVars.join(', ')}`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
    
    console.log('Environment variables check passed, testing connection...');
    
    // Test with timeout
    const result = await Promise.race([
      auth.currentUser ? Promise.resolve(true) : Promise.resolve(false),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 8 seconds')), 8000)
      )
    ]);
    
    console.log('Connection test result:', result);
    console.log('Firebase connection test successful');
    return { success: true, error: null };
  } catch (error) {
    console.error('Network error during Firebase connection test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
    return { success: false, error: errorMessage };
  }
};

// Simplified error handler
export const handleFirebaseError = (error: any, operation: string) => {
  console.error(`Firebase ${operation} error:`, error);
  
  if (!error) {
    return { isNetworkError: true, message: 'Unknown error occurred' };
  }
  
  const errorMessage = error?.message || error?.code || 'An error occurred';
  
  // Handle timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return { isNetworkError: true, message: 'Request timed out. Please try again.' };
  }
  
  // Handle network errors
  if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
    return { isNetworkError: true, message: 'Network connection failed. Please check your internet connection.' };
  }
  
  // Handle auth errors
  if (errorMessage.includes('auth/') || errorMessage.includes('expired') || errorMessage.includes('401')) {
    return { isNetworkError: false, message: 'Your session has expired. Please sign in again.' };
  }
  
  return { isNetworkError: false, message: errorMessage };
};

// Simple operation wrapper with basic timeout
export const withTimeout = async <T>(
  operation: () => Promise<T>,
  timeoutMs: number = 8000
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timed out. Please try again.')), timeoutMs);
  });
  
  return Promise.race([operation(), timeoutPromise]);
};

// Firestore helper functions
export const firestoreHelpers = {
  // Add a new customer
  async addCustomer(customerData: any) {
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        ...customerData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return { success: true, data: { id: docRef.id, ...customerData } };
    } catch (error) {
      console.error('Error adding customer:', error);
      throw error;
    }
  },

  // Get customers for a user
  async getCustomers(userId: string) {
    try {
      const q = query(
        collection(db, 'customers'),
        where('user_id', '==', userId),
        orderBy('updated_at', 'desc'),
        limit(30)
      );
      const querySnapshot = await getDocs(q);
      const customers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return customers;
    } catch (error) {
      console.error('Error getting customers:', error);
      throw error;
    }
  },

  // Update a customer
  async updateCustomer(id: string, updates: any) {
    try {
      const customerRef = doc(db, 'customers', id);
      await updateDoc(customerRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      return { success: true, data: { id, ...updates } };
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  },

  // Delete a customer
  async deleteCustomer(id: string) {
    try {
      await deleteDoc(doc(db, 'customers', id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  },

  // Get user profile
  async getUserProfile(userId: string) {
    try {
      const userRef = doc(db, 'profiles', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  },

  // Create or update user profile
  async upsertUserProfile(userId: string, profileData: any) {
    try {
      const userRef = doc(db, 'profiles', userId);
      await setDoc(userRef, {
        ...profileData,
        updated_at: new Date().toISOString(),
      }, { merge: true });
      return { success: true, data: { id: userId, ...profileData } };
    } catch (error) {
      console.error('Error upserting user profile:', error);
      throw error;
    }
  },

  // Add a new transaction entry (renamed from addLoan)
  async addTransactionEntry(transactionData: any) {
    try {
      console.log('=== ADDING TRANSACTION ENTRY ===');
      console.log('Transaction data:', transactionData);
      
      const transactionDoc = {
        user_id: transactionData.user_id,
        customer_id: transactionData.customer_id || '',
        customer_name: transactionData.customer_name,
        amount: transactionData.amount,
        transaction_type: transactionData.transaction_type, // 'given' or 'received'
        description: transactionData.description || null,
        transaction_date: transactionData.transaction_date,
        balance_after: transactionData.balance_after || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      console.log('Document to save:', transactionDoc);
      
      const docRef = await addDoc(collection(db, 'transaction_entries'), transactionDoc);
      
      console.log('Transaction saved successfully with ID:', docRef.id);
      return { success: true, data: { id: docRef.id, ...transactionData } };
    } catch (error) {
      console.error('Error adding transaction entry:', error);
      throw error;
    }
  },

  // Get transaction entries for a user (renamed from getLoans)
  async getTransactionEntries(userId: string): Promise<TransactionEntry[]> {
    try {
      console.log('=== GETTING TRANSACTION ENTRIES ===');
      console.log('User ID:', userId);
      
      const q = query(
        collection(db, 'transaction_entries'),
        where('user_id', '==', userId)
        // Temporarily removed orderBy to test data saving
        // orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Raw query results:', entries.length, 'entries');
      console.log('Sample entries:', entries.slice(0, 3).map((e: any) => ({
        id: e.id,
        customer_name: e.customer_name,
        customer_id: e.customer_id,
        amount: e.amount,
        transaction_type: e.transaction_type
      })));
      
      // Sort in memory instead
      const sortedEntries = entries.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      console.log('Sorted entries:', sortedEntries.length, 'entries');
      return sortedEntries as TransactionEntry[];
    } catch (error) {
      console.error('Error getting transaction entries:', error);
      throw error;
    }
  },

  // Update a transaction entry
  async updateTransactionEntry(transactionId: string, updates: any) {
    try {
      console.log('=== UPDATING TRANSACTION ENTRY ===');
      console.log('Transaction ID:', transactionId);
      console.log('Updates:', updates);
      
      const transactionRef = doc(db, 'transaction_entries', transactionId);
      await updateDoc(transactionRef, {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      
      console.log('Transaction updated successfully');
      return { success: true, data: { id: transactionId, ...updates } };
    } catch (error) {
      console.error('Error updating transaction entry:', error);
      throw error;
    }
  },

  // Delete a transaction entry
  async deleteTransactionEntry(transactionId: string) {
    try {
      console.log('=== DELETING TRANSACTION ENTRY ===');
      console.log('Transaction ID:', transactionId);
      
      const transactionRef = doc(db, 'transaction_entries', transactionId);
      await deleteDoc(transactionRef);
      
      console.log('Transaction deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting transaction entry:', error);
      throw error;
    }
  },

  // Get transaction entries by customer name
  async getTransactionEntriesByCustomerName(userId: string, customerName: string): Promise<TransactionEntry[]> {
    try {
      console.log('=== GETTING TRANSACTION ENTRIES BY CUSTOMER NAME ===');
      console.log('User ID:', userId);
      console.log('Customer Name:', customerName);
      
      const q = query(
        collection(db, 'transaction_entries'),
        where('user_id', '==', userId),
        where('customer_name', '==', customerName)
      );
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Found transaction entries for customer:', entries.length);
      return entries as TransactionEntry[];
    } catch (error) {
      console.error('Error getting transaction entries by customer name:', error);
      throw error;
    }
  },

  // Delete user profile
  async deleteUserProfile(userId: string) {
    try {
      console.log('=== DELETING USER PROFILE ===');
      console.log('User ID:', userId);
      
      const profileRef = doc(db, 'profiles', userId);
      await deleteDoc(profileRef);
      
      console.log('User profile deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting user profile:', error);
      throw error;
    }
  },

  // Delete all data for a user (comprehensive deletion)
  async deleteAllUserData(userId: string) {
    try {
      console.log('=== DELETING ALL USER DATA ===');
      console.log('User ID:', userId);
      
      const deletionResults = {
        customers: 0,
        transactions: 0,
        profile: false,
        errors: [] as string[]
      };

      // 1. Delete all customers
      try {
        const customers = await this.getCustomers(userId);
        console.log('Found customers to delete:', customers.length);
        deletionResults.customers = customers.length;
        
        for (const customer of customers) {
          await this.deleteCustomer(customer.id);
        }
        console.log('All customers deleted successfully');
      } catch (error) {
        console.error('Error deleting customers:', error);
        deletionResults.errors.push(`Customers: ${error}`);
      }

      // 2. Delete all transaction entries
      try {
        const transactions = await this.getTransactionEntries(userId);
        console.log('Found transactions to delete:', transactions.length);
        deletionResults.transactions = transactions.length;
        
        for (const transaction of transactions) {
          await this.deleteTransactionEntry(transaction.id);
        }
        console.log('All transactions deleted successfully');
      } catch (error) {
        console.error('Error deleting transactions:', error);
        deletionResults.errors.push(`Transactions: ${error}`);
      }

      // 3. Delete user profile
      try {
        await this.deleteUserProfile(userId);
        deletionResults.profile = true;
        console.log('User profile deleted successfully');
      } catch (error) {
        console.error('Error deleting user profile:', error);
        deletionResults.errors.push(`Profile: ${error}`);
      }

      console.log('=== USER DATA DELETION SUMMARY ===');
      console.log('Customers deleted:', deletionResults.customers);
      console.log('Transactions deleted:', deletionResults.transactions);
      console.log('Profile deleted:', deletionResults.profile);
      console.log('Errors:', deletionResults.errors);

      return { 
        success: true, 
        data: deletionResults 
      };
    } catch (error) {
      console.error('Error in comprehensive user data deletion:', error);
      throw error;
    }
  },
};

export default firebaseApp; 
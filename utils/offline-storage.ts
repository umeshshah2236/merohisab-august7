import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  CUSTOMERS: 'offline_customers',
  LOANS: 'offline_loans',
  TRANSACTIONS: 'offline_transactions',
  LAST_SYNC: 'last_sync_timestamp',
  USER_DATA: 'offline_user_data',
} as const;

// Cache expiration time (24 hours)
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

export interface OfflineData<T> {
  data: T[];
  timestamp: number;
  userId: string;
}

export interface SyncStatus {
  lastSync: number | null;
  pendingCount: number;
  isOnline: boolean;
}

class OfflineStorage {
  // Save data to offline storage
  async saveData<T>(key: string, data: T[], userId: string): Promise<void> {
    try {
      const offlineData: OfflineData<T> = {
        data,
        timestamp: Date.now(),
        userId,
      };
      await AsyncStorage.setItem(key, JSON.stringify(offlineData));
      console.log(`💾 Saved ${data.length} items to offline storage: ${key}`);
    } catch (error) {
      console.error(`Error saving data to offline storage (${key}):`, error);
    }
  }

  // Load data from offline storage
  async loadData<T>(key: string, userId: string): Promise<T[] | null> {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;

      const offlineData: OfflineData<T> = JSON.parse(stored);
      
      // Check if data belongs to current user
      if (offlineData.userId !== userId) {
        console.log(`User mismatch for ${key}, clearing old data`);
        await this.clearData(key);
        return null;
      }

      // Check if data is expired
      const isExpired = Date.now() - offlineData.timestamp > CACHE_EXPIRY;
      if (isExpired) {
        console.log(`Offline data expired for ${key}, clearing`);
        await this.clearData(key);
        return null;
      }

      console.log(`📦 Loaded ${offlineData.data.length} items from offline storage: ${key}`);
      return offlineData.data;
    } catch (error) {
      console.error(`Error loading data from offline storage (${key}):`, error);
      return null;
    }
  }

  // Clear specific data
  async clearData(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Cleared offline data: ${key}`);
    } catch (error) {
      console.error(`Error clearing offline data (${key}):`, error);
    }
  }

  // Clear all offline data
  async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
      console.log('🗑️ Cleared all offline data');
    } catch (error) {
      console.error('Error clearing all offline data:', error);
    }
  }

  // Update last sync timestamp
  async updateLastSync(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
    } catch (error) {
      console.error('Error updating last sync timestamp:', error);
    }
  }

  // Get last sync timestamp
  async getLastSync(): Promise<number | null> {
    try {
      const timestamp = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }

  // Check if data needs sync
  async needsSync(key: string): Promise<boolean> {
    try {
      const lastSync = await this.getLastSync();
      if (!lastSync) return true;

      const stored = await AsyncStorage.getItem(key);
      if (!stored) return true;

      const offlineData: OfflineData<any> = JSON.parse(stored);
      return Date.now() - offlineData.timestamp > CACHE_EXPIRY;
    } catch (error) {
      console.error('Error checking sync status:', error);
      return true;
    }
  }

  // Customer-specific methods
  async saveCustomers(customers: any[], userId: string): Promise<void> {
    return this.saveData(STORAGE_KEYS.CUSTOMERS, customers, userId);
  }

  async loadCustomers(userId: string): Promise<any[] | null> {
    return this.loadData(STORAGE_KEYS.CUSTOMERS, userId);
  }

  // Loan-specific methods
  async saveLoans(loans: any[], userId: string): Promise<void> {
    return this.saveData(STORAGE_KEYS.LOANS, loans, userId);
  }

  async loadLoans(userId: string): Promise<any[] | null> {
    return this.loadData(STORAGE_KEYS.LOANS, userId);
  }

  // Transaction-specific methods
  async saveTransactions(transactions: any[], userId: string): Promise<void> {
    return this.saveData(STORAGE_KEYS.TRANSACTIONS, transactions, userId);
  }

  async loadTransactions(userId: string): Promise<any[] | null> {
    return this.loadData(STORAGE_KEYS.TRANSACTIONS, userId);
  }

  // User data methods
  async saveUserData(userData: any, userId: string): Promise<void> {
    return this.saveData(STORAGE_KEYS.USER_DATA, [userData], userId);
  }

  async loadUserData(userId: string): Promise<any | null> {
    const data = await this.loadData(STORAGE_KEYS.USER_DATA, userId);
    return data ? data[0] : null;
  }

  // Get storage info for debugging
  async getStorageInfo(): Promise<{
    customers: number;
    loans: number;
    transactions: number;
    lastSync: number | null;
  }> {
    try {
      const [customersData, loansData, transactionsData, lastSync] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS),
        AsyncStorage.getItem(STORAGE_KEYS.LOANS),
        AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
        this.getLastSync(),
      ]);

      return {
        customers: customersData ? JSON.parse(customersData).data.length : 0,
        loans: loansData ? JSON.parse(loansData).data.length : 0,
        transactions: transactionsData ? JSON.parse(transactionsData).data.length : 0,
        lastSync,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        customers: 0,
        loans: 0,
        transactions: 0,
        lastSync: null,
      };
    }
  }
}

export const offlineStorage = new OfflineStorage();
export { STORAGE_KEYS }; 
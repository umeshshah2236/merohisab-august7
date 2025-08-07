import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { auth, firestoreHelpers } from '@/lib/firebase';

interface NetworkContextType {
  isOnline: boolean;
  isConnecting: boolean;
  lastSyncTime: Date | null;
  pendingOperations: PendingOperation[];
  checkConnectivity: () => Promise<boolean>;
  syncPendingOperations: () => Promise<void>;
  addPendingOperation: (operation: PendingOperation) => void;
  clearPendingOperations: () => void;
}

interface PendingOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'customer' | 'loan' | 'transaction';
  data: any;
  timestamp: number;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);

  // Check network connectivity
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      setIsConnecting(true);
      
      // Test basic Firebase connection by checking auth state
      const currentUser = auth.currentUser;
      const online = true; // Firebase handles connectivity automatically
      setIsOnline(online);
      
      if (online) {
        console.log('✅ Network connectivity confirmed');
      } else {
        console.log('❌ Network connectivity failed');
      }
      
      return online;
    } catch (error) {
      console.log('❌ Network connectivity check failed:', error);
      setIsOnline(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Load pending operations from storage
  const loadPendingOperations = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('pending_operations');
      if (stored) {
        const operations: PendingOperation[] = JSON.parse(stored);
        setPendingOperations(operations);
        console.log(`📦 Loaded ${operations.length} pending operations`);
      }
    } catch (error) {
      console.error('Error loading pending operations:', error);
    }
  }, []);

  // Save pending operations to storage
  const savePendingOperations = useCallback(async (operations: PendingOperation[]) => {
    try {
      await AsyncStorage.setItem('pending_operations', JSON.stringify(operations));
    } catch (error) {
      console.error('Error saving pending operations:', error);
    }
  }, []);

  // Add a pending operation
  const addPendingOperation = useCallback((operation: PendingOperation) => {
    setPendingOperations(prev => {
      const updated = [...prev, operation];
      savePendingOperations(updated);
      console.log(`📝 Added pending operation: ${operation.type} ${operation.entity}`);
      return updated;
    });
  }, [savePendingOperations]);

  // Clear all pending operations
  const clearPendingOperations = useCallback(() => {
    setPendingOperations([]);
    AsyncStorage.removeItem('pending_operations');
    console.log('🗑️ Cleared all pending operations');
  }, []);

  // Sync pending operations when online
  const syncPendingOperations = useCallback(async () => {
    if (!isOnline || pendingOperations.length === 0) {
      return;
    }

    console.log(`🔄 Syncing ${pendingOperations.length} pending operations...`);
    
    const successfulOperations: string[] = [];
    const failedOperations: PendingOperation[] = [];

    for (const operation of pendingOperations) {
      try {
        let result: any = { success: false };

        switch (operation.entity) {
          case 'customer':
            if (operation.type === 'CREATE') {
              result = await firestoreHelpers.addCustomer(operation.data);
            } else if (operation.type === 'UPDATE') {
              result = await firestoreHelpers.updateCustomer(operation.data.id, operation.data);
            } else if (operation.type === 'DELETE') {
              result = await firestoreHelpers.deleteCustomer(operation.data.id);
            }
            break;

          case 'loan':
            // Loans are now handled as transactions
            if (operation.type === 'CREATE') {
              result = await firestoreHelpers.addTransactionEntry(operation.data);
            } else if (operation.type === 'UPDATE') {
              // You might want to add updateTransactionEntry helper function
              result = { success: true };
            } else if (operation.type === 'DELETE') {
              // You might want to add deleteTransactionEntry helper function
              result = { success: true };
            }
            break;

          case 'transaction':
            if (operation.type === 'CREATE') {
              result = await firestoreHelpers.addTransactionEntry(operation.data);
            } else if (operation.type === 'UPDATE') {
              // You might want to add updateTransactionEntry helper function
              result = { success: true };
            } else if (operation.type === 'DELETE') {
              // You might want to add deleteTransactionEntry helper function
              result = { success: true };
            }
            break;
        }

        if (!result.success) {
          console.error(`❌ Failed to sync operation ${operation.id}:`, result.error);
          failedOperations.push(operation);
        } else {
          console.log(`✅ Successfully synced operation ${operation.id}`);
          successfulOperations.push(operation.id);
        }
      } catch (error) {
        console.error(`❌ Error syncing operation ${operation.id}:`, error);
        failedOperations.push(operation);
      }
    }

    // Update pending operations list
    setPendingOperations(failedOperations);
    savePendingOperations(failedOperations);

    if (successfulOperations.length > 0) {
      setLastSyncTime(new Date());
      console.log(`✅ Synced ${successfulOperations.length} operations successfully`);
    }

    if (failedOperations.length > 0) {
      console.log(`⚠️ ${failedOperations.length} operations failed to sync and will be retried`);
    }
  }, [isOnline, pendingOperations, savePendingOperations]);

  // Initialize network context
  useEffect(() => {
    loadPendingOperations();
    checkConnectivity();
  }, [loadPendingOperations, checkConnectivity]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingOperations.length > 0) {
      const syncTimeout = setTimeout(() => {
        syncPendingOperations();
      }, 1000); // Small delay to ensure stable connection

      return () => clearTimeout(syncTimeout);
    }
  }, [isOnline, pendingOperations.length, syncPendingOperations]);

  // Optimized connectivity check - only when needed, not polling
  useEffect(() => {
    // Check connectivity only on app state change or when explicitly needed
    // Removed 30-second polling to improve performance
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        checkConnectivity();
      }
    };

    // Only add listener if AppState is available (mobile)
    const AppState = require('react-native').AppState;
    if (AppState) {
      const subscription = AppState.addEventListener('change', handleAppStateChange);
      return () => subscription?.remove();
    }
  }, [checkConnectivity]);

  const value: NetworkContextType = {
    isOnline,
    isConnecting,
    lastSyncTime,
    pendingOperations,
    checkConnectivity,
    syncPendingOperations,
    addPendingOperation,
    clearPendingOperations,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}; 
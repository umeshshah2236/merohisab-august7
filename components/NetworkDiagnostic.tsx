import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
import { testFirebaseConnectionDetailed } from '@/lib/firebase';
import { useTheme } from '@/contexts/ThemeContext';

interface NetworkDiagnosticProps {
  visible?: boolean;
  onClose?: () => void;
}

interface NetworkStatusProps {
  isOnline: boolean;
  onRetry?: () => void;
}

// Simple network status indicator component
export function NetworkStatus({ isOnline, onRetry }: NetworkStatusProps) {
  const { theme } = useTheme();
  
  if (isOnline) {
    return null;
  }
  
  return (
    <View style={[styles.networkStatusBar, { backgroundColor: '#EF4444' }]}>
      <View style={styles.networkStatusContent}>
        <WifiOff size={16} color="white" />
        <Text style={styles.networkStatusText}>Connection issues detected</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <RefreshCw size={14} color="white" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function NetworkDiagnostic({ visible = false, onClose }: NetworkDiagnosticProps) {
  const { theme } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);
    const newResults: string[] = [];

    try {
      // Test 1: Basic connection
      newResults.push('🔍 Testing basic Firebase connection...');
      setResults([...newResults]);
      
      const connectionTest = await testFirebaseConnectionDetailed();
      if (connectionTest.success) {
        newResults.push('✅ Basic connection: SUCCESS');
      } else {
        newResults.push(`❌ Basic connection: FAILED - ${connectionTest.error}`);
      }
      setResults([...newResults]);

      // Test 2: Environment variables
      newResults.push('🔍 Checking environment variables...');
      setResults([...newResults]);
      
      const firebaseApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
      const firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
      
      if (firebaseApiKey && firebaseProjectId) {
        newResults.push('✅ Environment variables: PRESENT');
        newResults.push(`📍 Project ID: ${firebaseProjectId}`);
      } else {
        newResults.push('❌ Environment variables: MISSING');
        if (!firebaseApiKey) newResults.push('  - Missing EXPO_PUBLIC_FIREBASE_API_KEY');
        if (!firebaseProjectId) newResults.push('  - Missing EXPO_PUBLIC_FIREBASE_PROJECT_ID');
      }
      setResults([...newResults]);

      newResults.push('🏁 Diagnostic complete');
      setResults([...newResults]);

    } catch (error) {
      newResults.push(`💥 Diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResults([...newResults]);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (visible) {
      runDiagnostic();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.modal, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Network Diagnostic
        </Text>
        
        <View style={styles.resultsContainer}>
          {results.map((result, index) => (
            <Text key={index} style={[styles.resultText, { color: theme.colors.text }]}>
              {result}
            </Text>
          ))}
          {isRunning && (
            <Text style={[styles.resultText, { color: theme.colors.primary }]}>
              Running diagnostic...
            </Text>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={runDiagnostic}
            disabled={isRunning}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {isRunning ? 'Running...' : 'Run Again'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.closeButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: theme.colors.text }]}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Network status bar styles
  networkStatusBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  networkStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  networkStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginLeft: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Diagnostic modal styles
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultsContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButton: {
    borderWidth: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
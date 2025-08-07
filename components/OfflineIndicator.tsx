import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WifiOff, RefreshCw, Clock } from 'lucide-react-native';
import { useNetwork } from '@/contexts/NetworkContext';
import { useTheme } from '@/contexts/ThemeContext';

interface OfflineIndicatorProps {
  onRetry?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onRetry }) => {
  const { isOnline, isConnecting, pendingOperations, lastSyncTime } = useNetwork();
  const { theme } = useTheme();

  if (isOnline) {
    return null;
  }

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.content}>
        <View style={styles.statusRow}>
          <WifiOff size={16} color="#EF4444" />
          <Text style={[styles.statusText, { color: theme.colors.text }]}>
            You're offline
          </Text>
          {isConnecting && (
            <View style={styles.connectingContainer}>
              <RefreshCw size={12} color="#3B82F6" style={styles.spinning} />
              <Text style={[styles.connectingText, { color: theme.colors.primary }]}>
                Connecting...
              </Text>
            </View>
          )}
        </View>

        {pendingOperations.length > 0 && (
          <View style={styles.pendingContainer}>
            <Clock size={14} color="#F59E0B" />
            <Text style={[styles.pendingText, { color: theme.colors.text }]}>
              {pendingOperations.length} pending {pendingOperations.length === 1 ? 'change' : 'changes'}
            </Text>
          </View>
        )}

        {lastSyncTime && (
          <Text style={[styles.syncText, { color: theme.colors.textSecondary }]}>
            Last synced: {formatLastSync()}
          </Text>
        )}

        {onRetry && (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={onRetry}
            disabled={isConnecting}
          >
            <RefreshCw size={14} color="white" />
            <Text style={styles.retryButtonText}>
              {isConnecting ? 'Connecting...' : 'Retry'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  content: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  connectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  connectingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  spinning: {
    transform: [{ rotate: '360deg' }],
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  syncText: {
    fontSize: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
}); 
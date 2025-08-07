import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Wifi, WifiOff, RefreshCw, Clock, Database } from 'lucide-react-native';
import { useNetwork } from '@/contexts/NetworkContext';
import { useTheme } from '@/contexts/ThemeContext';

interface OfflineStatusCardProps {
  onSync?: () => void;
}

export const OfflineStatusCard: React.FC<OfflineStatusCardProps> = ({ onSync }) => {
  const { isOnline, isConnecting, pendingOperations, lastSyncTime } = useNetwork();
  const { theme } = useTheme();

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} days ago`;
    if (hours > 0) return `${hours} hours ago`;
    if (minutes > 0) return `${minutes} minutes ago`;
    return 'Just now';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          {isOnline ? (
            <Wifi size={20} color="#10B981" />
          ) : (
            <WifiOff size={20} color="#EF4444" />
          )}
          <Text style={[styles.statusText, { color: theme.colors.text }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          {isConnecting && (
            <View style={styles.connectingIndicator}>
              <RefreshCw size={14} color="#3B82F6" style={styles.spinning} />
              <Text style={[styles.connectingText, { color: theme.colors.primary }]}>
                Connecting...
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Clock size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Last synced: {formatLastSync()}
          </Text>
        </View>

        {pendingOperations.length > 0 && (
          <View style={styles.infoRow}>
            <Database size={16} color="#F59E0B" />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              {pendingOperations.length} pending {pendingOperations.length === 1 ? 'change' : 'changes'}
            </Text>
          </View>
        )}

        {!isOnline && (
          <View style={styles.offlineInfo}>
            <Text style={[styles.offlineText, { color: theme.colors.textSecondary }]}>
              You can continue using the app offline. Changes will be synced when you're back online.
            </Text>
          </View>
        )}
      </View>

      {onSync && pendingOperations.length > 0 && (
        <TouchableOpacity
          style={[styles.syncButton, { backgroundColor: theme.colors.primary }]}
          onPress={onSync}
          disabled={isConnecting}
        >
          <RefreshCw size={16} color="white" />
          <Text style={styles.syncButtonText}>
            {isConnecting ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectingIndicator: {
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
  content: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
  },
  offlineInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  offlineText: {
    fontSize: 13,
    lineHeight: 18,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  syncButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
}); 
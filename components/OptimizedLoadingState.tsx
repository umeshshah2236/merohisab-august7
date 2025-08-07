import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface OptimizedLoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  overlay?: boolean;
}

// Optimized loading component for Android performance
export default function OptimizedLoadingState({ 
  message,
  size = 'large',
  overlay = false 
}: OptimizedLoadingStateProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  // Android-optimized loading indicator
  const loadingIndicator = React.useMemo(() => (
    <ActivityIndicator 
      size={size} 
      color={theme.colors.primary}
      // Android optimization: reduce animation frequency
      animating={true}
      hidesWhenStopped={true}
    />
  ), [size, theme.colors.primary]);

  const containerStyle = [
    styles.container,
    { backgroundColor: overlay ? 'rgba(0,0,0,0.5)' : theme.colors.background },
    overlay && styles.overlay
  ];

  return (
    <View style={containerStyle}>
      <View style={[styles.content, { backgroundColor: theme.colors.surface }]}>
        {loadingIndicator}
        {message && (
          <Text style={[styles.message, { color: theme.colors.text }]}>
            {message}
          </Text>
        )}
      </View>
    </View>
  );
}

// Lightweight loading component for quick operations
export function QuickLoadingState({ message }: { message?: string }) {
  const { theme } = useTheme();
  
  return (
    <View style={styles.quickContainer}>
      <ActivityIndicator 
        size="small" 
        color={theme.colors.primary}
        animating={true}
      />
      {message && (
        <Text style={[styles.quickMessage, { color: theme.colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  content: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  quickContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  quickMessage: {
    marginLeft: 8,
    fontSize: 14,
  },
});

// Hook for managing loading states with Android optimization
export function useOptimizedLoading() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadingMessage, setLoadingMessage] = React.useState<string | undefined>();

  const showLoading = React.useCallback((message?: string) => {
    // Android optimization: batch state updates
    if (Platform.OS === 'android') {
      setTimeout(() => {
        setLoadingMessage(message);
        setIsLoading(true);
      }, 0);
    } else {
      setLoadingMessage(message);
      setIsLoading(true);
    }
  }, []);

  const hideLoading = React.useCallback(() => {
    // Android optimization: batch state updates
    if (Platform.OS === 'android') {
      setTimeout(() => {
        setIsLoading(false);
        setLoadingMessage(undefined);
      }, 0);
    } else {
      setIsLoading(false);
      setLoadingMessage(undefined);
    }
  }, []);

  return {
    isLoading,
    loadingMessage,
    showLoading,
    hideLoading,
  };
}
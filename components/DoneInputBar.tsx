import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, Keyboard, InputAccessoryView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface DoneInputBarProps {
  inputAccessoryViewID?: string;
  onDone?: () => void;
}

export default function DoneInputBar({ inputAccessoryViewID, onDone }: DoneInputBarProps) {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  
  const handleDone = () => {
    Keyboard.dismiss();
    onDone?.();
  };

  const barContent = (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.95)' : 'rgba(247, 247, 247, 0.95)',
        borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
      }
    ]}>
      <View style={styles.spacer} />
      <TouchableOpacity 
        style={[
          styles.doneButton,
          { backgroundColor: theme.colors.primary }
        ]}
        onPress={handleDone}
        activeOpacity={0.7}
      >
        <Text style={[styles.doneText, { color: '#FFFFFF' }]}>
          Done
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Only show Done bar on iOS devices
  if (Platform.OS === 'ios' && inputAccessoryViewID) {
    return (
      <InputAccessoryView nativeID={inputAccessoryViewID}>
        {barContent}
      </InputAccessoryView>
    );
  }

  // Android: Hide the Done bar (Android has built-in keyboard dismiss)
  return null;
}

// Hook to generate unique IDs for iOS InputAccessoryView
export const useDoneInputBar = () => {
  const inputAccessoryViewID = React.useMemo(() => 
    Platform.OS === 'ios' ? `done-bar-${Math.random().toString(36).substr(2, 9)}` : undefined, 
    []
  );
  
  return { inputAccessoryViewID };
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  spacer: {
    flex: 1,
  },
  doneButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
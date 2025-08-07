import React, { useRef } from 'react';
import { StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { convertToNepaliNumerals, convertToEnglishNumerals } from '@/utils/number-utils';
import DoneInputBar, { useDoneInputBar } from './DoneInputBar';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label: string;
  placeholder?: string;
  error?: string;
}

export default function AmountInput({
  value,
  onChangeText,
  label,
  placeholder = '0.00',
  error
}: AmountInputProps) {
  const { language } = useLanguage();
  const { theme, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const { inputAccessoryViewID } = useDoneInputBar();
  
  const handleChangeText = (text: string) => {
    // Convert Nepali numerals to English for processing
    const englishText = convertToEnglishNumerals(text);
    
    // Only allow numbers and decimal point
    const filtered = englishText.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = filtered.split('.');
    if (parts.length > 2) {
      return;
    }
    
    onChangeText(filtered);
  };

  const currencySymbol = language === 'ne' ? 'रु' : 'NPR';
  // Always display numbers in English for better readability
  const displayValue = value;
  const displayPlaceholder = placeholder;

  // Use different styling for light mode to ensure visibility
  const inputContainerStyle = isDark 
    ? {
        borderColor: error ? theme.colors.error : 'rgba(255, 255, 255, 0.2)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)'
      }
    : {
        borderColor: error ? theme.colors.error : theme.colors.border,
        backgroundColor: theme.colors.inputBackground
      };

  const currencyStyle = isDark
    ? { 
        backgroundColor: 'rgba(255, 255, 255, 0.1)', 
        borderRightColor: 'rgba(255, 255, 255, 0.2)' 
      }
    : {
        backgroundColor: theme.colors.surface,
        borderRightColor: theme.colors.border
      };

  const currencyTextStyle = isDark
    ? { color: 'rgba(255, 255, 255, 0.8)' }
    : { color: theme.colors.text };

  const inputTextStyle = isDark
    ? { color: 'white' }
    : { color: theme.colors.text };

  // Updated placeholder text color - more faded so it doesn't look like actual data
  const placeholderTextColor = isDark
    ? 'rgba(255, 255, 255, 0.3)'
    : 'rgba(120, 120, 120, 0.3)';

  const labelColor = isDark ? 'white' : theme.colors.text;

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}
      <View style={[styles.inputContainer, inputContainerStyle]}>
        {isDark ? (
          <BlurView intensity={10} style={styles.inputBlur}>
            <View style={[styles.currency, currencyStyle]}>
              <Text style={[styles.currencyText, currencyTextStyle]}>
                {currencySymbol}
              </Text>
            </View>
            <TextInput
              ref={inputRef}
              style={[styles.input, inputTextStyle, Platform.OS === 'web' && styles.webInput]}
              value={displayValue}
              onChangeText={handleChangeText}
              placeholder={displayPlaceholder}
              keyboardType="numeric"
              placeholderTextColor={placeholderTextColor}
              returnKeyType="done"
              blurOnSubmit={true}
              inputAccessoryViewID={inputAccessoryViewID}
              // Improved touch sensitivity
              editable={true}
              contextMenuHidden={false}
              showSoftInputOnFocus={true}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              // Enhanced touch response
              onFocus={() => {
                // Ensure immediate focus response
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
              onPressIn={() => {
                // Immediate response to touch
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
            />
          </BlurView>
        ) : (
          <View style={styles.inputBlur}>
            <View style={[styles.currency, currencyStyle]}>
              <Text style={[styles.currencyText, currencyTextStyle]}>
                {currencySymbol}
              </Text>
            </View>
            <TextInput
              ref={inputRef}
              style={[styles.input, inputTextStyle, Platform.OS === 'web' && styles.webInput]}
              value={displayValue}
              onChangeText={handleChangeText}
              placeholder={displayPlaceholder}
              keyboardType="numeric"
              placeholderTextColor={placeholderTextColor}
              returnKeyType="done"
              blurOnSubmit={true}
              inputAccessoryViewID={inputAccessoryViewID}
              // Improved touch sensitivity
              editable={true}
              contextMenuHidden={false}
              showSoftInputOnFocus={true}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              // Enhanced touch response
              onFocus={() => {
                // Ensure immediate focus response
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
              onPressIn={() => {
                // Immediate response to touch
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
            />
          </View>
        )}
      </View>
      {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}
      
      {/* Done Bar (iOS only - Android uses built-in keyboard dismiss) */}
      <DoneInputBar inputAccessoryViewID={inputAccessoryViewID} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    width: '100%',
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
    fontWeight: '700',
  },
  inputContainer: {
    borderWidth: 2,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 56,
  },
  inputBlur: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currency: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderRightWidth: 2,
    minHeight: 56,
    justifyContent: 'center',
  },
  currencyText: {
    fontWeight: '800',
    fontSize: 18,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    fontSize: 18,
    fontWeight: '800',
    minHeight: 56,
  },
  webInput: {
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
      outlineWidth: 0,
    }),
    cursor: 'text',
  } as any,
  errorText: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '700',
  },
});
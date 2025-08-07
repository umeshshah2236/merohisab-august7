import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, ScrollView, Dimensions, Keyboard, TouchableWithoutFeedback, TextInput } from 'react-native';
import TextInputWithDoneBar from '@/components/TextInputWithDoneBar';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, Phone, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomers } from '@/contexts/CustomersContext';
import { useLanguage } from '@/contexts/LanguageContext';

const { width } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;

// Dynamic sizing based on screen size
const getResponsiveSize = (small: number, medium: number, large: number) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

type CustomerType = 'customer' | 'supplier';

export default function CustomerFormScreen() {
  const { theme, isDark } = useTheme();
  const { user, firebaseUser, signOut, refreshSession } = useAuth();
  const { addCustomer, updateCustomer, getCustomerByPhone, customers } = useCustomers();
  const languageContext = useLanguage();
  const t = languageContext?.t || ((key: string) => key);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  // Check if we're in edit mode
  const editModeParam = params.editMode;
  const isEditMode = editModeParam === 'true';
  const customerId = params.customerId as string || '';
  const originalCustomerName = params.customerName as string || '';
  const originalPhoneNumber = params.customerPhone as string || '';
  const focusPhone = params.focusPhone === 'true'; // Check if we should focus on phone field
  
  console.log('=== CUSTOMER FORM INITIALIZATION ===');
  console.log('All params:', params);
  console.log('editModeParam:', editModeParam, 'type:', typeof editModeParam);
  console.log('isEditMode:', isEditMode);
  console.log('customerId:', customerId, 'type:', typeof customerId);
  console.log('originalCustomerName:', originalCustomerName);
  console.log('originalPhoneNumber:', originalPhoneNumber);
  
  const [customerName, setCustomerName] = useState(originalCustomerName);
  const [phoneNumber, setPhoneNumber] = useState(() => {
    console.log('Customer form: originalPhoneNumber:', originalPhoneNumber);
    if (!originalPhoneNumber || originalPhoneNumber.trim() === '') {
      return '';
    }
    const processed = originalPhoneNumber.startsWith('+977') 
      ? originalPhoneNumber.slice(4) 
      : originalPhoneNumber;
    console.log('Customer form: processed phone number:', processed);
    return processed;
  });
  const [customerType, setCustomerType] = useState<CustomerType>('customer');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  // Refs for input fields
  const nameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);

  const handleSaveCustomer = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    console.log('=== CUSTOMER FORM: Save button pressed ===');
    console.log('Edit mode:', isEditMode);
    console.log('Customer name:', customerName.trim());
    console.log('Original customer name:', originalCustomerName);
    console.log('Phone number:', phoneNumber.trim());
    console.log('Customer type:', customerType);
    console.log('Phone error:', phoneError);
    console.log('Firebase user exists:', !!firebaseUser);
    
    if (!customerName.trim()) {
      console.log('ERROR: Customer name is empty');
      Alert.alert(t('error'), t('pleaseEnterCustomerName'));
      return;
    }

    // Phone number is now optional, but if provided, check for errors
    if (phoneNumber.trim() && phoneError) {
      console.log('ERROR: Phone number has validation error:', phoneError);
      Alert.alert(t('error'), t('pleaseUseDifferentPhoneNumber'));
      return;
    }

    if (!firebaseUser) {
      console.log('ERROR: User not authenticated');
      Alert.alert(t('error'), t('youMustBeLoggedInToSaveCustomers'));
      return;
    }

    setLoading(true);
    const formattedPhone = phoneNumber.trim() ? '+977' + phoneNumber.trim() : null;
    
    try {
      console.log('=== CUSTOMER FORM: Starting save process ===');
      console.log('isEditMode:', isEditMode, 'type:', typeof isEditMode);
      console.log('customerId:', customerId, 'type:', typeof customerId);
      console.log('customerName:', customerName.trim());
      console.log('formattedPhone:', formattedPhone);
      console.log('customerType:', customerType);
      console.log('editModeParam value:', editModeParam);
      console.log('editModeParam === "true":', editModeParam === 'true');
      console.log('Boolean(editModeParam):', Boolean(editModeParam));
      
      // Additional check: if we have a customerId, we should be in edit mode
      const shouldBeEditMode = Boolean(customerId);
      console.log('shouldBeEditMode (based on customerId):', shouldBeEditMode);
      
      if (isEditMode || shouldBeEditMode) {
        // Use the customer ID passed from the detail page
        if (!customerId) {
          console.error('ERROR: Customer ID is missing for edit mode');
          throw new Error('Customer ID is required for editing');
        }
        
        console.log('=== UPDATING EXISTING CUSTOMER ===');
        console.log('Customer ID:', customerId);
        console.log('Customer name:', customerName.trim());
        console.log('Phone:', formattedPhone);
        console.log('Type:', customerType);
        
        // Update existing customer - ensure name is provided
        const result = await updateCustomer(customerId, {
          name: customerName.trim(),
          phone: formattedPhone,
          customer_type: customerType,
        });
        
        console.log('=== CUSTOMER UPDATE SUCCESS ===');
        console.log('Result:', result);
        
        // Navigate back to the statement page
        router.replace({
          pathname: '/(tabs)/(home)/customer-detail',
          params: { customerName: customerName.trim(), customerPhone: formattedPhone || '' }
        });
      } else {
        console.log('=== ADDING NEW CUSTOMER ===');
        console.log('Customer name:', customerName.trim());
        console.log('Phone:', formattedPhone);
        console.log('Type:', customerType);
        
        // Add new customer (duplicate check is now handled in the context)
        const result = await addCustomer({
          name: customerName.trim(),
          phone: formattedPhone,
          customer_type: customerType,
        });
        
        console.log('=== CUSTOMER ADD SUCCESS ===');
        console.log('Result:', result);

        // Navigate to customer detail page after successful save
        router.replace({
          pathname: '/(tabs)/(home)/customer-detail',
          params: {
            customerName: customerName.trim(),
            customerPhone: formattedPhone || ''
          }
        });
      }

    } catch (error: any) {
      console.error('Error saving customer:', error);
      
      // Check if this is a duplicate customer error that should navigate to search
      if (error.shouldNavigateToSearch && error.existingCustomer) {
        console.log('Customer already exists, navigating to customer detail:', error.existingCustomer);
        
        Alert.alert(
          'Customer Already Exists',
          `A customer named "${error.existingCustomer.name}" already exists. You will be redirected to their profile.`,
          [
            {
              text: 'View Customer',
              onPress: () => {
                router.replace('/(tabs)/(home)/dashboard');
              }
            },
            {
              text: 'Stay Here',
              style: 'cancel'
            }
          ]
        );
        return;
      }
      
      let errorMessage = 'Failed to save customer. Please try again.';
      let isSessionExpired = false;
      
      if (error instanceof Error) {
        if (error.message.includes('session has expired')) {
          errorMessage = 'Your session has expired.';
          isSessionExpired = true;
        } else if (error.message.includes('already exists')) {
          // Extract the existing customer name from the error message
          const match = error.message.match(/already exists: (.+)$/);
          const existingCustomerName = match ? match[1] : '';
          
          if (existingCustomerName) {
            errorMessage = `This phone number is already registered to "${existingCustomerName}". Please use a different phone number or update the existing customer.`;
          } else {
            errorMessage = 'This phone number is already registered to another customer. Please use a different phone number.';
          }
        } else {
          errorMessage = error.message;
        }
      }
      
      if (isSessionExpired) {
        Alert.alert(
          'Session Expired', 
          errorMessage,
          [
            {
              text: 'Try Again',
              onPress: async () => {
                console.log('Attempting to refresh session...');
                const refreshResult = await refreshSession();
                if (refreshResult.success) {
                  console.log('Session refreshed, retrying save...');
                  // Retry the save operation
                  handleSaveCustomer();
                } else {
                  console.log('Session refresh failed:', refreshResult.error);
                  Alert.alert(
                    'Session Refresh Failed',
                    'Please sign out and sign in again.',
                    [
                      {
                        text: 'Sign Out',
                        onPress: async () => {
                          await signOut();
                        },
                        style: 'destructive'
                      },
                      {
                        text: 'Cancel',
                        style: 'cancel'
                      }
                    ]
                  );
                }
              },
              style: 'default'
            },
            {
              text: 'Sign Out',
              onPress: async () => {
                await signOut();
              },
              style: 'destructive'
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert(
          'Error Saving Customer', 
          errorMessage,
          [
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (text: string) => {
    // Remove any non-digit characters except the initial +977
    const cleaned = text.replace(/[^\d]/g, '');
    
    // If empty, return empty (phone is optional)
    if (!cleaned) {
      return '';
    }
    
    // Limit to reasonable length (Nepal phone numbers are typically 10 digits after +977)
    return cleaned.slice(0, 10);
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
    
    // Clear previous error
    setPhoneError(null);
    
    // Check if phone number already exists (only if it's a complete number)
    if (formatted.length >= 10) { // 10 digits
      const fullPhone = '+977' + formatted;
      const existingCustomer = getCustomerByPhone(fullPhone);
      
      // In edit mode, ignore if it's the same customer's current phone
      if (existingCustomer && !(isEditMode && existingCustomer.id === customerId)) {
        setPhoneError(`This number belongs to "${existingCustomer.name}"`);
      }
    }
  };

  // Auto-focus phone input if focusPhone parameter is true
  useEffect(() => {
    if (focusPhone && phoneInputRef.current) {
      // Delay focus to ensure the component is fully rendered
      const timer = setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [focusPhone]);
  
  // Responsive header sizing
  const headerPaddingTop = Math.max(insets.top + getResponsiveSize(16, 20, 24), 44);
  const headerPaddingBottom = getResponsiveSize(20, 24, 28);
  const headerPaddingHorizontal = getResponsiveSize(16, 20, 24);

  const handleGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Use router.replace for smooth navigation like Settings -> Home
    // This prevents dashboard re-mounting and loading states
    setTimeout(() => {
      router.replace('/(tabs)/(home)/dashboard');
    }, 100);
  };

  return (
    <>
      <Stack.Screen options={{ 
        headerShown: false,
        // CRITICAL: Android background to prevent white flash during navigation
        contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
        cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
      }} />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={[styles.container, { backgroundColor: theme.colors.background }]} 
            contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <LinearGradient
            colors={['#1e40af', '#3b82f6']}
            style={[styles.header, { 
              paddingTop: Platform.OS === 'ios' ? headerPaddingTop : insets.top + 40, // Increased padding for Android camera area
              paddingBottom: headerPaddingBottom,
              paddingHorizontal: headerPaddingHorizontal,
              marginTop: Platform.OS === 'android' ? -insets.top : 0, // Negative margin to extend behind status bar on Android
            }]}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity 
                style={[styles.backButton, {
                  width: getResponsiveSize(40, 44, 48),
                  height: getResponsiveSize(40, 44, 48),
                }]} 
                onPress={handleGoBack}
              >
                <ArrowLeft size={getResponsiveSize(20, 24, 26)} color="white" />
              </TouchableOpacity>
              
              <View style={styles.titleContainer}>
                <Text style={[styles.headerTitle, {
                  fontSize: getResponsiveSize(24, 28, 32),
                }]}>
                  {isEditMode ? t('editCustomer') : t('addCustomer')}
                </Text>
                <Text style={[styles.headerSubtitle, {
                  fontSize: getResponsiveSize(14, 15, 16),
                  marginTop: getResponsiveSize(4, 6, 8),
                  marginBottom: getResponsiveSize(8, 10, 12),
                }]}>
                  {isEditMode ? t('updateCustomerDetails') : t('enterCustomerDetails')}
                </Text>
              </View>
              
              <View style={[styles.spacer, {
                width: getResponsiveSize(40, 44, 48),
              }]} />
            </View>
          </LinearGradient>
          
          <View style={[styles.formContainer, { 
            backgroundColor: isDark ? theme.colors.surface : 'white',
            paddingHorizontal: getResponsiveSize(20, 24, 28),
            paddingTop: getResponsiveSize(32, 36, 40),
            paddingBottom: getResponsiveSize(24, 28, 32),
            marginHorizontal: getResponsiveSize(16, 20, 24),
            marginTop: getResponsiveSize(-20, -24, -28),
            borderRadius: 20,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 12,
            elevation: 8,
          }]}>
            {/* Customer Name Input */}
            <View style={[styles.inputWrapper, {
              marginBottom: getResponsiveSize(24, 28, 32),
              marginTop: getResponsiveSize(4, 6, 8),
            }]}>
              <Text style={[styles.inputLabel, { 
                color: isDark ? theme.colors.text : '#1e293b',
                fontSize: getResponsiveSize(15, 16, 17),
              }]}>
                {t('customerName')}
              </Text>
              <View style={[styles.inputContainer, {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.background,
              }]}>
                <User size={20} color={isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b'} style={styles.inputIcon} />
                <TextInputWithDoneBar
                  ref={nameInputRef}
                  style={[styles.input, { color: isDark ? theme.colors.text : '#1e293b' }]}
                  placeholder={t('enterCustomerName')}
                  placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8'}
                  value={customerName}
                  onChangeText={setCustomerName}
                  autoFocus={!focusPhone} // Only auto-focus name if not focusing on phone
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
                    if (nameInputRef.current) {
                      nameInputRef.current.focus();
                    }
                  }}
                  onPressIn={() => {
                    // Immediate response to touch
                    if (nameInputRef.current) {
                      nameInputRef.current.focus();
                    }
                  }}
                />
              </View>
            </View>

            {/* Phone Number Input */}
            <View style={[styles.inputWrapper, {
              marginBottom: getResponsiveSize(32, 36, 40),
            }]}>
              <Text style={[styles.inputLabel, { 
                color: isDark ? theme.colors.text : '#1e293b',
                fontSize: getResponsiveSize(15, 16, 17),
              }]}>
                {t('phoneNumberOptional')}
              </Text>
              <View style={[styles.inputContainer, {
                borderColor: phoneError 
                  ? (isDark ? '#f87171' : '#ef4444') 
                  : (isDark ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0'),
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.background,
              }]}>
                <Phone size={20} color={phoneError 
                  ? (isDark ? '#f87171' : '#ef4444') 
                  : (isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b')
                } style={styles.inputIcon} />
                <Text style={[styles.countryCode, { 
                  color: isDark ? theme.colors.text : '#1e293b',
                  marginRight: 8,
                }]}>+977</Text>
                <TextInputWithDoneBar
                  ref={phoneInputRef}
                  style={[styles.input, { color: isDark ? theme.colors.text : '#1e293b' }]}
                  placeholder={t('mobileNumber')}
                  placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8'}
                  value={phoneNumber}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
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
                    if (phoneInputRef.current) {
                      phoneInputRef.current.focus();
                    }
                  }}
                  onPressIn={() => {
                    // Immediate response to touch
                    if (phoneInputRef.current) {
                      phoneInputRef.current.focus();
                    }
                  }}
                />
              </View>
              {phoneError && (
                <Text style={[styles.errorText, { color: isDark ? '#f87171' : '#ef4444' }]}>
                  {phoneError}
                </Text>
              )}
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.saveButton, {
                minHeight: getResponsiveSize(48, 52, 56),
                opacity: (loading || phoneError) ? 0.7 : 1,
              }]} 
              onPress={handleSaveCustomer}
              disabled={loading || !!phoneError}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#2563eb', '#1d4ed8']}
                style={styles.buttonGradient}
              >
                {loading ? (
                  <Text style={[styles.saveButtonText, {
                    fontSize: getResponsiveSize(14, 15, 16),
                  }]}>
                    {t('saving')}
                  </Text>
                ) : (
                  <>
                    <Check size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={[styles.saveButtonText, {
                      fontSize: getResponsiveSize(14, 15, 16),
                    }]}>
                      {isEditMode ? t('updateCustomer') : t('saveCustomer')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '400',
  },
  spacer: {
    // Invisible spacer to balance the layout
  },
  formContainer: {
    // Dynamic styles applied inline
  },
  inputWrapper: {
    // Dynamic styles applied inline
  },
  inputLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
    minHeight: 60,
  },
  inputIcon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    minHeight: 44,
    paddingVertical: 8,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
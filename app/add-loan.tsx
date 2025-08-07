import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import TextInputWithDoneBar from '@/components/TextInputWithDoneBar';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Save, X, Plus, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactionEntries } from '@/contexts/TransactionEntriesContext';
import { useCustomers } from '@/contexts/CustomersContext';
import AmountInput from '@/components/AmountInput';
import DatePicker from '@/components/DatePicker';
import { BSDate } from '@/utils/date-utils';
import { getCurrentBSDate } from '@/utils/current-date-utils';
import { auth, firestoreHelpers, testFirebaseConnection } from '@/lib/firebase';

interface RepaymentEntry {
  id: string;
  amount: string;
  date: BSDate;
}

export default function AddLoanScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { refreshTransactionEntries } = useTransactionEntries();
  const { addCustomer, searchCustomers } = useCustomers();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // Form state
  const [personName, setPersonName] = useState('');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDate, setLoanDate] = useState<BSDate>(getCurrentBSDate());
  const [documentSubmitted, setDocumentSubmitted] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [transactionType, setTransactionType] = useState<'given' | 'received'>('given');
  const [repayments, setRepayments] = useState<RepaymentEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pre-fill form with customer data from params
  useEffect(() => {
    if (params.customerName && typeof params.customerName === 'string') {
      setPersonName(params.customerName);
    }
  }, [params.customerName]);

  // Form validation
  const [errors, setErrors] = useState<{
    personName?: string;
    loanAmount?: string;
    purpose?: string;
    repayments?: { [key: string]: { amount?: string } };
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!personName.trim()) {
      newErrors.personName = 'Person name is required';
    }

    if (!loanAmount.trim() || parseFloat(loanAmount) <= 0) {
      newErrors.loanAmount = 'Valid loan amount is required';
    }

    // Validate repayments
    const repaymentErrors: { [key: string]: { amount?: string } } = {};
    repayments.forEach((repayment) => {
      if (!repayment.amount.trim() || parseFloat(repayment.amount) <= 0) {
        repaymentErrors[repayment.id] = { amount: 'Valid amount is required' };
      }
    });

    if (Object.keys(repaymentErrors).length > 0) {
      newErrors.repayments = repaymentErrors;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addRepayment = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const newRepayment: RepaymentEntry = {
      id: Date.now().toString(),
      amount: '',
      date: getCurrentBSDate(),
    };
    
    setRepayments([...repayments, newRepayment]);
  };

  const removeRepayment = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setRepayments(repayments.filter(r => r.id !== id));
    
    // Remove errors for this repayment
    if (errors.repayments && errors.repayments[id]) {
      const newRepaymentErrors = { ...errors.repayments };
      delete newRepaymentErrors[id];
      setErrors({ ...errors, repayments: newRepaymentErrors });
    }
  };

  const updateRepayment = (id: string, field: keyof RepaymentEntry, value: any) => {
    setRepayments(repayments.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
    
    // Clear error for this field
    if (errors.repayments && errors.repayments[id] && field === 'amount') {
      const newRepaymentErrors = { ...errors.repayments };
      delete newRepaymentErrors[id];
      setErrors({ ...errors, repayments: newRepaymentErrors });
    }
  };

  const formatBSDateForDB = (date: BSDate): string => {
    const formattedDate = `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
    console.log('Formatting BS date for DB:', date, '-> formatted:', formattedDate);
    return formattedDate;
  };

  const handleSave = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!validateForm()) {
      Alert.alert(t('validationError'), t('pleaseFixErrorsAndTryAgain'));
      return;
    }

    if (!user) {
      Alert.alert(t('error'), t('youMustBeLoggedInToAddTransaction'));
      return;
    }

    console.log('Current user:', user.id, user.phone);

    setIsLoading(true);

    // Test connection first
    const connectionTest = await testFirebaseConnection();
    if (!connectionTest) {
              Alert.alert(t('connectionError'), t('unableToConnectToDatabase'));
      setIsLoading(false);
      return;
    }

    // Check if user session is valid
    const { data: { session }, error: sessionError } = await auth.getSession();
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
              Alert.alert(t('authenticationError'), t('sessionExpiredPleaseLogIn'));
      setIsLoading(false);
      return;
    }
    console.log('Session valid, user authenticated:', session.user.id);

    try {
      const parsedLoanAmount = parseFloat(loanAmount);
      const formattedLoanDate = formatBSDateForDB(loanDate);

      // Validate parsed values
      if (isNaN(parsedLoanAmount) || parsedLoanAmount <= 0) {
        throw new Error('Invalid loan amount');
      }

      if (!formattedLoanDate || formattedLoanDate.length < 10) {
        throw new Error('Invalid loan date format');
      }

      // First, ensure the customer exists in the customers table
      console.log('Checking if customer exists:', personName.trim());
      let customerId = null;
      
      try {
        // Search for existing customer by name
        const existingCustomers = await searchCustomers(personName.trim());
        const existingCustomer = existingCustomers.find(c => 
          c.name.toLowerCase() === personName.trim().toLowerCase()
        );
        
        if (existingCustomer) {
          console.log('Found existing customer:', existingCustomer.id);
          customerId = existingCustomer.id;
        } else {
          // Create new customer
          console.log('Creating new customer for transaction...');
          const customerType = transactionType === 'given' ? 'customer' : 'supplier';
          const newCustomer = await addCustomer({
            name: personName.trim(),
            phone: null, // No phone provided in transaction form
            customer_type: customerType as 'customer' | 'supplier'
          });
          customerId = newCustomer.data?.id || '';
          console.log('Created new customer with ID:', customerId);
        }
      } catch (customerError) {
        console.error('Error handling customer:', customerError);
        // If customer creation fails, we'll still proceed with the transaction
        // but log the error for debugging
        console.warn('Proceeding with transaction creation without customer link due to error:', customerError);
      }

      // Create the main transaction entry
      const transactionData = {
        user_id: user.id,
        customer_id: customerId || '',
        customer_name: personName.trim(),
        amount: parsedLoanAmount,
        transaction_type: transactionType,
        description: purpose.trim() || null,
        transaction_date: formattedLoanDate,
        balance_after: 0,
      };

      console.log('Attempting to save transaction with data:', transactionData);

      // Insert main transaction
      console.log('Inserting transaction into database...');
      const result = await firestoreHelpers.addTransactionEntry(transactionData);

      console.log('Transaction insert result:', result);

      if (!result.success) {
        throw new Error('Transaction was not created successfully');
      }

      console.log('Transaction created successfully with ID:', result.data.id);

      // Insert repayments as separate transaction entries if any
      if (repayments.length > 0) {
        console.log('Inserting repayments as separate transactions...');
        for (const repayment of repayments) {
          const parsedAmount = parseFloat(repayment.amount);
          const formattedDate = formatBSDateForDB(repayment.date);
          
          if (isNaN(parsedAmount) || parsedAmount <= 0) {
            throw new Error(`Invalid repayment amount: ${repayment.amount}`);
          }
          
          if (!formattedDate || formattedDate.length < 10) {
            throw new Error('Invalid repayment date format');
          }
          
          const repaymentTransactionData = {
            user_id: user.id,
            customer_id: customerId || '',
            customer_name: personName.trim(),
            amount: parsedAmount,
            transaction_type: transactionType === 'given' ? 'received' : 'given', // Opposite of main transaction
            description: `Repayment for ${transactionType === 'given' ? 'loan given' : 'loan received'} on ${formattedLoanDate}`,
            transaction_date: formattedDate,
            balance_after: 0,
          };

          console.log('Repayment transaction data to insert:', repaymentTransactionData);

          const repaymentResult = await firestoreHelpers.addTransactionEntry(repaymentTransactionData);

          console.log('Repayment transaction insert result:', repaymentResult);

          if (!repaymentResult.success) {
            throw new Error('Repayment transaction was not created successfully');
          }
        }
      }

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Refresh the transaction entries data immediately
      await refreshTransactionEntries();

      Alert.alert(
        t('success'),
        'Transaction record has been added successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/(home)/dashboard'),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving transaction:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      let errorMessage = 'Failed to save transaction record. Please try again.';
      
      // Handle Firebase error format
      const firebaseError = error as any;
      if (firebaseError.message) {
        errorMessage = firebaseError.message;
      } else if (firebaseError.code) {
        errorMessage = `Database error (${firebaseError.code})`;
      } else {
        errorMessage = 'An unknown error occurred';
      }
      
              Alert.alert(t('error'), `${t('errorSavingTransaction')}: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen 
        options={{ 
          headerShown: false
        }} 
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Gradient Background */}
        <LinearGradient
          colors={['#574D79', '#d4656e', '#02071c']}
          style={[styles.headerGradient, { 
            paddingTop: Platform.OS === 'ios' ? Math.max(insets.top + 20, 44) : insets.top + 40, // Increased padding for Android camera area
            paddingBottom: 32,
            paddingHorizontal: 20,
            marginTop: Platform.OS === 'android' ? -insets.top : 0, // Negative margin to extend behind status bar on Android
          }]}
        >
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleGoBack}
              activeOpacity={0.7}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Add Loan Transaction</Text>
            <TouchableOpacity
              style={[styles.saveButton, { opacity: isLoading ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Save size={24} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Form Content */}
        <View style={styles.formContainer}>
          {/* Transaction Type */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Transaction Type</Text>
            
            <View style={styles.transactionTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.transactionTypeButton,
                  {
                    backgroundColor: transactionType === 'given' ? theme.colors.primary : theme.colors.surface,
                    borderColor: transactionType === 'given' ? theme.colors.primary : theme.colors.border,
                  }
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setTransactionType('given');
                }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.transactionTypeText,
                  { color: transactionType === 'given' ? 'white' : theme.colors.text }
                ]}>
                  💸 Money Given
                </Text>
                <Text style={[
                  styles.transactionTypeSubtext,
                  { color: transactionType === 'given' ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }
                ]}>
                  To customers/borrowers
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.transactionTypeButton,
                  {
                    backgroundColor: transactionType === 'received' ? theme.colors.primary : theme.colors.surface,
                    borderColor: transactionType === 'received' ? theme.colors.primary : theme.colors.border,
                  }
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setTransactionType('received');
                }}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.transactionTypeText,
                  { color: transactionType === 'received' ? 'white' : theme.colors.text }
                ]}>
                  💰 Money Received
                </Text>
                <Text style={[
                  styles.transactionTypeSubtext,
                  { color: transactionType === 'received' ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary }
                ]}>
                  From suppliers/lenders
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Person Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Person Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Person's Name *</Text>
              <TextInputWithDoneBar
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: errors.personName ? theme.colors.error : theme.colors.border,
                    color: theme.colors.text,
                  }
                ]}
                value={personName}
                onChangeText={(text) => {
                  setPersonName(text);
                  if (errors.personName) {
                    setErrors({ ...errors, personName: undefined });
                  }
                }}
                placeholder="Enter person's full name"
                placeholderTextColor={theme.colors.textSecondary}
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
                }}
                onPressIn={() => {
                  // Immediate response to touch
                }}
              />
              {errors.personName && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.personName}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Purpose/Description</Text>
              <TextInputWithDoneBar
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: errors.purpose ? theme.colors.error : theme.colors.border,
                    color: theme.colors.text,
                  }
                ]}
                value={purpose}
                onChangeText={(text) => {
                  setPurpose(text);
                  if (errors.purpose) {
                    setErrors({ ...errors, purpose: undefined });
                  }
                }}
                placeholder="e.g., For rice purchase, Clothing credit, Rent loan"
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={2}
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
                }}
                onPressIn={() => {
                  // Immediate response to touch
                }}
              />
              {errors.purpose && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.purpose}
                </Text>
              )}
            </View>
          </View>

          {/* Transaction Details */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>💰 Transaction Details</Text>
            
            <AmountInput
              value={loanAmount}
              onChangeText={(text) => {
                setLoanAmount(text);
                if (errors.loanAmount) {
                  setErrors({ ...errors, loanAmount: undefined });
                }
              }}
              label={`${transactionType === 'given' ? 'Amount Given' : 'Amount Received'} *`}
              placeholder="0.00"
              error={errors.loanAmount}
            />

            <DatePicker
              value={loanDate}
              onChange={setLoanDate}
              label={`${transactionType === 'given' ? 'Date Given' : 'Date Received'} (BS) *`}
            />
          </View>

          {/* Repayment Details */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🔁 Repayment Details</Text>
              <TouchableOpacity
                style={[styles.addRepaymentButton, { backgroundColor: theme.colors.primary }]}
                onPress={addRepayment}
                activeOpacity={0.8}
              >
                <Plus size={20} color="white" />
                <Text style={styles.addRepaymentText}>Add Repayment</Text>
              </TouchableOpacity>
            </View>

            {repayments.length === 0 ? (
              <Text style={[styles.noRepaymentsText, { color: theme.colors.textSecondary }]}>
                No repayments added yet. You can add them now or later.
              </Text>
            ) : (
              repayments.map((repayment, index) => (
                <View key={repayment.id} style={[styles.repaymentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={styles.repaymentHeader}>
                    <Text style={[styles.repaymentTitle, { color: theme.colors.text }]}>
                      Repayment {index + 1}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeRepaymentButton}
                      onPress={() => removeRepayment(repayment.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={18} color={theme.colors.error} />
                    </TouchableOpacity>
                  </View>

                  <AmountInput
                    value={repayment.amount}
                    onChangeText={(text) => updateRepayment(repayment.id, 'amount', text)}
                    label="Repayment Amount *"
                    placeholder="0.00"
                    error={errors.repayments?.[repayment.id]?.amount}
                  />

                  <DatePicker
                    value={repayment.date}
                    onChange={(date) => updateRepayment(repayment.id, 'date', date)}
                    label="Repayment Date (BS) *"
                  />
                </View>
              ))
            )}
          </View>

          {/* Document Status */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🏛️ Document Status</Text>
            
            <View style={[styles.switchContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.switchContent}>
                <Text style={[styles.switchLabel, { color: theme.colors.text }]}>
                  Submitted to Ward Office?
                </Text>
                <Text style={[styles.switchDescription, { color: theme.colors.textSecondary }]}>
                  Toggle if transaction document has been submitted to ward office
                </Text>
              </View>
              <Switch
                value={documentSubmitted}
                onValueChange={setDocumentSubmitted}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                thumbColor={documentSubmitted ? theme.colors.primary : theme.colors.textSecondary}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  headerGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  addRepaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  addRepaymentText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  noRepaymentsText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  repaymentCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  repaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  repaymentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  removeRepaymentButton: {
    padding: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  transactionTypeContainer: {
    gap: 12,
  },
  transactionTypeButton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  transactionTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionTypeSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
});
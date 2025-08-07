import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Alert, SafeAreaView, KeyboardAvoidingView, InteractionManager } from 'react-native';
import TextInputWithDoneBar from '@/components/TextInputWithDoneBar';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, TrendingDown, Trash2, Plus, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactionEntries } from '@/contexts/TransactionEntriesContext';
import { useCustomers } from '@/contexts/CustomersContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AmountInput from '@/components/AmountInput';
import DatePicker from '@/components/DatePicker';
import { getAccurateCurrentBSDate } from '@/utils/current-date-utils';
import { BS_MONTHS } from '@/constants/calendar';
import { auth, firestoreHelpers } from '@/lib/firebase';
import { BSDate } from '@/utils/date-utils';

export default function AddReceiveEntryScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { updateTransactionEntry, deleteTransactionEntry, setFirebaseUser, getAllTransactionEntries } = useTransactionEntries();
  const { addCustomer, searchCustomers } = useCustomers();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const customerName = params.customerName as string || '';
  const customerPhone = params.customerPhone as string || '';
  const customerId = params.customerId as string || '';
  const editTransactionId = params.editTransactionId as string || '';
  const editAmount = params.editAmount as string || '';
  const editDescription = params.editDescription as string || '';
  const editDate = params.editDate as string || '';
  
  const isEditMode = !!editTransactionId;

  interface EntryItem {
    amount: string;
    description: string;
    id: string;
  }

  // Initialize date from edit mode or current date
  const initializeDate = (): BSDate => {
    if (isEditMode && editDate) {
      // Parse the BS date string (YYYY-MM-DD format)
      const [year, month, day] = editDate.split('-');
      return {
        year: year,
        month: parseInt(month, 10),
        day: parseInt(day, 10)
      };
    }
    // Default to current BS date
    const currentBS = getAccurateCurrentBSDate();
    return {
      year: currentBS.year.toString(),
      month: currentBS.month,
      day: currentBS.day
    };
  };

  const [selectedDate, setSelectedDate] = useState<BSDate>(initializeDate());
  
  const [formData, setFormData] = useState<{
    entries: EntryItem[];
  }>({
    entries: isEditMode ? [{
      id: '1',
      amount: editAmount,
      description: editDescription
    }] : [{
      id: '1',
      amount: '',
      description: ''
    }]
  });
  
  const [errors, setErrors] = useState<{
    entries?: { [key: string]: { amount?: string; description?: string } };
  }>({});
  
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (user) {
      setFirebaseUser(user);
    }
  }, [user, setFirebaseUser]);
  
  useEffect(() => {
    console.log(isEditMode ? 'Edit Receive Entry screen loaded' : 'Add Receive Entry screen loaded', 'for customer:', customerName);
    if (isEditMode) {
      console.log('Edit mode data:', { editTransactionId, editAmount, editDescription, editDate });
    }
  }, [customerName, isEditMode, editTransactionId, editAmount, editDescription, editDate]);
  
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    const entryErrors: { [key: string]: { amount?: string; description?: string } } = {};
    let hasEntryErrors = false;
    
    formData.entries.forEach((entry, index) => {
      const entryError: { amount?: string; description?: string } = {};
      
      if (!entry.amount.trim()) {
        entryError.amount = t('amountIsRequired');
        hasEntryErrors = true;
      } else if (isNaN(parseFloat(entry.amount)) || parseFloat(entry.amount) <= 0) {
        entryError.amount = t('pleaseEnterValidAmount');
        hasEntryErrors = true;
      }
      
      if (Object.keys(entryError).length > 0) {
        entryErrors[entry.id] = entryError;
      }
    });
    
    if (hasEntryErrors) {
      newErrors.entries = entryErrors;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSaveEntry = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!validateForm()) {
      return;
    }
    
    if (!user) {
      Alert.alert(t('error'), t('youMustBeLoggedIn'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isEditMode) {
        // Update existing transaction entry
        const firstEntry = formData.entries[0];
        await updateTransactionEntry(
          editTransactionId,
          parseFloat(firstEntry.amount),
          'received',
          firstEntry.description || undefined
        );
        
        console.log('Receive entry updated successfully');
        // Set transaction activity flag for dashboard smart refresh
        (globalThis as any).__lastTransactionActivity = Date.now();
        // CRITICAL FIX: Invalidate customer cache since transaction was modified
        delete (globalThis as any).__customerSummariesCache;
        // Return to customer statement page if we came from there
        if (customerName) {
          router.replace({
            pathname: '/(tabs)/(home)/customer-detail',
            params: { customerName }
          });
        } else {
          router.replace('/(tabs)/(home)/dashboard');
        }
      } else {
        // Create new transaction entry using selected date
        const bsDateString = `${selectedDate.year}-${selectedDate.month.toString().padStart(2, '0')}-${selectedDate.day.toString().padStart(2, '0')}`;
        
        // CRITICAL FIX: Ensure customer exists before creating transactions
        console.log('Checking if customer exists:', customerName.trim());
        let actualCustomerId = customerId;
        
        if (!actualCustomerId || actualCustomerId === '') {
          try {
            // Search for existing customer by name
            const existingCustomers = await searchCustomers(customerName.trim());
            const existingCustomer = existingCustomers.find(c => 
              c.name.toLowerCase() === customerName.trim().toLowerCase()
            );
            
            if (existingCustomer) {
              console.log('Found existing customer:', existingCustomer.id);
              actualCustomerId = existingCustomer.id;
            } else {
              // Create new customer
              console.log('Creating new customer for transaction...');
              const newCustomer = await addCustomer({
                name: customerName.trim(),
                phone: customerPhone || null,
                customer_type: 'supplier' as 'customer' | 'supplier' // Received transactions typically from suppliers
              });
              actualCustomerId = newCustomer.data?.id || '';
              console.log('Created new customer with ID:', actualCustomerId);
            }
          } catch (customerError) {
            console.error('Error handling customer:', customerError);
            // If customer creation fails, we'll still proceed with the transaction
            // but log the error for debugging
            console.warn('Proceeding with transaction creation without customer link due to error:', customerError);
          }
        }
        
        // Save each entry as a separate transaction
        for (const entry of formData.entries) {
          const transactionData = {
            user_id: user.id,
            customer_id: actualCustomerId, // Use the ensured customer ID
            customer_name: customerName,
            amount: parseFloat(entry.amount),
            transaction_type: 'received' as const,
            description: entry.description || null,
            transaction_date: bsDateString,
            balance_after: 0, // Will be calculated by the helper function
          };
          
          try {
            const result = await firestoreHelpers.addTransactionEntry(transactionData);
            console.log('Transaction added successfully:', result.data);
          } catch (error) {
            console.error('Error saving receive entry:', error);
            Alert.alert(t('error'), t('failedToSaveEntry'));
            return;
          }
        }
        
        console.log('Receive entry saved successfully');
        // Set transaction activity flag for dashboard smart refresh
        (globalThis as any).__lastTransactionActivity = Date.now();
        // CRITICAL FIX: Invalidate customer cache since transaction was modified
        delete (globalThis as any).__customerSummariesCache;
        // Clear customer detail cache to force fresh data
        delete (globalThis as any).__customerDetailCache;
        // Flag dashboard to refresh data when focused (for case when not coming from customer detail)
        (globalThis as any).__needsDataRefresh = true;
        
        // REAL-TIME UPDATE: Immediately update both dashboard and customer detail page data
        try {
          // Get fresh transaction data
          const freshTransactions = await getAllTransactionEntries();
          
          // Update global transaction cache for immediate dashboard updates
          (globalThis as any).__latestTransactionData = {
            transactions: freshTransactions,
            updatedAt: Date.now()
          };
          
          // If we have a customer detail page open, update its data immediately
          if (customerName && (globalThis as any).__customerDetailInstance) {
            const customerTransactions = freshTransactions.filter(entry => 
              entry.customer_name && entry.customer_name.toLowerCase() === customerName.toLowerCase()
            );
            (globalThis as any).__customerDetailInstance.updateTransactions(customerTransactions);
          }
        } catch (error) {
          console.error('Error updating real-time data:', error);
        }
        // Return to customer statement page if we came from there
        if (customerName) {
          router.replace({
            pathname: '/(tabs)/(home)/customer-detail',
            params: { customerName }
          });
        } else {
          router.replace('/(tabs)/(home)/dashboard');
        }
      }
      
    } catch (error) {
      console.error('Error saving receive entry:', error);
      Alert.alert(t('error'), t('failedToSaveEntry'));
    } finally {
      setIsLoading(false);
    }
  };
  

  
  const handleEntryChange = (entryId: string, field: 'amount' | 'description', value: string) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.map(entry => 
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    }));
    
    if (errors.entries?.[entryId]?.[field]) {
      setErrors(prev => ({
        ...prev,
        entries: {
          ...prev.entries,
          [entryId]: {
            ...prev.entries?.[entryId],
            [field]: undefined
          }
        }
      }));
    }
  };
  
  const addNewEntry = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newEntry: EntryItem = {
      id: Date.now().toString(),
      amount: '',
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, newEntry]
    }));
  };
  
  const removeEntry = (entryId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (formData.entries.length > 1) {
      setFormData(prev => ({
        ...prev,
        entries: prev.entries.filter(entry => entry.id !== entryId)
      }));
      
      // Remove errors for this entry
      if (errors.entries?.[entryId]) {
        setErrors(prev => {
          const newEntries = { ...prev.entries };
          delete newEntries[entryId];
          return {
            ...prev,
            entries: newEntries
          };
        });
      }
    }
  };
  
  const handleDeleteEntry = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!isEditMode || !editTransactionId) {
      return;
    }
    
    Alert.alert(
      t('deleteEntry'),
      t('deleteEntryConfirm'),
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('deleteEntry'),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await deleteTransactionEntry(editTransactionId);
              console.log('Transaction entry deleted successfully');
              Alert.alert(t('success'), t('entryDeletedSuccessfully'), [
                {
                  text: t('ok'),
                  onPress: () => {
                    // Set transaction activity flag for dashboard smart refresh
                    (globalThis as any).__lastTransactionActivity = Date.now();
                    // Navigate back to dashboard to refresh customer list
                    router.replace('/(tabs)/(home)/dashboard');
                  }
                }
              ]);
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert(t('error'), t('failedToDeleteEntry'));
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const handleGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Android-specific: Use InteractionManager for smooth back navigation
    if (Platform.OS === 'android') {
      InteractionManager.runAfterInteractions(() => {
        if (customerName) {
          router.back(); // Use back navigation to return to customer detail
        } else {
          router.replace('/(tabs)/(home)/dashboard');
        }
      });
    } else {
      // iOS: Direct navigation
      if (customerName) {
        router.back(); // Use back navigation to return to customer detail
      } else {
        router.replace('/(tabs)/(home)/dashboard');
      }
    }
  };
  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          // CRITICAL: Android background to prevent white flash during navigation
          contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
          cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
        }} 
      />

      {/* Modern Clean Header Design - Moved to Top */}
      <View style={[styles.modernHeader, { 
        paddingTop: Platform.OS === 'ios' ? insets.top + 20 : insets.top + 40, // Increased padding for Android camera area
        marginTop: Platform.OS === 'android' ? -insets.top : 0, // Negative margin to extend behind status bar on Android
      }]}>
        {/* Green Gradient Background */}
        <LinearGradient
          colors={['#059669', '#047857']}
          style={styles.modernHeaderBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        
        {/* Geometric Pattern */}
        <View style={styles.geometricPattern}>
          <View style={styles.diamond1} />
          <View style={styles.diamond2} />
          <View style={styles.diamond3} />
        </View>
        
        {/* Header Content with Card Design */}
        <View style={styles.modernHeaderContent}>
          <View style={styles.headerCard}>
            <TouchableOpacity 
              style={styles.headerIconContainer}
              onPress={() => {
                // INSTANT haptic feedback for maximum responsiveness
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                handleGoBack();
              }}
              activeOpacity={0.2}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
              delayPressIn={0}
              delayPressOut={0}
            >
              <ArrowLeft size={24} color="#059669" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.modernHeaderTitle}>{isEditMode ? t('editReceiveEntry') : t('addReceiveEntry')}</Text>
              <Text style={styles.modernHeaderSubtitle}>{isEditMode ? `${t('editAmountToReceive')} ${customerName}` : `${t('recordAmountToReceive')} ${customerName}`}</Text>
              <Text style={styles.nepaliDateText}>
                {(() => {
                  const monthName = BS_MONTHS[selectedDate.month - 1];
                  return `${selectedDate.day.toString().padStart(2, '0')} ${monthName} ${selectedDate.year}`;
                })()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <SafeAreaView style={[styles.content, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
          {/* Main Form Card */}
          <View style={[styles.formCard, { backgroundColor: theme.colors.background }]}>
            {/* Multiple Entries Section */}
            {formData.entries.map((entry, index) => (
              <View key={entry.id}>
                {index > 0 && <View style={[styles.divider, { backgroundColor: theme.colors.border || '#E2E8F0' }]} />}
                
                <View style={styles.sectionContainer}>
                  {/* Entry Header with Remove Button */}
                  <View style={styles.entryHeader}>
                    <Text style={[styles.entryTitle, { color: theme.colors.text }]}>{t('entry')} {index + 1}</Text>
                    {formData.entries.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeEntry(entry.id)}
                        style={styles.removeEntryButton}
                      >
                        <X size={20} color="#059669" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Amount Input */}
                  <View style={styles.modernInputGroup}>
                    <AmountInput
                      value={entry.amount}
                      onChangeText={(text) => handleEntryChange(entry.id, 'amount', text)}
                      label={t('amountToReceive')}
                      placeholder="0.00"
                      error={errors.entries?.[entry.id]?.amount}
                    />
                  </View>
                  
                  {/* Date Input */}
                  <View style={styles.modernInputGroup}>
                    <DatePicker
                      value={selectedDate}
                      onChange={setSelectedDate}
                      label={t('transactionDate')}
                    />
                  </View>
                  
                  {/* Description Input */}
                  <View style={styles.modernInputGroup}>
                    <Text style={[styles.modernLabel, { color: theme.colors.text }]}>{t('descriptionItemsNotes')}</Text>
                    <TextInputWithDoneBar
                      style={[
                        styles.modernTextInput,
                        {
                          borderColor: errors.entries?.[entry.id]?.description ? theme.colors.error : '#E2E8F0',
                          backgroundColor: theme.colors.inputBackground || theme.colors.background,
                          color: theme.colors.text
                        }
                      ]}
                      value={entry.description}
                      onChangeText={(text) => handleEntryChange(entry.id, 'description', text)}
                      placeholder={t('enterItemDetails')}
                      placeholderTextColor={theme.colors.textSecondary || '#94A3B8'}
                    />
                    {errors.entries?.[entry.id]?.description ? (
                      <Text style={[styles.modernErrorText, { color: theme.colors.error }]}>
                        {errors.entries[entry.id].description}
                      </Text>
                    ) : null}
                  </View>
                  
                  {/* Customer Name Field - Non-editable */}
                  <View style={styles.modernInputGroup}>
                    <Text style={[styles.modernLabel, { color: theme.colors.text }]}>{t('customerName')}</Text>
                    <TextInputWithDoneBar
                      style={[
                        styles.modernTextInput,
                        styles.lockedInput,
                        {
                          borderColor: '#E2E8F0',
                          backgroundColor: theme.colors.background,
                          color: '#6B7280'
                        }
                      ]}
                      value={customerName}
                      editable={false}
                      placeholder={t('customerName')}
                      placeholderTextColor={theme.colors.textSecondary || '#94A3B8'}
                    />
                    <Text style={styles.lockedFieldNote}>{t('thisFieldCannotBeChanged')}</Text>
                  </View>
                </View>
              </View>
            ))}
            
            {/* Add New Entry Button */}
            {!isEditMode && (
              <View style={styles.sectionContainer}>
                <TouchableOpacity
                  onPress={addNewEntry}
                  style={styles.addEntryButton}
                >
                  <Plus size={20} color="#059669" />
                  <Text style={[styles.addEntryText, { color: '#059669' }]}>{t('addAnotherEntry')}</Text>
                </TouchableOpacity>
              </View>
            )}


          </View>

          </ScrollView>
          
          {/* Fixed Action Button Card - Outside ScrollView */}
          <View style={[styles.fixedActionCard, { backgroundColor: theme.colors.background }]}>
            <TouchableOpacity
              style={[
                styles.modernSaveButton,
                {
                  backgroundColor: '#059669',
                  opacity: isLoading ? 0.7 : 1
                }
              ]}
              onPress={handleSaveEntry}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#059669', '#047857']}
                style={styles.saveButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Save size={20} color="white" style={styles.saveIcon} />
                <Text style={styles.modernSaveButtonText}>
                  {isLoading ? (isEditMode ? t('updatingEntry') : t('savingEntries')) : (isEditMode ? t('updateEntry') : `${t('saveEntries')} ${formData.entries.length}`)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            {/* Delete Button - Only show in edit mode */}
            {isEditMode && (
              <TouchableOpacity
                style={[
                  styles.modernDeleteButton,
                  {
                    opacity: isLoading ? 0.7 : 1
                  }
                ]}
                onPress={handleDeleteEntry}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#DC2626', '#B91C1C']}
                  style={styles.deleteButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Trash2 size={20} color="white" style={styles.deleteIcon} />
                  <Text style={styles.modernDeleteButtonText}>
                    {t('deleteEntry')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#059669', // Green theme for receive entries
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 8,
    paddingBottom: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  
  // Modern Clean Header Styles
  modernHeader: {
    position: 'relative',
    paddingBottom: 12,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  modernHeaderBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  geometricPattern: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 120,
    height: 120,
    opacity: 0.1,
  },
  diamond1: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 20,
    height: 20,
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
  },
  diamond2: {
    position: 'absolute',
    top: 50,
    right: 50,
    width: 16,
    height: 16,
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
  },
  diamond3: {
    position: 'absolute',
    top: 80,
    right: 80,
    width: 12,
    height: 12,
    backgroundColor: 'white',
    transform: [{ rotate: '45deg' }],
  },
  modernHeaderContent: {
    paddingTop: 8,
    paddingBottom: 4,
  },

  headerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  modernHeaderTitle: {
    fontSize: Platform.OS === 'android' ? 18 : 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
    letterSpacing: 0.1,
  },
  modernHeaderSubtitle: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    color: '#374151',
    fontWeight: '500',
    lineHeight: Platform.OS === 'android' ? 18 : 22,
  },
  nepaliDateText: {
    fontSize: Platform.OS === 'android' ? 12 : 14,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  // Modern Form Card Styles
  formCard: {
    borderRadius: 16,
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionContainer: {
    padding: 8,
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
    opacity: 0.3,
  },
  modernInputGroup: {
    marginBottom: 8,
  },
  modernLabel: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.1,
  },
  modernTextInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'android' ? 12 : 14,
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: '500',
  },
  modernMultilineInput: {
    minHeight: 48,
    paddingTop: 14,
  },
  modernErrorText: {
    fontSize: Platform.OS === 'android' ? 12 : 14,
    marginTop: 4,
    fontWeight: '500',
    marginLeft: 4,
  },
  lockedInput: {
    opacity: 0.7,
  },
  lockedFieldNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 4,
  },
  fixedActionCard: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modernSaveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modernSaveButtonText: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.3,
  },
  saveIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  modernDeleteButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#DC2626',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginTop: 12,
  },
  deleteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modernDeleteButtonText: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.3,
  },
  deleteIcon: {
    marginRight: 8,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryTitle: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  removeEntryButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#059669',
    borderStyle: 'dashed',
    backgroundColor: '#F0FDF4',
  },
  addEntryText: {
    fontSize: Platform.OS === 'android' ? 14 : 16,
    fontWeight: '500',
    marginLeft: 8,
    letterSpacing: 0.1,
  },
});
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Alert, SafeAreaView, KeyboardAvoidingView, InteractionManager } from 'react-native';
import TextInputWithDoneBar from '@/components/TextInputWithDoneBar';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, TrendingUp, Trash2, Plus, X } from 'lucide-react-native';
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

export default function EditGiveEntryScreen() {
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
  
  const isEditMode = true; // This is always edit mode for this page

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
    console.log('Edit Give Entry screen loaded for customer:', customerName);
    console.log('Edit mode data:', { editTransactionId, editAmount, editDescription, editDate });
  }, [customerName, editTransactionId, editAmount, editDescription, editDate]);
  
  const validateForm = (): boolean => {
    const newErrors: {
      entries?: { [key: string]: { amount?: string; description?: string } };
    } = {};
    let isValid = true;

    // Validate entries
    formData.entries.forEach((entry, index) => {
      if (!entry.amount.trim()) {
        if (!newErrors.entries) newErrors.entries = {};
        if (!newErrors.entries[index]) newErrors.entries[index] = {};
        newErrors.entries[index].amount = t('amountRequired');
        isValid = false;
      } else {
        const numericAmount = parseFloat(entry.amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
          if (!newErrors.entries) newErrors.entries = {};
          if (!newErrors.entries[index]) newErrors.entries[index] = {};
          newErrors.entries[index].amount = t('validAmountRequired');
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };
  
  const handleSaveEntry = async () => {
    if (!validateForm()) {
      // INSTANT haptic feedback for validation error
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
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
          'given',
          firstEntry.description || undefined
        );
        
        console.log('Give entry updated successfully');
        // Set transaction activity flag for dashboard smart refresh
        (globalThis as any).__lastTransactionActivity = Date.now();
        // CRITICAL FIX: Invalidate customer cache since transaction was modified
        (globalThis as any).__customerCacheLastInvalidated = Date.now();
      } else {
        // Add new transaction entries
        for (const entry of formData.entries) {
          const amount = parseFloat(entry.amount);
          const description = entry.description.trim() || undefined;
          
          console.log('Processing give entry:', { amount, description, customerName, customerId });
          
          // Call addTransactionEntry directly to bypass context middleware overhead
          await firestoreHelpers.addTransactionEntry(
            amount,
            'given',
            customerName,
            customerId,
            description,
            selectedDate
          );
        }
        
        console.log('All give entries added successfully');
        // Set transaction activity flag for dashboard smart refresh
        (globalThis as any).__lastTransactionActivity = Date.now();
        // CRITICAL FIX: Invalidate customer cache since new transaction was added
        (globalThis as any).__customerCacheLastInvalidated = Date.now();
      }
      
      // INSTANT SUCCESS haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Navigate back to customer detail page with updated data
      const editParams = {
        customerName,
        customerPhone,
        ...(customerId && { customerId })
      };
      
      // INSTANT performance improvement: Wait for interactions to complete on Android
      if (Platform.OS === 'android') {
        InteractionManager.runAfterInteractions(() => {
          router.push({
            pathname: '/customer-detail' as any,
            params: editParams
          });
        });
      } else {
        router.push({
          pathname: '/customer-detail' as any,
          params: editParams
        });
      }
      
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
        // Don't block navigation for this secondary operation
      }
      
    } catch (error) {
      console.error('Error saving give entry:', error);
      
      // INSTANT ERROR haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      Alert.alert(
        t('error'),
        t('failedToSaveEntry'),
        [{ text: t('ok') }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!isEditMode || !editTransactionId) return;
    
    Alert.alert(
      t('confirmDelete'),
      t('deleteEntryConfirmation'),
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            
            try {
              await deleteTransactionEntry(editTransactionId);
              
              console.log('Give entry deleted successfully');
              // Set transaction activity flag for dashboard smart refresh
              (globalThis as any).__lastTransactionActivity = Date.now();
              // CRITICAL FIX: Invalidate customer cache since transaction was deleted
              (globalThis as any).__customerCacheLastInvalidated = Date.now();
              
              // INSTANT SUCCESS haptic feedback
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              
              // Navigate back to customer detail page
              const editParams = {
                customerName,
                customerPhone,
                ...(customerId && { customerId })
              };
              
              router.push({
                pathname: '/customer-detail' as any,
                params: editParams
              });
              
              // Flag dashboard to refresh data when focused
              (globalThis as any).__needsDataRefresh = true;
              
            } catch (error) {
              console.error('Error deleting give entry:', error);
              
              // INSTANT ERROR haptic feedback
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              
              Alert.alert(
                t('error'),
                t('failedToDeleteEntry'),
                [{ text: t('ok') }]
              );
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const addEntry = () => {
    const newEntry: EntryItem = {
      id: (formData.entries.length + 1).toString(),
      amount: '',
      description: ''
    };
    
    setFormData(prev => ({
      ...prev,
      entries: [...prev.entries, newEntry]
    }));
    
    // INSTANT haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removeEntry = (entryId: string) => {
    if (formData.entries.length <= 1) return; // Don't allow removing the last entry
    
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.filter(entry => entry.id !== entryId)
    }));
    
    // Clear any errors for removed entries
    setErrors(prev => {
      const newErrors = { ...prev };
      if (newErrors.entries) {
        const entryIndex = formData.entries.findIndex(entry => entry.id === entryId);
        if (entryIndex !== -1) {
          delete newErrors.entries[entryIndex];
        }
      }
      return newErrors;
    });
    
    // INSTANT haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const updateEntry = (entryId: string, field: keyof EntryItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      entries: prev.entries.map(entry =>
        entry.id === entryId ? { ...entry, [field]: value } : entry
      )
    }));
    
    // Clear specific field error when user starts typing
    const entryIndex = formData.entries.findIndex(entry => entry.id === entryId);
    if (entryIndex !== -1 && errors.entries?.[entryIndex]?.[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors.entries?.[entryIndex]) {
          delete newErrors.entries[entryIndex][field];
          
          // If no more errors for this entry, remove the entry from errors
          if (Object.keys(newErrors.entries[entryIndex]).length === 0) {
            delete newErrors.entries[entryIndex];
          }
          
          // If no more entry errors, remove entries from errors
          if (Object.keys(newErrors.entries).length === 0) {
            delete newErrors.entries;
          }
        }
        return newErrors;
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen 
        options={{
          headerShown: false,
          gestureEnabled: Platform.OS === 'ios',
          animation: Platform.OS === 'ios' ? 'slide_from_right' : 'none'
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header with back button */}
        <LinearGradient
          colors={['#DC2626', '#B91C1C']}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                // INSTANT haptic feedback for maximum responsiveness
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
                router.back();
              }}
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
              delayPressIn={0}
              delayPressOut={0}
            >
              <ArrowLeft size={24} color="white" strokeWidth={2.5} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>
                {isEditMode ? t('editGiveEntry') : t('addGiveEntry')}
              </Text>
              <Text style={styles.headerSubtitle}>{customerName}</Text>
            </View>
            
            <View style={styles.headerRightSpace} />
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Date Picker */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {t('transactionDate')}
            </Text>
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              theme={theme}
              disabled={isEditMode} // Disable date editing in edit mode
            />
          </View>

          {/* Entries Section */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {isEditMode ? t('editEntryDetails') : t('entryDetails')}
              </Text>
              {!isEditMode && (
                <TouchableOpacity
                  style={styles.addEntryButton}
                  onPress={addEntry}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Plus size={20} color="#DC2626" strokeWidth={2.5} />
                  <Text style={[styles.addEntryText, { color: '#DC2626' }]}>{t('addAnotherEntry')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {formData.entries.map((entry, index) => (
              <View key={entry.id} style={styles.entryContainer}>
                {!isEditMode && formData.entries.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeEntryButton}
                    onPress={() => removeEntry(entry.id)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={18} color="#EF4444" strokeWidth={2.5} />
                  </TouchableOpacity>
                )}
                
                <View style={styles.entryContent}>
                  <View style={styles.entryRow}>
                    <View style={styles.amountContainer}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                        {t('amount')} *
                      </Text>
                      <AmountInput
                        value={entry.amount}
                        onChangeText={(value) => updateEntry(entry.id, 'amount', value)}
                        placeholder={t('enterAmount')}
                        error={errors.entries?.[index]?.amount}
                        theme={theme}
                      />
                    </View>
                  </View>

                  <View style={styles.entryRow}>
                    <View style={styles.descriptionContainer}>
                      <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                        {t('description')} ({t('optional')})
                      </Text>
                      <TextInputWithDoneBar
                        style={[
                          styles.descriptionInput,
                          {
                            backgroundColor: theme.colors.background,
                            color: theme.colors.text,
                            borderColor: errors.entries?.[index]?.description ? '#EF4444' : theme.colors.border
                          }
                        ]}
                        value={entry.description}
                        onChangeText={(value) => updateEntry(entry.id, 'description', value)}
                        placeholder={t('enterDescription')}
                        placeholderTextColor={theme.colors.textSecondary}
                        multiline
                        numberOfLines={2}
                        textAlignVertical="top"
                      />
                      {errors.entries?.[index]?.description && (
                        <Text style={styles.errorText}>{errors.entries[index].description}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {!isEditMode && (
              <View style={styles.addEntryButtonContainer}>
                <TouchableOpacity
                  style={styles.addEntryButton}
                  onPress={addEntry}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Plus size={20} color="#DC2626" strokeWidth={2.5} />
                  <Text style={[styles.addEntryText, { color: '#DC2626' }]}>{t('addAnotherEntry')}</Text>
                </TouchableOpacity>
              </View>
            )}


          </View>

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Action Buttons - Replace Tab Bar */}
        <View style={[styles.actionButtonsContainer, { 
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom + 5, 15) : Math.max(insets.bottom + 10, 25)
        }]}>
          {/* DELETE button first (left side) */}
          {isEditMode && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={handleDeleteEntry}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Trash2 size={20} color="white" strokeWidth={2.5} />
                <Text style={styles.actionButtonText}>{t('delete')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* UPDATE button second (right side) */}
          <TouchableOpacity 
            style={[styles.actionButton, styles.saveButton, !isEditMode && { flex: 1 }]}
            onPress={handleSaveEntry}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Save size={20} color="white" strokeWidth={2.5} />
              <Text style={styles.actionButtonText}>{isEditMode ? t('update') : t('save')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerRightSpace: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Space for action buttons
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    marginBottom: 12,
  },
  entryContainer: {
    position: 'relative',
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  removeEntryButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  entryContent: {
    paddingRight: 30,
  },
  entryRow: {
    marginBottom: 16,
  },
  amountContainer: {
    flex: 1,
  },
  descriptionContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 60,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  addEntryButtonContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  addEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  addEntryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },

  // Action Buttons Styles - Replace Tab Bar
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', // White background like home page
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)', // Subtle border for white background
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8, // Add elevation for Android
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
  saveButton: {
    // Specific styles for save button if needed
  },
  deleteButton: {
    // Specific styles for delete button if needed
  },
});

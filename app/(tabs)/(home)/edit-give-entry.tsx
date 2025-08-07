import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Alert, SafeAreaView, KeyboardAvoidingView } from 'react-native';
import TextInputWithDoneBar from '@/components/TextInputWithDoneBar';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save, TrendingUp, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactionEntries } from '@/contexts/TransactionEntriesContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AmountInput from '@/components/AmountInput';
import DatePicker from '@/components/DatePicker';
import { BSDate } from '@/utils/date-utils';
import { getAccurateCurrentBSDate } from '@/utils/current-date-utils';
import { BS_MONTHS } from '@/constants/calendar';

export default function EditGiveEntryScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { updateTransactionEntry, deleteTransactionEntry, setFirebaseUser, getAllTransactionEntries } = useTransactionEntries();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const customerName = params.customerName as string || '';
  const customerPhone = params.customerPhone as string || '';
  const editTransactionId = params.editTransactionId as string || '';
  const editAmount = params.editAmount as string || '';
  const editDescription = params.editDescription as string || '';
  const editDate = params.editDate as string || '';
  
  // Initialize date from edit mode or current date
  const initializeDate = (): BSDate => {
    if (editDate) {
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
    itemDescription: string;
    amount: string;
  }>({
    itemDescription: editDescription || '',
    amount: editAmount || ''
  });
  
  const [errors, setErrors] = useState<{
    amount?: string;
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
    const newErrors: typeof errors = {};
    
    if (!formData.amount.trim()) {
      newErrors.amount = t('amountIsRequired');
    } else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = t('pleaseEnterValidAmount');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleUpdateEntry = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!validateForm()) {
      return;
    }
    
    if (!user || !editTransactionId) {
      Alert.alert(t('error'), t('missingRequiredInformation'));
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Updating transaction with ID:', editTransactionId);
      console.log('Update data:', {
        amount: parseFloat(formData.amount),
        description: formData.itemDescription || undefined
      });
      
      // Convert selected date to BS date string format
      const bsDateString = `${selectedDate.year}-${selectedDate.month.toString().padStart(2, '0')}-${selectedDate.day.toString().padStart(2, '0')}`;
      
      console.log('=== UPDATING TRANSACTION WITH NEW DATE ===');
      console.log('Selected date:', selectedDate);
      console.log('BS date string:', bsDateString);
      console.log('Transaction ID:', editTransactionId);
      console.log('Amount:', parseFloat(formData.amount));
      console.log('Description:', formData.itemDescription);
      
      await updateTransactionEntry(
        editTransactionId,
        parseFloat(formData.amount),
        'given',
        formData.itemDescription || undefined,
        bsDateString
      );
      
      console.log('Give entry updated successfully');
      
      // Clear caches to force fresh data
      delete (globalThis as any).__customerSummariesCache;
      delete (globalThis as any).__customerDetailCache;
      // Flag dashboard to refresh data when focused
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
        if ((globalThis as any).__customerDetailInstance && formData.customerName) {
          const customerTransactions = freshTransactions.filter(entry => 
            entry.customer_name && entry.customer_name.toLowerCase() === formData.customerName.toLowerCase()
          );
          (globalThis as any).__customerDetailInstance.updateTransactions(customerTransactions);
        }
      } catch (error) {
        console.error('Error updating real-time data:', error);
      }
      
      // Navigate back to previous page (customer statement or dashboard)
      // Use router.back() to properly remove this edit page from the navigation stack
      router.back();
      
    } catch (error) {
      console.error('Error updating give entry:', error);
      const errorMessage = error instanceof Error ? error.message : t('failedToSaveEntry');
      Alert.alert(t('error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAmountChange = (text: string) => {
    setFormData(prev => ({ ...prev, amount: text }));
    if (errors.amount) {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };
  
  const handleDeleteEntry = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (!editTransactionId) {
      return;
    }
    
    const performDelete = async () => {
      setIsLoading(true);
      try {
        console.log('Deleting transaction with ID:', editTransactionId);
        await deleteTransactionEntry(editTransactionId);
        console.log('Transaction deleted successfully');
        
        // Clear caches to force fresh data
        delete (globalThis as any).__customerSummariesCache;
        delete (globalThis as any).__customerDetailCache;
        // Flag dashboard to refresh data when focused
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
          if ((globalThis as any).__customerDetailInstance && formData.customerName) {
            const customerTransactions = freshTransactions.filter(entry => 
              entry.customer_name && entry.customer_name.toLowerCase() === formData.customerName.toLowerCase()
            );
            (globalThis as any).__customerDetailInstance.updateTransactions(customerTransactions);
          }
        } catch (error) {
          console.error('Error updating real-time data:', error);
        }
        
        // Navigate back to previous page (customer statement or dashboard)
        // Use router.back() to properly remove this edit page from the navigation stack
        router.back();
      } catch (error) {
        console.error('Error deleting entry:', error);
        const errorMessage = error instanceof Error ? error.message : t('failedToDeleteEntry');
        Alert.alert(t('error'), errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Handle confirmation differently for web vs mobile
    if (Platform.OS === 'web') {
      // Use native confirm for web
      const confirmed = confirm(
        `${t('deleteEntryConfirm')}\n\nरु${parseFloat(formData.amount || '0').toLocaleString()}`
      );
      if (confirmed) {
        await performDelete();
      }
    } else {
      // Use Alert.alert for mobile
      Alert.alert(
        t('deleteEntry'),
        `${t('deleteEntryConfirm')}\n\nरु${parseFloat(formData.amount || '0').toLocaleString()}`,
        [
          {
            text: t('cancel'),
            style: 'cancel'
          },
          {
            text: t('deleteEntry'),
            style: 'destructive',
            onPress: performDelete
          }
        ]
      );
    }
  };

  const handleGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // If we have customerName, return to that customer's statement page
    // Otherwise, go to dashboard
    setTimeout(() => {
      if (customerName) {
        router.replace({
          pathname: '/(tabs)/(home)/customer-detail',
          params: { customerName }
        });
      } else {
        router.replace('/(tabs)/(home)/dashboard');
      }
    }, 100);
  };


  
  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: false
        }} 
      />

      {/* Modern Clean Header Design */}
      <View style={[styles.modernHeader, { 
        paddingTop: Platform.OS === 'ios' ? insets.top + 20 : insets.top + 40, // Increased padding for Android camera area
        marginTop: Platform.OS === 'android' ? -insets.top : 0, // Negative margin to extend behind status bar on Android
      }]}>
        {/* Red Gradient Background */}
        <LinearGradient
          colors={['#DC2626', '#B91C1C']}
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
              onPress={handleGoBack}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="#DC2626" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.modernHeaderTitle}>{t('editGiveEntry')}</Text>
              <Text style={styles.modernHeaderSubtitle}>{t('editAmountToGive')} {customerName}</Text>
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
            {/* Amount Section - First */}
            <View style={styles.sectionContainer}>
              <View style={styles.modernInputGroup}>
                <AmountInput
                  value={formData.amount}
                  onChangeText={handleAmountChange}
                  label={t('amountToGive')}
                  placeholder="0.00"
                  error={errors.amount}
                />
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border || '#E2E8F0' }]} />

            {/* Date Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.modernInputGroup}>
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  label={t('transactionDate')}
                />
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border || '#E2E8F0' }]} />

            {/* Items Description Section */}
            <View style={styles.sectionContainer}>
              <View style={styles.modernInputGroup}>
                <Text style={[styles.modernLabel, { color: theme.colors.text }]}>{t('descriptionItemsNotes')}</Text>
                                    <TextInputWithDoneBar
                  style={[
                    styles.modernTextInput,
                    {
                      borderColor: '#E2E8F0',
                      backgroundColor: theme.colors.inputBackground || theme.colors.background,
                      color: theme.colors.text
                    }
                  ]}
                  value={formData.itemDescription}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, itemDescription: text }))}
                  placeholder={t('enterItemDetails')}
                  placeholderTextColor={theme.colors.textSecondary || '#94A3B8'}
                />
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.colors.border || '#E2E8F0' }]} />

            {/* Customer Name Section - Last */}
            <View style={styles.sectionContainer}>
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

          </ScrollView>
          
          {/* Fixed Action Button Card - Outside ScrollView */}
          <View style={[styles.fixedActionCard, { backgroundColor: theme.colors.background }]}>
            {/* Action Buttons Row - Matching Screenshot */}
            <View style={styles.actionButtonsRow}>
              {/* Delete Button */}
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
              
              {/* Update Button */}
              <TouchableOpacity
                style={[
                  styles.modernUpdateButton,
                  {
                    opacity: isLoading ? 0.7 : 1
                  }
                ]}
                onPress={handleUpdateEntry}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#16A34A', '#15803D']}
                  style={styles.updateButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Save size={20} color="white" style={styles.updateIcon} />
                  <Text style={styles.modernUpdateButtonText}>
                    {isLoading ? t('updatingEntry') : t('updateEntry')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DC2626',
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
    backgroundColor: '#FEE2E2',
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
    color: '#DC2626',
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
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modernUpdateButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#16A34A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  updateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modernUpdateButtonText: {
    fontSize: Platform.OS === 'android' ? 16 : 18,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.3,
  },
  updateIcon: {
    marginRight: 8,
  },
  modernDeleteButton: {
    flex: 1,
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
});
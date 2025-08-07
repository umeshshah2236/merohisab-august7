import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Switch, Dimensions, TouchableWithoutFeedback, Keyboard, InteractionManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import AmountInput from '@/components/AmountInput';
import RateInput from '@/components/RateInput';
import DatePicker from '@/components/DatePicker';
import { BSDate, isValidBSDate, getDaysBetweenDates } from '@/utils/date-utils';
import { calculateCompoundInterest } from '@/utils/interest-utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getCurrentBSDateWithMidnightUpdate } from '@/utils/current-date-utils';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;
const isLargeScreen = width >= 414;

// Dynamic sizing based on screen size
const getResponsiveSize = (small: number, medium: number, large: number) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

export default function KarobarScreen() {
  const { t } = useLanguage();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  // Form state
  const [loanAmount, setLoanAmount] = useState('');
  const [loanDate, setLoanDate] = useState<BSDate>({ year: '2081', month: 1, day: 1 });
  const [interestRate, setInterestRate] = useState('');
  const [endDate, setEndDate] = useState<BSDate>(() => getCurrentBSDateWithMidnightUpdate());
  
  // Keep form data persistent when navigating back from results
  React.useEffect(() => {
    // This ensures form data is preserved when coming back from results
    console.log('Karobar screen focused - preserving form data');
  }, []);
  
  // Repayment state - support multiple repayments
  const [hasRepayment, setHasRepayment] = useState(false);
  const [repayments, setRepayments] = useState<Array<{
    id: string;
    amount: string;
    date: BSDate;
  }>>([{
    id: '1',
    amount: '',
    date: { year: '2081', month: 11, day: 1 }
  }]);
  
  // Validation state
  const [errors, setErrors] = useState<{
    loanAmount?: string;
    interestRate?: string;
    loanDate?: string;
    endDate?: string;
    repayments?: { [key: string]: { amount?: string; date?: string } };
  }>({});
  
  // Get current BS date using Nepal timezone logic
  const getCurrentBSDate = (): BSDate => {
    return getCurrentBSDateWithMidnightUpdate();
  };
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: {
      loanAmount?: string;
      interestRate?: string;
      loanDate?: string;
      endDate?: string;
      repayments?: { [key: string]: { amount?: string; date?: string } };
    } = {};
    
    // Validate loan amount
    if (!loanAmount || parseFloat(loanAmount) <= 0) {
      newErrors.loanAmount = t('enterValidAmount');
    }
    
    // Validate interest rate
    if (!interestRate || parseFloat(interestRate) <= 0) {
      newErrors.interestRate = t('enterValidRate');
    }
    
    // Validate loan date
    if (!isValidBSDate(loanDate)) {
      newErrors.loanDate = t('invalidLoanDate');
    }
    
    // Validate that loan date is not in the future
    const currentDate = getCurrentBSDate();
    if (isValidBSDate(loanDate) && isValidBSDate(currentDate)) {
      const daysDiff = getDaysBetweenDates(loanDate, currentDate);
      if (daysDiff < 0) {
        newErrors.loanDate = t('loanDateFuture');
      }
    }
    
    // Validate end date
    if (!isValidBSDate(endDate)) {
      newErrors.endDate = t('invalidEndDate');
    }
    
    // Validate that end date is after loan date
    if (isValidBSDate(loanDate) && isValidBSDate(endDate)) {
      const daysDiff = getDaysBetweenDates(loanDate, endDate);
      if (daysDiff < 0) {
        newErrors.endDate = t('endDateAfterLoan');
      }
    }
    
    // Validate repayment fields if repayment is enabled
    if (hasRepayment) {
      const repaymentErrors: { [key: string]: { amount?: string; date?: string } } = {};
      let totalRepaymentAmount = 0;
      
      repayments.forEach((repayment) => {
        const repaymentError: { amount?: string; date?: string } = {};
        
        // Validate repayment amount
        if (!repayment.amount || parseFloat(repayment.amount) <= 0) {
          repaymentError.amount = t('enterValidRepaymentAmount');
        } else {
          totalRepaymentAmount += parseFloat(repayment.amount);
        }
        
        // Validate repayment date
        if (!isValidBSDate(repayment.date)) {
          repaymentError.date = t('invalidRepaymentDate');
        }
        
        // Validate repayment date is after loan date and not in future
        if (isValidBSDate(loanDate) && isValidBSDate(repayment.date)) {
          const loanToRepaymentDays = getDaysBetweenDates(loanDate, repayment.date);
          if (loanToRepaymentDays < 0) {
            repaymentError.date = t('repaymentDateAfterLoan');
          }
        }
        
        if (isValidBSDate(repayment.date) && isValidBSDate(currentDate)) {
          const repaymentToCurrentDays = getDaysBetweenDates(repayment.date, currentDate);
          if (repaymentToCurrentDays < 0) {
            repaymentError.date = t('repaymentDateFuture');
          }
        }
        
        if (Object.keys(repaymentError).length > 0) {
          repaymentErrors[repayment.id] = repaymentError;
        }
      });
      
      // Validate total repayment amount is not more than loan amount
      if (loanAmount && totalRepaymentAmount > parseFloat(loanAmount)) {
        repayments.forEach((repayment) => {
          if (!repaymentErrors[repayment.id]) {
            repaymentErrors[repayment.id] = {};
          }
          repaymentErrors[repayment.id].amount = t('totalRepaymentExceedsLoan');
        });
      }
      
      if (Object.keys(repaymentErrors).length > 0) {
        newErrors.repayments = repaymentErrors;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Calculate loan details using proper BS calendar and same logic as interest calculator
  const calculateLoan = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (!validateForm()) {
      return;
    }
    
    const principal = parseFloat(loanAmount);
    const monthlyRate = parseFloat(interestRate);
    
    // Calculate total amount due from loan date to end date (instead of current date)
    const totalResult = calculateCompoundInterest(
      principal,
      monthlyRate,
      loanDate,
      endDate
    );
    
    let repaymentInterestResult = null;
    let netBalance = totalResult.finalAmount;
    
    // If there are repayments, calculate interest on each repaid amount
    let totalRepaymentWithInterest = 0;
    const repaymentResults: any[] = [];
    
    if (hasRepayment && repayments.length > 0) {
      repayments.forEach((repayment, index) => {
        if (repayment.amount && parseFloat(repayment.amount) > 0) {
          const repaidAmount = parseFloat(repayment.amount);
          
          // Calculate interest on repaid amount from repayment date to end date
          const repaymentResult = calculateCompoundInterest(
            repaidAmount,
            monthlyRate,
            repayment.date,
            endDate
          );
          
          repaymentResults.push({
            index,
            ...repaymentResult,
            repaymentDate: repayment.date
          });
          
          totalRepaymentWithInterest += repaymentResult.finalAmount;
        }
      });
      
      // Net balance = total due - total repayments with interest
      netBalance = totalResult.finalAmount - totalRepaymentWithInterest;
    }
    
    // Navigate to results screen with detailed breakdown
    router.push({
      pathname: '/(tabs)/(home)/karobar/results',
      params: {
        personName: 'Loan Calculation', // Default name since person name is removed
        loanAmount: totalResult.principal.toString(),
        totalDays: totalResult.totalDays.toString(),
        years: totalResult.years.toString(),
        months: totalResult.months.toString(),
        days: totalResult.days.toString(),
        interestRate: monthlyRate.toString(),
        totalInterest: totalResult.totalInterest.toString(),
        finalAmount: totalResult.finalAmount.toString(),
        yearlyInterest: totalResult.yearlyInterest.toString(),
        monthlyInterest: totalResult.monthlyInterest.toString(),
        dailyInterest: totalResult.dailyInterest.toString(),
        loanDateYear: loanDate.year,
        loanDateMonth: loanDate.month.toString(),
        loanDateDay: loanDate.day.toString(),
        endDateYear: endDate.year,
        endDateMonth: endDate.month.toString(),
        endDateDay: endDate.day.toString(),
        // Repayment data
        hasRepayment: hasRepayment.toString(),
        repayments: hasRepayment ? JSON.stringify(repayments.filter(r => r.amount && parseFloat(r.amount) > 0)) : '[]',
        repaymentResults: hasRepayment ? JSON.stringify(repaymentResults) : '[]',
        totalRepaymentWithInterest: totalRepaymentWithInterest.toString(),
        netBalance: netBalance.toString(),
      }
    });
  };
  
  // Reset form
  const resetForm = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setLoanAmount('');
    setLoanDate({ year: '2081', month: 1, day: 1 });
    setInterestRate('');
    setEndDate(getCurrentBSDateWithMidnightUpdate());
    setHasRepayment(false);
    setRepayments([{
      id: '1',
      amount: '',
      date: { year: '2081', month: 11, day: 1 }
    }]);
    setErrors({});
  };

  const handleGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Android-specific: Use InteractionManager for smooth back navigation
    if (Platform.OS === 'android') {
      InteractionManager.runAfterInteractions(() => {
        router.back();
      });
    } else {
      // iOS: Direct back navigation
      router.back();
    }
  };

  // Responsive header padding with proper back button alignment
  const headerPaddingTop = Math.max(insets.top + getResponsiveSize(4, 8, 12), 42);
  const headerPaddingBottom = getResponsiveSize(16, 20, 24);
  const headerPaddingHorizontal = getResponsiveSize(16, 20, 24);
  
  // Responsive back button sizing
  const backButtonSize = getResponsiveSize(44, 48, 52);
  const backIconSize = getResponsiveSize(22, 24, 26);

  // Add new repayment entry
  const addRepayment = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (repayments.length < 10) {
      const newId = (repayments.length + 1).toString();
      setRepayments([...repayments, {
        id: newId,
        amount: '',
        date: { year: '2081', month: 11, day: 1 }
      }]);
    }
  };
  
  // Remove repayment entry
  const removeRepayment = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (repayments.length > 1) {
      setRepayments(repayments.filter(r => r.id !== id));
      
      // Clear errors for removed repayment
      if (errors.repayments && errors.repayments[id]) {
        const newRepaymentErrors = { ...errors.repayments };
        delete newRepaymentErrors[id];
        setErrors({ ...errors, repayments: newRepaymentErrors });
      }
    }
  };
  
  // Update repayment amount
  const updateRepaymentAmount = (id: string, amount: string) => {
    setRepayments(repayments.map(r => 
      r.id === id ? { ...r, amount } : r
    ));
  };
  
  // Update repayment date
  const updateRepaymentDate = (id: string, date: BSDate) => {
    setRepayments(repayments.map(r => 
      r.id === id ? { ...r, date } : r
    ));
  };

  const RepaymentToggle = () => (
    <View style={[styles.repaymentToggleContainer, {
      marginBottom: getResponsiveSize(16, 20, 24),
    }]}>
      <Text style={[styles.sectionLabel, { 
        color: theme.colors.text,
        fontSize: Platform.OS === 'android' ? 18 : 20,
        fontWeight: '600',
        letterSpacing: 0.3,
      }]}>
        {t('partialRepayment')}
      </Text>
      <View style={[styles.toggleRow, {
        paddingVertical: getResponsiveSize(6, 8, 10),
      }]}>
        <Text style={[styles.toggleLabel, { 
          color: theme.colors.text,
          fontSize: Platform.OS === 'android' ? 16 : 18,
          fontWeight: '500',
          letterSpacing: 0.3,
        }]}>
          {t('hasRepayment')}
        </Text>
        <Switch
          value={hasRepayment}
          onValueChange={setHasRepayment}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
          thumbColor={hasRepayment ? theme.colors.primary : theme.colors.textSecondary}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.contentContainer}>
        <LinearGradient
          colors={['#1e40af', '#3b82f6']}
          style={[styles.header, { 
            paddingTop: headerPaddingTop,
            paddingBottom: headerPaddingBottom,
            paddingHorizontal: headerPaddingHorizontal,
          }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={[styles.backButton, {
                width: backButtonSize,
                height: backButtonSize,
                left: getResponsiveSize(0, 4, 8),
              }]}
              onPress={handleGoBack}
              activeOpacity={0.7}
            >
              <View style={[styles.backButtonBackground, {
                width: backButtonSize,
                height: backButtonSize,
                borderRadius: getResponsiveSize(12, 14, 16),
              }]}>
                <ArrowLeft size={backIconSize} color="white" strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
            
            <View style={[styles.titleSection, {
              paddingLeft: backButtonSize + getResponsiveSize(8, 12, 16),
            }]}>
              <Text style={[styles.mainTitle, {
                fontSize: Platform.OS === 'android' ? 22 : 26,
                fontWeight: '700',
                letterSpacing: 0.3,
              }]}>
                {t('karobar')}
              </Text>
              

            </View>
          </View>
        </LinearGradient>
        
        <View style={[styles.formContainer, { 
          backgroundColor: theme.colors.background,
          paddingHorizontal: getResponsiveSize(16, 20, 24),
          paddingTop: getResponsiveSize(4, 6, 8),
        }]}>
          <View style={[styles.inputWrapper, {
            marginBottom: getResponsiveSize(8, 12, 16),
          }]}>
            <Text style={[styles.sectionLabel, { 
              color: theme.colors.text,
              fontSize: Platform.OS === 'android' ? 18 : 20,
              fontWeight: '600',
              letterSpacing: 0.3,
            }]}>
              {t('loanAmount')}
            </Text>
            <View style={styles.amountInputWrapper}>
              <AmountInput
                label=""
                value={loanAmount}
                onChangeText={setLoanAmount}
                placeholder="50000"
                error={errors.loanAmount}
              />
            </View>
          </View>
          
          <View style={[styles.inputWrapper, {
            marginBottom: getResponsiveSize(8, 12, 16),
          }]}>
            <Text style={[styles.sectionLabel, { 
              color: theme.colors.text,
              fontSize: Platform.OS === 'android' ? 18 : 20,
              fontWeight: '600',
              letterSpacing: 0.3,
            }]}>
              {t('loanDate')}
            </Text>
            <View style={styles.dateInputWrapper}>
              <DatePicker
                label=""
                value={loanDate}
                onChange={setLoanDate}
                error={errors.loanDate}
              />
            </View>
          </View>
          
          <View style={[styles.inputWrapper, {
            marginBottom: getResponsiveSize(8, 12, 16),
          }]}>
            <Text style={[styles.sectionLabel, { 
              color: theme.colors.text,
              fontSize: Platform.OS === 'android' ? 18 : 20,
              fontWeight: '600',
              letterSpacing: 0.3,
            }]}>
              {t('monthlyInterestRate')}
            </Text>
            <View style={styles.rateInputWrapper}>
              <RateInput
                label=""
                value={interestRate}
                onChangeText={setInterestRate}
                placeholder="2.0"
                error={errors.interestRate}
              />
            </View>
          </View>
          
          <View style={[styles.inputWrapper, {
            marginBottom: getResponsiveSize(8, 12, 16),
          }]}>
            <Text style={[styles.sectionLabel, { 
              color: theme.colors.text,
              fontSize: Platform.OS === 'android' ? 18 : 20,
              fontWeight: '600',
              letterSpacing: 0.3,
            }]}>
              {t('endDate')} (BS)
            </Text>
            <View style={styles.dateInputWrapper}>
              <DatePicker
                label=""
                value={endDate}
                onChange={setEndDate}
                error={errors.endDate}
              />
            </View>
          </View>
          
          <RepaymentToggle />
          
          {hasRepayment && (
            <View style={[styles.repaymentSection, { 
              backgroundColor: theme.colors.surface, 
              borderColor: theme.colors.border,
              marginBottom: getResponsiveSize(16, 20, 24),
              padding: getResponsiveSize(16, 20, 24),
            }]}>
              <View style={[styles.repaymentHeader, {
                marginBottom: getResponsiveSize(16, 20, 24),
              }]}>
                <Text style={[styles.repaymentSectionTitle, { 
                  color: theme.colors.text,
                  fontSize: getResponsiveSize(16, 17, 18),
                }]}>
                  {t('repaymentDetails')}
                </Text>
                
                {repayments.length < 10 && (
                  <TouchableOpacity 
                    style={[styles.addButton, {
                      backgroundColor: theme.colors.primary + '20',
                      borderColor: theme.colors.primary,
                    }]} 
                    onPress={addRepayment}
                  >
                    <Plus size={getResponsiveSize(16, 18, 20)} color={theme.colors.primary} />
                    <Text style={[styles.addButtonText, {
                      color: theme.colors.primary,
                      fontSize: getResponsiveSize(12, 13, 14),
                    }]}>
                      Add
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {repayments.map((repayment, index) => (
                <View key={repayment.id} style={[styles.repaymentEntry, {
                  marginBottom: index < repayments.length - 1 ? getResponsiveSize(16, 20, 24) : 0,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                }]}>
                  <View style={[styles.repaymentEntryHeader, {
                    marginBottom: getResponsiveSize(12, 16, 20),
                  }]}>
                    <Text style={[styles.repaymentEntryTitle, {
                      color: theme.colors.text,
                      fontSize: getResponsiveSize(14, 15, 16),
                    }]}>
                      Repayment {index + 1}
                    </Text>
                    
                    {repayments.length > 1 && (
                      <TouchableOpacity 
                        style={[styles.removeButton, {
                          backgroundColor: '#ff4444' + '20',
                        }]} 
                        onPress={() => removeRepayment(repayment.id)}
                      >
                        <Trash2 size={getResponsiveSize(14, 16, 18)} color="#ff4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <View style={[styles.inputWrapper, {
                    marginBottom: getResponsiveSize(12, 16, 20),
                  }]}>
                    <Text style={[styles.sectionLabel, { 
                      color: theme.colors.text,
                      fontSize: Platform.OS === 'android' ? 16 : 18,
                      fontWeight: '600',
                      letterSpacing: 0.3,
                    }]}>
                      {t('repaymentAmount')}
                    </Text>
                    <View style={styles.amountInputWrapper}>
                      <AmountInput
                        label=""
                        value={repayment.amount}
                        onChangeText={(amount) => updateRepaymentAmount(repayment.id, amount)}
                        placeholder="60000"
                        error={errors.repayments?.[repayment.id]?.amount}
                      />
                    </View>
                  </View>
                  
                  <View style={styles.inputWrapper}>
                    <Text style={[styles.sectionLabel, { 
                      color: theme.colors.text,
                      fontSize: Platform.OS === 'android' ? 16 : 18,
                      fontWeight: '600',
                      letterSpacing: 0.3,
                    }]}>
                      {t('repaymentDate')}
                    </Text>
                    <View style={styles.dateInputWrapper}>
                      <DatePicker
                        label=""
                        value={repayment.date}
                        onChange={(date) => updateRepaymentDate(repayment.id, date)}
                        error={errors.repayments?.[repayment.id]?.date}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          <View style={[styles.buttonContainer, {
            marginTop: getResponsiveSize(8, 12, 16),
            gap: getResponsiveSize(10, 12, 14),
          }]}>
            <TouchableOpacity 
              style={[styles.resetButton, {
                minHeight: getResponsiveSize(56, 60, 64),
              }]} 
              onPress={resetForm}
            >
              <LinearGradient
                colors={['#64748b', '#94a3b8']}
                style={styles.buttonGradient}
              >
                <Text style={[styles.resetButtonText, {
                  fontSize: Platform.OS === 'android' ? 16 : 20,
                  fontWeight: '600',
                  letterSpacing: 0.3,
                }]}>
                  {t('reset')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.calculateButton, {
                minHeight: getResponsiveSize(56, 60, 64),
              }]} 
              onPress={calculateLoan}
            >
              <LinearGradient
                colors={['#1e40af', '#3b82f6']}
                style={styles.buttonGradient}
              >
                <Text style={[styles.calculateButtonText, {
                  fontSize: Platform.OS === 'android' ? 18 : 22,
                  fontWeight: '700',
                  letterSpacing: 0.3,
                }]}>
                  {t('calculate')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -24 }],
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  mainTitle: {
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerDescription: {
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  formContainer: {
    // Dynamic styles applied inline
  },
  inputWrapper: {
    // Dynamic styles applied inline
  },
  amountInputWrapper: {
    marginTop: 4,
  },
  rateInputWrapper: {
    marginTop: 4,
  },
  dateInputWrapper: {
    marginTop: 4,
  },
  sectionLabel: {
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  repaymentToggleContainer: {
    // Dynamic styles applied inline
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  toggleLabel: {
    fontWeight: '500',
  },
  repaymentSection: {
    borderRadius: 12,
    borderWidth: 1,
  },
  repaymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repaymentSectionTitle: {
    fontWeight: '600',
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  addButtonText: {
    fontWeight: '500',
  },
  repaymentEntry: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  repaymentEntryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repaymentEntryTitle: {
    fontWeight: '600',
  },
  removeButton: {
    padding: 6,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resetButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  calculateButton: {
    flex: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  calculateButtonText: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
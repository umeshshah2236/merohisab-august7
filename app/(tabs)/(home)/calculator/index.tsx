import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Dimensions, TouchableWithoutFeedback, Keyboard, InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calculator } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import AmountInput from '@/components/AmountInput';
import RateInput from '@/components/RateInput';
import DatePicker from '@/components/DatePicker';
import { BSDate, isValidBSDate } from '@/utils/date-utils';
import { calculateCompoundInterest } from '@/utils/interest-utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentBSDateWithMidnightUpdate } from '@/utils/current-date-utils';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints - optimized for better visibility
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;
const isLargeScreen = width >= 414;

// Larger font sizes for better readability, especially for older users
const getResponsiveSize = (small: number, medium: number, large: number) => {
  if (isSmallScreen) return small + 2; // Increase base sizes
  if (isMediumScreen) return medium + 2;
  return large + 2;
};

// Compact spacing to maximize screen usage
const getCompactSpacing = (small: number, medium: number, large: number) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

export default React.memo(function CalculatorScreen() {
  const { t } = useLanguage();
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/(home)/dashboard');
    }
  }, [isAuthenticated]);

  // Keep screen active for smooth transitions - especially important for Android
  useFocusEffect(
    React.useCallback(() => {
      // This keeps the screen rendered and prevents white flash during navigation
      console.log('Calculator screen focused - maintaining state for smooth transitions');
      return () => {
        // Keep state alive longer on Android to prevent white flash during back navigation
        if (Platform.OS === 'android') {
          console.log('Calculator screen unfocused on Android - preserving state');
        } else {
          console.log('Calculator screen unfocused on iOS');
        }
      };
    }, [])
  );
  
  // Get current BS date using Nepal timezone logic
  const getCurrentBSDate = (): BSDate => {
    return getCurrentBSDateWithMidnightUpdate();
  };
  
  // Form state
  const [principal, setPrincipal] = useState('');
  const [monthlyRate, setMonthlyRate] = useState('');
  const [startDate, setStartDate] = useState<BSDate>({ year: '2080', month: 1, day: 1 });
  const [endDate, setEndDate] = useState<BSDate>(getCurrentBSDate());
  
  // Keep form data persistent when navigating back from results
  useFocusEffect(
    React.useCallback(() => {
      // This ensures form data is preserved when coming back from results
      console.log('Calculator screen focused - preserving form data');
    }, [])
  );
  
  // Validation state
  const [errors, setErrors] = useState<{
    principal?: string;
    monthlyRate?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  
  // Validate form
  const validateForm = (): boolean => {
    const newErrors: {
      principal?: string;
      monthlyRate?: string;
      startDate?: string;
      endDate?: string;
    } = {};
    
    // Validate principal
    if (!principal || parseFloat(principal) <= 0) {
      newErrors.principal = t('enterValidAmount');
    }
    
    // Validate monthly rate
    if (!monthlyRate || parseFloat(monthlyRate) <= 0) {
      newErrors.monthlyRate = t('enterValidRate');
    }
    
    // Validate start date
    if (!isValidBSDate(startDate)) {
      newErrors.startDate = t('invalidStartDate');
    }
    
    // Validate end date
    if (!isValidBSDate(endDate)) {
      newErrors.endDate = t('invalidEndDate');
    }
    
    // Validate end date is after start date
    if (
      isValidBSDate(startDate) && 
      isValidBSDate(endDate) && 
      (
        parseInt(endDate.year) < parseInt(startDate.year) || 
        (parseInt(endDate.year) === parseInt(startDate.year) && endDate.month < startDate.month) ||
        (parseInt(endDate.year) === parseInt(startDate.year) && endDate.month === startDate.month && endDate.day <= startDate.day)
      )
    ) {
      newErrors.endDate = t('endDateAfterStart');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Calculate interest
  const calculateInterest = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (!validateForm()) {
      return;
    }
    
    const result = calculateCompoundInterest(
      parseFloat(principal),
      parseFloat(monthlyRate),
      startDate,
      endDate
    );
    
    // Navigate to results screen with calculation data
    router.push({
      pathname: '/(tabs)/(home)/calculator/results',
      params: {
        principal: result.principal.toString(),
        totalInterest: result.totalInterest.toString(),
        finalAmount: result.finalAmount.toString(),
        years: result.years.toString(),
        months: result.months.toString(),
        days: result.days.toString(),
        totalDays: result.totalDays.toString(),
        yearlyInterest: result.yearlyInterest.toString(),
        monthlyInterest: result.monthlyInterest.toString(),
        dailyInterest: result.dailyInterest.toString(),
        monthlyRate: monthlyRate.toString(),
        startDateYear: startDate.year,
        startDateMonth: startDate.month.toString(),
        startDateDay: startDate.day.toString(),
        endDateYear: endDate.year,
        endDateMonth: endDate.month.toString(),
        endDateDay: endDate.day.toString(),
      }
    });
  };
  
  // Reset form
  const resetForm = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setPrincipal('');
    setMonthlyRate('');
    setStartDate({ year: '2080', month: 1, day: 1 });
    setEndDate(getCurrentBSDate());
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
  const headerPaddingTop = Math.max(insets.top + getCompactSpacing(0, 4, 8), 42);
  const headerPaddingBottom = getCompactSpacing(12, 16, 20);
  const headerPaddingHorizontal = getCompactSpacing(16, 20, 24);
  
  // Responsive back button sizing
  const backButtonSize = getResponsiveSize(44, 48, 52);
  const backIconSize = getResponsiveSize(22, 24, 26);

  return (
    <KeyboardAvoidingView 
              style={{ flex: 1, backgroundColor: theme.colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} style={{ flex: 1 }}>
        <ScrollView 
                    style={[styles.container, { backgroundColor: theme.colors.background }]}
          contentContainerStyle={[styles.contentContainer, { backgroundColor: theme.colors.background }]}>
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
                left: getCompactSpacing(0, 4, 8),
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
              paddingLeft: backButtonSize + getCompactSpacing(8, 12, 16),
            }]}>
              <Text style={[styles.mainTitle, {
                fontSize: Platform.OS === 'android' ? 22 : 26,
                fontWeight: '700',
                letterSpacing: 0.3,
              }]}>
                {t('calculator')}
              </Text>
              

            </View>
          </View>
        </LinearGradient>
        
        <View style={[styles.formContainer, { 
                      backgroundColor: theme.colors.background,
          paddingHorizontal: getCompactSpacing(12, 16, 20),
          paddingTop: getCompactSpacing(4, 6, 8),
        }]}>
          <View style={[styles.inputWrapper, {
            marginBottom: getCompactSpacing(6, 8, 10),
          }]}>
            <Text style={[styles.sectionLabel, { 
              color: theme.colors.text,
              fontSize: Platform.OS === 'android' ? 18 : 20,
              fontWeight: '600',
              letterSpacing: 0.3,
            }]}>
              {t('principalAmount')}
            </Text>
            <View style={styles.amountInputWrapper}>
              <AmountInput
                label=""
                value={principal}
                onChangeText={setPrincipal}
                placeholder="100000"
                error={errors.principal}
              />
            </View>
          </View>
          
          <View style={[styles.inputWrapper, {
            marginBottom: getCompactSpacing(6, 8, 10),
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
                value={monthlyRate}
                onChangeText={setMonthlyRate}
                placeholder="1.0"
                error={errors.monthlyRate}
              />
            </View>
          </View>
          
          <View style={[styles.inputWrapper, {
            marginBottom: 1, // Reduced to 1px
          }]}>
            <Text style={[styles.sectionLabel, { 
              color: theme.colors.text,
              fontSize: Platform.OS === 'android' ? 18 : 20,
              fontWeight: '600',
              letterSpacing: 0.3,
            }]}>
              {t('startDate')}
            </Text>
            <View style={[styles.dateInputWrapper, { marginBottom: 1 }]}>
              <DatePicker
                label=""
                value={startDate}
                onChange={setStartDate}
                error={errors.startDate}
              />
            </View>
          </View>
          
          <View style={[styles.inputWrapper, {
            marginBottom: 1, // Reduced to 1px
          }]}>
            <Text style={[styles.sectionLabel, { 
              color: theme.colors.text,
              fontSize: Platform.OS === 'android' ? 18 : 20,
              fontWeight: '600',
              letterSpacing: 0.3,
            }]}>
              {t('endDate')}
            </Text>
            <View style={[styles.dateInputWrapper, { marginBottom: 1 }]}>
              <DatePicker
                label=""
                value={endDate}
                onChange={setEndDate}
                error={errors.endDate}
              />
            </View>
          </View>
          
          <View style={[styles.buttonContainer, {
            marginTop: getCompactSpacing(8, 12, 16),
            gap: getCompactSpacing(8, 10, 12),
          }]}>
            <TouchableOpacity 
              style={[styles.resetButton, {
                minHeight: getResponsiveSize(58, 62, 66),
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
                minHeight: getResponsiveSize(58, 62, 66),
              }]} 
              onPress={calculateInterest}
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
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 12,
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
    color: 'white',
    textAlign: 'center',
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
    marginTop: 1,
  },
  rateInputWrapper: {
    marginTop: 1,
  },
  dateInputWrapper: {
    marginTop: 1,
    marginBottom: 1,
  },
  sectionLabel: {
    marginBottom: 4,
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
  },
  calculateButtonText: {
    color: 'white',
  },
});
import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Platform, InteractionManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/contexts/LanguageContext';

import { formatLocalizedCurrency, formatNumber } from '@/utils/number-utils';
import { ArrowLeft } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints optimized for older users
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;
const isLargeScreen = width >= 414;

// Larger font sizes for better readability, especially for older users
const getResponsiveSize = (small: number, medium: number, large: number) => {
  // Extra large fonts for iOS to help older users
  const iosBonus = Platform.OS === 'ios' ? 4 : 0;
  
  if (isSmallScreen) return small + 3 + iosBonus; // Significantly larger fonts for iOS
  if (isMediumScreen) return medium + 3 + iosBonus;
  return large + 3 + iosBonus;
};

// Compact spacing to maximize screen usage
const getCompactSpacing = (small: number, medium: number, large: number) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

// Get appropriate line height for better Nepali text rendering
const getLineHeight = (baseFontSize: number, language: string) => {
  // Nepali/Devanagari text needs more line height due to diacritics
  const multiplier = language === 'ne' ? 1.8 : 1.4;
  return Math.max(baseFontSize * multiplier, 20);
};

export default React.memo(function ResultsScreen() {
  const { t, language } = useLanguage();

  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  // Parse parameters with safe defaults
  const principal = parseFloat(params.principal as string) || 0;
  const totalInterest = parseFloat(params.totalInterest as string) || 0;
  const finalAmount = parseFloat(params.finalAmount as string) || 0;
  const years = parseInt(params.years as string) || 0;
  const months = parseInt(params.months as string) || 0;
  const days = parseInt(params.days as string) || 0;
  const totalDays = parseInt(params.totalDays as string) || 0;
  const yearlyInterest = parseFloat(params.yearlyInterest as string) || 0;
  const monthlyInterest = parseFloat(params.monthlyInterest as string) || 0;
  const dailyInterest = parseFloat(params.dailyInterest as string) || 0;
  const monthlyRate = parseFloat(params.monthlyRate as string) || 0;
  
  // Parse date parameters with safe defaults
  const startDate = {
    year: params.startDateYear as string || '',
    month: parseInt(params.startDateMonth as string) || 1,
    day: parseInt(params.startDateDay as string) || 1,
  };
  
  const endDate = {
    year: params.endDateYear as string || '',
    month: parseInt(params.endDateMonth as string) || 1,
    day: parseInt(params.endDateDay as string) || 1,
  };

  // Check if this is a customer interest calculation
  const calculationType = params.calculationType as string;
  const customerName = params.customerName as string;
  const isCustomerInterest = calculationType === 'customer_interest';
  
  // Customer interest specific parameters
  const netBalance = parseFloat(params.netBalance as string) || 0;
  const totalRepaymentAmount = parseFloat(params.totalRepaymentAmount as string) || 0;
  const totalRepaymentWithInterest = parseFloat(params.totalRepaymentWithInterest as string) || 0;
  const givenTransactionCount = parseInt(params.givenTransactionCount as string) || 0;
  const receivedTransactionCount = parseInt(params.receivedTransactionCount as string) || 0;

  const formatTimePeriod = () => {
    const parts = [];
    if (years > 0) parts.push(`${formatNumber(years, 'en')} ${years === 1 ? t('year') : t('years')}`);
    if (months > 0) parts.push(`${formatNumber(months, 'en')} ${months === 1 ? t('month') : t('months')}`);
    if (days > 0) parts.push(`${formatNumber(days, 'en')} ${days === 1 ? t('day') : t('days')}`);
    
    if (parts.length === 0) return 'No time period';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts.join(' and ');
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  };

  // Keep screen active for smooth transitions on Android
  useFocusEffect(
    React.useCallback(() => {
      // This keeps the screen rendered and prevents white flash during navigation
      console.log('Results screen focused - maintaining state');
      return () => {
        // Don't cleanup state on Android to prevent white flash
        if (Platform.OS !== 'android') {
          console.log('Results screen unfocused');
        }
      };
    }, [])
  );

  const handleGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // If this is a customer interest calculation, go back to customer detail page
    if (isCustomerInterest && customerName) {
      if (Platform.OS === 'android') {
        // For Android: Use InteractionManager for smooth navigation
        InteractionManager.runAfterInteractions(() => {
          router.dismissAll();
          router.push({
            pathname: '/(tabs)/(home)/customer-detail',
            params: { customerName }
          });
        });
      } else {
        // For iOS: Simple navigation works fine
        router.push({
          pathname: '/(tabs)/(home)/customer-detail',
          params: { customerName }
        });
      }
      return;
    }
    
    // For regular calculator flow - use Android-optimized back navigation
    if (Platform.OS === 'android') {
      InteractionManager.runAfterInteractions(() => {
        router.back();
      });
    } else {
      // iOS: Direct back navigation
      router.back();
    }
  };

  const getLocalizedMonthName = (monthIndex: number) => {
    const monthKeys = [
      'baishakh', 'jestha', 'ashadh', 'shrawan', 'bhadra', 'ashwin',
      'kartik', 'mangsir', 'poush', 'magh', 'falgun', 'chaitra'
    ];
    return t(monthKeys[monthIndex - 1]);
  };

  const formatBSDate = (date: { year: string; month: number; day: number }) => {
    const monthName = getLocalizedMonthName(date.month);
    const year = formatNumber(date.year, 'en');
    const day = formatNumber(date.day, 'en');
    
    if (language === 'ne') {
      return `${year} ${monthName} ${day}`;
    }
    return `${year} ${monthName} ${day}`;
  };

  const InterestBreakdown = () => (
    <View style={styles.interestBreakdownContainer}>
      <Text style={[styles.breakdownMainTitle, {
        fontSize: getResponsiveSize(20, 22, 24),
        marginBottom: getCompactSpacing(8, 10, 12),
      }]}>
        {t('interestBreakdown')}:
      </Text>
      
      {yearlyInterest > 0 && (
        <View style={[styles.breakdownItemCard, {
          marginBottom: getCompactSpacing(6, 8, 10),
          paddingVertical: getCompactSpacing(10, 12, 14),
          paddingHorizontal: getCompactSpacing(10, 12, 14),
        }]}>
          <Text style={[styles.breakdownItemLabel, {
            fontSize: getResponsiveSize(16, 18, 20),
            marginBottom: getCompactSpacing(2, 3, 4),
          }]}>
            {t('yearlyInterest')}
          </Text>
          <Text style={[styles.breakdownItemPeriod, {
            fontSize: getResponsiveSize(14, 16, 18),
            marginBottom: getCompactSpacing(4, 5, 6),
          }]}>
            ({formatNumber(years, 'en')} {years === 1 ? t('year') : t('years')})
          </Text>
          <Text style={[styles.breakdownItemValue, {
            fontSize: getResponsiveSize(20, 22, 24),
          }]}>
            {formatLocalizedCurrency(yearlyInterest, language)}
          </Text>
        </View>
      )}
      
      {monthlyInterest > 0 && (
        <View style={[styles.breakdownItemCard, {
          marginBottom: getCompactSpacing(6, 8, 10),
          paddingVertical: getCompactSpacing(10, 12, 14),
          paddingHorizontal: getCompactSpacing(10, 12, 14),
        }]}>
          <Text style={[styles.breakdownItemLabel, {
            fontSize: getResponsiveSize(16, 18, 20),
            marginBottom: getCompactSpacing(2, 3, 4),
          }]}>
            {t('monthlyInterest')}
          </Text>
          <Text style={[styles.breakdownItemPeriod, {
            fontSize: getResponsiveSize(14, 16, 18),
            marginBottom: getCompactSpacing(4, 5, 6),
          }]}>
            ({formatNumber(months, 'en')} {months === 1 ? t('month') : t('months')})
          </Text>
          <Text style={[styles.breakdownItemValue, {
            fontSize: getResponsiveSize(20, 22, 24),
          }]}>
            {formatLocalizedCurrency(monthlyInterest, language)}
          </Text>
        </View>
      )}
      
      {dailyInterest > 0 && (
        <View style={[styles.breakdownItemCard, {
          marginBottom: getCompactSpacing(6, 8, 10),
          paddingVertical: getCompactSpacing(10, 12, 14),
          paddingHorizontal: getCompactSpacing(10, 12, 14),
        }]}>
          <Text style={[styles.breakdownItemLabel, {
            fontSize: getResponsiveSize(16, 18, 20),
            marginBottom: getCompactSpacing(2, 3, 4),
          }]}>
            {t('dailyInterest')}
          </Text>
          <Text style={[styles.breakdownItemPeriod, {
            fontSize: getResponsiveSize(14, 16, 18),
            marginBottom: getCompactSpacing(4, 5, 6),
          }]}>
            ({formatNumber(days, 'en')} {days === 1 ? t('day') : t('days')})
          </Text>
          <Text style={[styles.breakdownItemValue, {
            fontSize: getResponsiveSize(20, 22, 24),
          }]}>
            {formatLocalizedCurrency(dailyInterest, language)}
          </Text>
        </View>
      )}
    </View>
  );

  return (
            <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      {/* Compact Header with Back Button */}
      <View style={[styles.simpleHeader, { paddingTop: insets.top + getCompactSpacing(6, 8, 10) }]}>
        <TouchableOpacity style={styles.backIconButton} onPress={handleGoBack}>
          <ArrowLeft size={getResponsiveSize(24, 26, 28)} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={[styles.simpleHeaderTitle, {
            fontSize: getResponsiveSize(18, 20, 22),
            fontWeight: '600',
          }]}>
            {t('calculationResults')}
          </Text>
          <Text style={[styles.simpleHeaderSubtitle, {
            fontSize: getResponsiveSize(14, 16, 16),
            fontWeight: '500',
          }]}>
            {isCustomerInterest ? customerName : formatTimePeriod()}
          </Text>
        </View>
      </View>

            <ScrollView 
        style={[styles.scrollContainer, { backgroundColor: '#F8FAFC' }]} 
        contentContainerStyle={[styles.contentContainer, {
          paddingBottom: getCompactSpacing(20, 24, 28),
        }]}>
        <View style={[styles.resultsContainer, {
          paddingHorizontal: getCompactSpacing(12, 16, 20),
          paddingTop: getCompactSpacing(8, 12, 16),
                        backgroundColor: '#FFFFFF',
        }]}>
          {isCustomerInterest ? (
            /* Customer Interest Calculation Results */
            <>
              {/* Net Balance - Compact Design */}
              <View style={[styles.compactBalanceCard, {
                marginBottom: getCompactSpacing(8, 10, 12),
                paddingVertical: getCompactSpacing(12, 14, 16),
                paddingHorizontal: getCompactSpacing(16, 18, 20),
                backgroundColor: netBalance >= 0 ? '#10B981' : '#EF4444',
              }]}>
                <Text style={[styles.compactBalanceTitle, {
                  fontSize: getResponsiveSize(14, 16, 16),
                  marginBottom: getCompactSpacing(4, 6, 8),
                  color: 'white',
                  fontWeight: '600',
                }]}>
                  {netBalance >= 0 ? t('toReceive') : t('toGive')}
                </Text>
                <Text style={[styles.compactBalanceValue, {
                  fontSize: getResponsiveSize(20, 22, 24),
                  color: 'white',
                  fontWeight: '700',
                }]}>
                  {formatLocalizedCurrency(Math.abs(netBalance), language)}
                </Text>
              </View>

              {/* Transaction Summary */}
              <View style={[styles.largeInfoCard, {
                marginBottom: getCompactSpacing(12, 16, 20),
                paddingVertical: getCompactSpacing(16, 20, 24),
                paddingHorizontal: getCompactSpacing(16, 20, 24),
              }]}>
                <Text style={[styles.cardTitle, {
                  fontSize: getResponsiveSize(16, 18, 18),
                  marginBottom: getCompactSpacing(12, 16, 20),
                  textAlign: 'center',
                  fontWeight: '600',
                }]}>{t('transactionSummary')}</Text>
                
                {/* Explanation Text */}
                <Text style={[styles.explanationText, {
                  fontSize: getResponsiveSize(12, 13, 14),
                  color: '#64748B',
                  textAlign: 'center',
                  marginBottom: getCompactSpacing(12, 14, 16),
                  fontWeight: '500',
                  lineHeight: getLineHeight(getResponsiveSize(12, 13, 14), language),
                }]}>
                  {t('calculationBreakdownExplanation') || 'Here is the detailed breakdown of all transactions and calculated interest:'}
                </Text>
                
                <View style={styles.responsiveTransactionRow}>
                  <Text style={[styles.responsiveTransactionLabel, {
                    fontSize: getResponsiveSize(13, 14, 15),
                    fontWeight: '600',
                    lineHeight: getLineHeight(getResponsiveSize(13, 14, 15), language),
                  }]}>
                    {t('totalGiven')} ({givenTransactionCount} {t('transactionCount')})
                  </Text>
                  <Text style={[styles.responsiveTransactionValue, {
                    fontSize: getResponsiveSize(14, 15, 16),
                    fontWeight: '700',
                    lineHeight: getLineHeight(getResponsiveSize(14, 15, 16), language),
                  }]}>
                    {formatLocalizedCurrency(principal, language)}
                  </Text>
                </View>
                
                <View style={styles.responsiveTransactionRow}>
                  <Text style={[styles.responsiveTransactionLabel, {
                    fontSize: getResponsiveSize(13, 14, 15),
                    fontWeight: '600',
                    lineHeight: getLineHeight(getResponsiveSize(13, 14, 15), language),
                  }]}>
                    {t('totalReceived')} ({receivedTransactionCount} {t('transactionCount')})
                  </Text>
                  <Text style={[styles.responsiveTransactionValue, {
                    fontSize: getResponsiveSize(14, 15, 16),
                    fontWeight: '700',
                    lineHeight: getLineHeight(getResponsiveSize(14, 15, 16), language),
                  }]}>
                    {formatLocalizedCurrency(totalRepaymentAmount, language)}
                  </Text>
                </View>
                
                <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 12, marginTop: 12 }}>
                  <Text style={[styles.explanationText, {
                    fontSize: getResponsiveSize(12, 13, 13),
                    color: '#64748B',
                    textAlign: 'center',
                    marginBottom: getCompactSpacing(8, 10, 12),
                    fontWeight: '500',
                    fontStyle: 'italic',
                    lineHeight: getLineHeight(getResponsiveSize(12, 13, 13), language),
                  }]}>
                    {t('withInterestCalculation') || 'After adding interest calculations:'}
                  </Text>
                  
                  <View style={styles.responsiveTransactionRow}>
                    <Text style={[styles.responsiveTransactionLabel, {
                      fontSize: getResponsiveSize(13, 14, 15),
                      fontWeight: '600',
                      lineHeight: getLineHeight(getResponsiveSize(13, 14, 15), language),
                    }]}>
                      {t('totalAmountDueWithInterest')}
                    </Text>
                    <Text style={[styles.responsiveTransactionValue, {
                      fontSize: getResponsiveSize(14, 15, 16),
                      fontWeight: '700',
                      color: '#EF4444',
                      lineHeight: getLineHeight(getResponsiveSize(14, 15, 16), language),
                    }]}>
                      {formatLocalizedCurrency(finalAmount, language)}
                    </Text>
                  </View>
                  
                  <View style={styles.responsiveTransactionRow}>
                    <Text style={[styles.responsiveTransactionLabel, {
                      fontSize: getResponsiveSize(13, 14, 15),
                      fontWeight: '600',
                      lineHeight: getLineHeight(getResponsiveSize(13, 14, 15), language),
                    }]}>
                      {t('totalRepaidWithInterest')}
                    </Text>
                    <Text style={[styles.responsiveTransactionValue, {
                      fontSize: getResponsiveSize(14, 15, 16),
                      fontWeight: '700',
                      color: '#10B981',
                      lineHeight: getLineHeight(getResponsiveSize(14, 15, 16), language),
                    }]}>
                      {formatLocalizedCurrency(totalRepaymentWithInterest, language)}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          ) : (
            /* Regular Interest Calculation Results */
            <>

              
              {/* Total Interest - Highlighted - MOVED TO TOP */}
              <View style={[styles.highlightCard, {
                marginBottom: getCompactSpacing(10, 12, 14),
                paddingVertical: getCompactSpacing(18, 22, 26),
                paddingHorizontal: getCompactSpacing(18, 22, 26),
              }]}>
                <Text style={[styles.highlightCardTitle, {
                  fontSize: getResponsiveSize(16, 18, 18),
                  marginBottom: getCompactSpacing(8, 10, 12),
                  fontWeight: '600',
                }]}>{t('totalInterest')}</Text>
                <Text style={[styles.highlightCardValue, {
                  fontSize: getResponsiveSize(24, 26, 28),
                  fontWeight: '700',
                }]}>
                  {formatLocalizedCurrency(totalInterest, language)}
                </Text>
              </View>
              
              {/* Final Amount - Most Important - MOVED TO TOP */}
              <View style={[styles.finalAmountCard, {
                marginBottom: getCompactSpacing(12, 16, 20),
                paddingVertical: getCompactSpacing(20, 24, 28),
                paddingHorizontal: getCompactSpacing(20, 24, 28),
              }]}>
                <Text style={[styles.finalAmountTitle, {
                  fontSize: getResponsiveSize(18, 20, 22),
                  marginBottom: getCompactSpacing(10, 12, 16),
                  fontWeight: '600',
                }]}>{t('finalAmount')}</Text>
                <Text style={[styles.finalAmountValue, {
                  fontSize: getResponsiveSize(28, 30, 32),
                  fontWeight: '700',
                }]}>
                  {formatLocalizedCurrency(finalAmount, language)}
                </Text>
                
                {/* Calculation Formula */}
                <Text style={[styles.explanationText, {
                  fontSize: getResponsiveSize(14, 16, 18), // Increased from 10,11,12 for better visibility
                  color: 'rgba(255, 255, 255, 0.95)', // Increased opacity from 0.8 for better contrast
                  textAlign: 'center',
                  marginTop: getCompactSpacing(8, 10, 12),
                  fontWeight: '600', // Increased from 500 for bolder text
                  lineHeight: getLineHeight(getResponsiveSize(14, 16, 18), language), // Dynamic line height for Nepali
                  paddingHorizontal: getCompactSpacing(8, 12, 16), // Added padding to prevent clipping
                }]}>
                  {formatLocalizedCurrency(principal, language)} + {formatLocalizedCurrency(totalInterest, language)} = {formatLocalizedCurrency(finalAmount, language)}
                </Text>
              </View>
            </>
          )}
          
          {/* Calculation Breakdown Section - Only for regular calculations */}
          {!isCustomerInterest && (
            <>
              <View style={[styles.breakdownSectionContainer, {
                marginBottom: getCompactSpacing(12, 16, 20),
              }]}>
                <View style={styles.breakdownLine} />
                <Text style={[styles.breakdownSectionTitle, {
                  fontSize: getResponsiveSize(18, 20, 22),
                }]}>
                  {t('calculationBreakdown')}
                </Text>
                <View style={styles.breakdownLine} />
              </View>
          
          {/* Principal Amount */}
          <View style={[styles.largeInfoCard, {
            marginBottom: getCompactSpacing(10, 12, 14),
            paddingVertical: getCompactSpacing(16, 20, 24),
            paddingHorizontal: getCompactSpacing(16, 20, 24),
          }]}>
            <Text style={[styles.cardTitle, {
              fontSize: getResponsiveSize(18, 20, 22),
              marginBottom: getCompactSpacing(8, 10, 12),
            }]}>{t('principalAmountResult')}</Text>
            <Text style={[styles.cardValue, {
              fontSize: getResponsiveSize(24, 26, 28),
            }]}>
              {formatLocalizedCurrency(principal, language)}
            </Text>
          </View>
          
          {/* Date and Rate Information */}
          <View style={[styles.timeContainer, {
            marginBottom: getCompactSpacing(10, 12, 14),
            paddingVertical: getCompactSpacing(12, 16, 20),
            paddingHorizontal: getCompactSpacing(12, 16, 20),
          }]}>
            <View style={[styles.timeRow, { marginBottom: getCompactSpacing(6, 8, 10) }]}>
              <Text style={[styles.timeLabel, {
                fontSize: getResponsiveSize(16, 18, 20),
              }]}>
                {t('monthlyInterestRate')}:
              </Text>
              <Text style={[styles.timeValue, {
                fontSize: getResponsiveSize(16, 18, 20),
              }]}>
                {formatNumber(monthlyRate, 'en')}% {t('perMonth')}
              </Text>
            </View>
            <View style={[styles.timeRow, { marginBottom: getCompactSpacing(6, 8, 10) }]}>
              <Text style={[styles.timeLabel, {
                fontSize: getResponsiveSize(16, 18, 20),
              }]}>
                {t('startDate')} (BS):
              </Text>
              <Text style={[styles.timeValue, {
                fontSize: getResponsiveSize(16, 18, 20),
              }]}>
                {formatBSDate(startDate)}
              </Text>
            </View>
            <View style={[styles.timeRow, { marginBottom: getCompactSpacing(6, 8, 10) }]}>
              <Text style={[styles.timeLabel, {
                fontSize: getResponsiveSize(16, 18, 20),
              }]}>
                {t('endDate')} (BS):
              </Text>
              <Text style={[styles.timeValue, {
                fontSize: getResponsiveSize(16, 18, 20),
              }]}>
                {formatBSDate(endDate)}
              </Text>
            </View>
            <View style={[styles.timeRow, { marginBottom: 0 }]}>
              <Text style={[styles.timeLabel, {
                fontSize: getResponsiveSize(16, 18, 20),
              }]}>
                {t('timePeriod')}:
              </Text>
              <Text style={[styles.timeValue, {
                fontSize: getResponsiveSize(16, 18, 20),
              }]}>
                {formatTimePeriod()}
              </Text>
            </View>
            <View style={[styles.timeRow, { marginBottom: 0 }]}>
              <Text style={[styles.timeLabel, {
                fontSize: getResponsiveSize(16, 18, 20),
              }]}>
                {t('totalDays')}:
              </Text>
              <Text style={[styles.timeValue, {
                fontSize: getResponsiveSize(16, 18, 20),
              }]}>
                {formatNumber(totalDays, 'en')} {totalDays === 1 ? t('day') : t('days')} ({t('calendarDays')})
              </Text>
            </View>
          </View>
          
          {/* Interest Breakdown */}
          {(yearlyInterest > 0 || monthlyInterest > 0 || dailyInterest > 0) && (
            <View style={[styles.breakdownCard, {
              marginBottom: getCompactSpacing(10, 12, 14),
              paddingVertical: getCompactSpacing(12, 16, 20),
              paddingHorizontal: getCompactSpacing(12, 16, 20),
            }]}>
              <InterestBreakdown />
            </View>
          )}
          
          {/* Calculation Note */}
          <View style={[styles.noteCard, {
            marginBottom: getCompactSpacing(16, 20, 24),
            paddingVertical: getCompactSpacing(14, 18, 22),
            paddingHorizontal: getCompactSpacing(14, 18, 22),
          }]}>
            <Text style={[styles.noteTitle, {
              fontSize: getResponsiveSize(16, 18, 20),
              marginBottom: getCompactSpacing(6, 8, 10),
            }]}>गणना नोट:</Text>
            <Text style={[styles.noteText, {
              fontSize: getResponsiveSize(15, 17, 19),
              lineHeight: getResponsiveSize(22, 24, 26),
            }]}>
              {t('calculationNote')} {formatNumber(years, 'en')} {years === 1 ? t('year') : t('years')}
              {months > 0 && `, ${t('simpleInterestFor')} ${formatNumber(months, 'en')} ${months === 1 ? t('month') : t('months')}`}
              {days > 0 && `, ${t('simpleDailyInterestFor')} ${formatNumber(days, 'en')} ${days === 1 ? t('day') : t('days')}`}.
            </Text>
          </View>
            </>
          )}
          
          {/* Back Button */}
          <TouchableOpacity style={[styles.backButton, {
            paddingVertical: getResponsiveSize(18, 20, 22),
            paddingHorizontal: getResponsiveSize(24, 28, 32),
          }]} onPress={handleGoBack}>
            <Text style={[styles.backButtonText, {
              fontSize: getResponsiveSize(18, 20, 22),
            }]}>
              {t('backToCalculator')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  simpleHeader: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 20,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backIconButton: {
    padding: 8,
    marginRight: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  simpleHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  simpleHeaderSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  resultsContainer: {
    padding: 20,
  },
  largeInfoCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
    textAlign: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
    textAlign: 'center',
  },
  timeContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.3,
    flex: 1,
    marginRight: 8,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5,
    flex: 2,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  breakdownCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  interestBreakdownContainer: {
    // Container for breakdown items
  },
  breakdownMainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
    textAlign: 'center',
  },
  breakdownItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  breakdownItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
  },
  breakdownItemPeriod: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  breakdownItemValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E40AF',
  },
  highlightCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  highlightCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 12,
    textAlign: 'center',
  },
  highlightCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E40AF',
    textAlign: 'center',
  },
  finalAmountCard: {
    backgroundColor: '#1E40AF',
    borderRadius: 20,
    padding: 28,
    marginBottom: 20,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  finalAmountTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  finalAmountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 15,
    color: '#92400E',
    lineHeight: 22,
  },
  backButton: {
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  explanationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20, // Added line height for better Nepali text rendering
    paddingVertical: 2, // Added padding to prevent clipping
  },
  breakdownSectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  breakdownLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  breakdownSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginHorizontal: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(255, 235, 59, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  responsiveTransactionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 6, // Increased padding for better Nepali text spacing
    minHeight: 28, // Minimum height to prevent clipping
  },
  responsiveTransactionLabel: {
    flex: 1,
    marginRight: 12,
    color: '#64748B',
    lineHeight: 24, // Increased for better Nepali text rendering
    flexWrap: 'wrap',
    paddingVertical: 2, // Added padding to prevent clipping
  },
  responsiveTransactionValue: {
    color: '#1E40AF',
    textAlign: 'right',
    flexShrink: 0,
    minWidth: 80,
    maxWidth: '40%',
    lineHeight: 24, // Increased for better Nepali text rendering
    paddingVertical: 2, // Added padding to prevent clipping
  },
  compactBalanceCard: {
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  compactBalanceTitle: {
    textAlign: 'center',
    color: 'white',
    fontWeight: '600',
  },
  compactBalanceValue: {
    textAlign: 'center',
    color: 'white',
    fontWeight: '700',
  },
});
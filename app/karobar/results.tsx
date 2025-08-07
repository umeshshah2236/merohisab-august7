import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatLocalizedCurrency, formatNumber } from '@/utils/number-utils';
import { formatCurrentBSDateForNetBalance, getCurrentBSDateWithMidnightUpdate } from '@/utils/current-date-utils';

const { width, height } = Dimensions.get('window');

// Responsive breakpoints for better readability
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;
const isLargeScreen = width >= 414;
const isExtraLargeScreen = width >= 480;

// Responsive sizing functions
const getResponsiveSize = (small: number, medium: number, large: number) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

const getResponsivePadding = () => {
  if (isSmallScreen) return 12;
  if (isMediumScreen) return 16;
  return 20;
};

const getResponsiveFontSize = (base: number) => {
  // Extra large fonts for iOS to help older users
  const iosBonus = Platform.OS === 'ios' ? 4 : 0;
  
  if (isSmallScreen) return base - 2 + iosBonus;
  if (isMediumScreen) return base + iosBonus;
  if (isExtraLargeScreen) return base + 2 + iosBonus;
  return base + iosBonus;
};

export default function KarobarResultsScreen() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  // Parse parameters
  const personName = params.personName as string;
  const loanAmount = parseFloat(params.loanAmount as string);
  const totalDays = parseInt(params.totalDays as string);
  const years = parseInt(params.years as string) || 0;
  const months = parseInt(params.months as string) || 0;
  const days = parseInt(params.days as string) || 0;
  const interestRate = parseFloat(params.interestRate as string);
  const totalInterest = parseFloat(params.totalInterest as string);
  const finalAmount = parseFloat(params.finalAmount as string);
  const yearlyInterest = parseFloat(params.yearlyInterest as string) || 0;
  const monthlyInterest = parseFloat(params.monthlyInterest as string) || 0;
  const dailyInterest = parseFloat(params.dailyInterest as string) || 0;
  
  // Repayment data - support multiple repayments
  const hasRepayment = params.hasRepayment === 'true';
  const repayments = hasRepayment ? JSON.parse(params.repayments as string || '[]') : [];
  const repaymentResults = hasRepayment ? JSON.parse(params.repaymentResults as string || '[]') : [];
  const totalRepaymentWithInterest = parseFloat(params.totalRepaymentWithInterest as string) || 0;
  const netBalance = parseFloat(params.netBalance as string);
  
  const loanDate = {
    year: params.loanDateYear as string,
    month: parseInt(params.loanDateMonth as string),
    day: parseInt(params.loanDateDay as string),
  };
  
  // Use the end date from parameters (which is set to current date by default)
  const endDate = {
    year: params.endDateYear as string,
    month: parseInt(params.endDateMonth as string),
    day: parseInt(params.endDateDay as string),
  };
  
  // Calculate total repayment amount
  const totalRepaymentAmount = repayments.reduce((sum: number, repayment: any) => {
    return sum + (parseFloat(repayment.amount) || 0);
  }, 0);

  const handleGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // For karobar calculator flow - use simple back navigation
    router.back();
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

  const formatTimePeriod = (y: number, m: number, d: number) => {
    const parts = [];
    if (y > 0) parts.push(`${formatNumber(y, 'en')} ${y === 1 ? t('year') : t('years')}`);
    if (m > 0) parts.push(`${formatNumber(m, 'en')} ${m === 1 ? t('month') : t('months')}`);
    if (d > 0) parts.push(`${formatNumber(d, 'en')} ${d === 1 ? t('day') : t('days')}`);
    
    if (parts.length === 0) return 'No time period';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts.join(' and ');
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  };

  const InterestBreakdown = ({ 
    yearlyInt, 
    monthlyInt, 
    dailyInt, 
    y, 
    m, 
    d 
  }: { 
    yearlyInt: number; 
    monthlyInt: number; 
    dailyInt: number; 
    y: number; 
    m: number; 
    d: number; 
  }) => (
    <View style={styles.interestBreakdownContainer}>
      <Text style={styles.breakdownMainTitle}>
        {t('interestBreakdown')}:
      </Text>
      
      {yearlyInt > 0 && (
        <View style={styles.breakdownItemCard}>
          <Text style={styles.breakdownItemLabel}>
            {t('yearlyInterest')}
          </Text>
          <Text style={styles.breakdownItemPeriod}>
            ({formatNumber(y, 'en')} {y === 1 ? t('year') : t('years')})
          </Text>
          <Text style={styles.breakdownItemValue}>
            {formatLocalizedCurrency(yearlyInt, language)}
          </Text>
        </View>
      )}
      
      {monthlyInt > 0 && (
        <View style={styles.breakdownItemCard}>
          <Text style={styles.breakdownItemLabel}>
            {t('monthlyInterest')}
          </Text>
          <Text style={styles.breakdownItemPeriod}>
            ({formatNumber(m, 'en')} {m === 1 ? t('month') : t('months')})
          </Text>
          <Text style={styles.breakdownItemValue}>
            {formatLocalizedCurrency(monthlyInt, language)}
          </Text>
        </View>
      )}
      
      {dailyInt > 0 && (
        <View style={styles.breakdownItemCard}>
          <Text style={styles.breakdownItemLabel}>
            {t('dailyInterest')}
          </Text>
          <Text style={styles.breakdownItemPeriod}>
            ({formatNumber(d, 'en')} {d === 1 ? t('day') : t('days')})
          </Text>
          <Text style={styles.breakdownItemValue}>
            {formatLocalizedCurrency(dailyInt, language)}
          </Text>
        </View>
      )}
    </View>
  );

  // Use the end date for Net Balance section instead of current date
  const endDateFormatted = formatBSDate(endDate);

  return (
    <View style={styles.container}>
      {/* Simple Header with Back Button */}
      <View style={[styles.simpleHeader, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backIconButton} onPress={handleGoBack}>
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.simpleHeaderTitle}>
            {t('calculationResults')}
          </Text>
          <Text style={styles.simpleHeaderSubtitle}>
            {formatTimePeriod(years, months, days)}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        <View style={styles.resultsContainer}>

          
          {/* Original Loan Amount */}
          <View style={styles.largeInfoCard}>
            <Text style={styles.cardTitle}>{t('originalAmount')}</Text>
            <Text style={styles.cardValue}>
              {formatLocalizedCurrency(loanAmount, language)}
            </Text>
          </View>
          
          {/* Date and Rate Information */}
          <View style={styles.timeContainer}>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>
                {t('monthlyInterestRate')}:
              </Text>
              <Text style={styles.timeValue}>
                {formatNumber(interestRate, 'en')}% {t('perMonth')}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>
                {t('loanDate')} (BS):
              </Text>
              <Text style={styles.timeValue}>
                {formatBSDate(loanDate)}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>
                {t('endDate')} (BS):
              </Text>
              <Text style={styles.timeValue}>
                {formatBSDate(endDate)}
              </Text>
            </View>
            <View style={[styles.timeRow, { marginBottom: 0 }]}>
              <Text style={styles.timeLabel}>
                {t('timePeriod')}:
              </Text>
              <Text style={styles.timeValue}>
                {formatTimePeriod(years, months, days)}
              </Text>
            </View>
          </View>
          
          {/* Interest Breakdown */}
          {(yearlyInterest > 0 || monthlyInterest > 0 || dailyInterest > 0) && (
            <View style={styles.breakdownCard}>
              <InterestBreakdown 
                yearlyInt={yearlyInterest}
                monthlyInt={monthlyInterest}
                dailyInt={dailyInterest}
                y={years}
                m={months}
                d={days}
              />
            </View>
          )}
          
          {/* Total Interest - Highlighted */}
          <View style={styles.highlightCard}>
            <Text style={styles.highlightCardTitle}>{t('totalInterest')}</Text>
            <Text style={styles.highlightCardValue}>
              {formatLocalizedCurrency(totalInterest, language)}
            </Text>
          </View>
          
          {/* Total Amount Due - Most Important */}
          <View style={styles.finalAmountCard}>
            <Text style={styles.finalAmountTitle}>{t('totalAmountDue')}</Text>
            <Text style={styles.finalAmountValue}>
              {formatLocalizedCurrency(finalAmount, language)}
            </Text>
          </View>
        
          {/* Repayment Section - Multiple Repayments */}
          {hasRepayment && repayments.length > 0 && (
            <View style={styles.repaymentCard}>
              <Text style={styles.repaymentCardTitle}>
                {t('repaymentDetails')} ({repayments.length} {repayments.length === 1 ? 'Entry' : 'Entries'})
              </Text>
            
              {/* Summary */}
              <View style={styles.repaymentSummaryRow}>
                <Text style={styles.repaymentSummaryLabel}>
                  {t('totalRepaidAmount')}:
                </Text>
                <Text style={styles.repaymentSummaryValue}>
                  {formatLocalizedCurrency(totalRepaymentAmount, language)}
                </Text>
              </View>
            
              <View style={styles.repaymentSummaryRow}>
                <Text style={styles.repaymentSummaryLabel}>
                  {t('totalInterestOnRepayments')}:
                </Text>
                <Text style={styles.repaymentInterestValue}>
                  {formatLocalizedCurrency(totalRepaymentWithInterest - totalRepaymentAmount, language)}
                </Text>
              </View>
            
              <View style={styles.divider} />
            
              {/* Individual Repayment Details */}
              {repayments.map((repayment: any, index: number) => {
                const repaymentResult = repaymentResults.find((r: any) => r.index === index);
                if (!repaymentResult) return null;
              
                return (
                  <View key={index} style={styles.repaymentItem}>
                    <Text style={styles.repaymentItemTitle}>
                      Repayment {index + 1}
                    </Text>
                  
                    <View style={styles.repaymentItemRow}>
                      <Text style={styles.repaymentItemLabel}>
                        Date:
                      </Text>
                      <Text style={styles.repaymentItemValue}>
                        {formatBSDate(repayment.date)}
                      </Text>
                    </View>
                  
                    <View style={styles.repaymentItemRow}>
                      <Text style={styles.repaymentItemLabel}>
                        Amount:
                      </Text>
                      <Text style={styles.repaymentItemValue}>
                        {formatLocalizedCurrency(parseFloat(repayment.amount), language)}
                      </Text>
                    </View>
                  
                    <View style={styles.repaymentItemRow}>
                      <Text style={styles.repaymentItemLabel}>
                        Period:
                      </Text>
                      <Text style={styles.repaymentItemValue}>
                        {formatTimePeriod(repaymentResult.years, repaymentResult.months, repaymentResult.days)}
                      </Text>
                    </View>
                  
                    <View style={styles.repaymentItemRow}>
                      <Text style={styles.repaymentItemLabel}>
                        Interest:
                      </Text>
                      <Text style={styles.repaymentInterestValue}>
                        {formatLocalizedCurrency(repaymentResult.totalInterest, language)}
                      </Text>
                    </View>
                  
                    <View style={styles.repaymentItemRow}>
                      <Text style={styles.repaymentItemLabel}>
                        Total Value:
                      </Text>
                      <Text style={styles.repaymentItemValueBold}>
                        {formatLocalizedCurrency(repaymentResult.finalAmount, language)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            
              <View style={styles.divider} />
            
              <View style={styles.repaymentTotalRow}>
                <Text style={styles.repaymentTotalLabel}>
                  {t('totalRepaymentValue')}:
                </Text>
                <Text style={styles.repaymentTotalValue}>
                  {formatLocalizedCurrency(totalRepaymentWithInterest, language)}
                </Text>
              </View>
            </View>
          )}
        
          {/* Net Balance */}
          <View style={[styles.netBalanceCard, { 
            borderColor: netBalance > 0 ? '#1E40AF' : '#DC2626',
          }]}>
            <Text style={styles.netBalanceTitle}>
              Net Balance ({endDateFormatted})
            </Text>
          
            <View style={styles.netBalanceRow}>
              <Text style={styles.netBalanceLabel}>
                {t('totalAmountDue')}:
              </Text>
              <Text style={styles.netBalanceValue}>
                {formatLocalizedCurrency(finalAmount, language)}
              </Text>
            </View>
          
            {hasRepayment && (
              <View style={styles.netBalanceRow}>
                <Text style={styles.netBalanceLabel}>
                  {t('lessRepayment')}:
                </Text>
                <Text style={styles.netBalanceRepaymentValue}>
                  -{formatLocalizedCurrency(totalRepaymentWithInterest, language)}
                </Text>
              </View>
            )}
          
            <View style={styles.divider} />
          
            <View style={styles.netBalanceRow}>
              <Text style={styles.netBalanceFinalLabel}>
                {t('netAmountReceive')}:
              </Text>
              <Text style={[styles.netBalanceFinalValue, { 
                color: netBalance > 0 ? '#1E40AF' : '#DC2626',
              }]}>
                {formatLocalizedCurrency(Math.abs(netBalance), language)}
              </Text>
            </View>
          
            {netBalance < 0 && (
              <Text style={styles.overpaidText}>
                {t('overpaidBy')} {formatLocalizedCurrency(Math.abs(netBalance), language)}
              </Text>
            )}
          </View>
        
          {/* Calculation Note */}
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>गणना नोट:</Text>
            <Text style={styles.noteText}>
              {t('calculationNote')} {formatNumber(years, 'en')} {years === 1 ? t('year') : t('years')}
              {months > 0 && `, ${t('simpleInterestFor')} ${formatNumber(months, 'en')} ${months === 1 ? t('month') : t('months')}`}
              {days > 0 && `, ${t('simpleDailyInterestFor')} ${formatNumber(days, 'en')} ${days === 1 ? t('day') : t('days')}`}.
              {hasRepayment && ` ${repayments.length > 1 ? 'Multiple repayments' : 'Repayment'} interest calculated from repayment date(s) to current date using the same formula.`}
            </Text>
          </View>
        
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>
              {t('backToKarobar')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  simpleHeader: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: getResponsivePadding(),
    paddingBottom: getResponsiveSize(12, 15, 18),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backIconButton: {
    padding: getResponsiveSize(6, 8, 10),
    marginRight: getResponsiveSize(10, 15, 18),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  headerTextContainer: {
    flex: 1,
  },
  simpleHeaderTitle: {
    fontSize: getResponsiveFontSize(22),
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    flexShrink: 1,
  },
  simpleHeaderSubtitle: {
    fontSize: getResponsiveFontSize(16),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    flexShrink: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: getResponsiveSize(30, 40, 50),
  },
  resultsContainer: {
    padding: getResponsivePadding(),
  },
  largeInfoCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(12, 16, 20),
    padding: getResponsiveSize(16, 24, 28),
    marginBottom: getResponsiveSize(12, 16, 20),
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: '#475569',
    marginBottom: getResponsiveSize(8, 12, 16),
    textAlign: 'center',
    flexShrink: 1,
  },
  cardValue: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    color: '#1E40AF',
    textAlign: 'center',
    flexShrink: 1,
  },
  timeContainer: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(8, 12, 16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: getResponsiveSize(12, 16, 20),
    marginBottom: getResponsiveSize(12, 16, 20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeRow: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(6, 8, 10),
    alignItems: isSmallScreen ? 'flex-start' : 'center',
  },
  timeLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.3,
    flex: isSmallScreen ? undefined : 1,
    marginBottom: isSmallScreen ? 4 : 0,
  },
  timeValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#1E40AF',
    letterSpacing: 0.5,
    textAlign: isSmallScreen ? 'left' : 'right',
    flexShrink: 1,
  },
  breakdownCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(12, 16, 20),
    padding: getResponsiveSize(12, 16, 20),
    marginBottom: getResponsiveSize(12, 16, 20),
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
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: getResponsiveSize(8, 12, 16),
    textAlign: 'center',
    flexShrink: 1,
  },
  breakdownItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: getResponsiveSize(8, 12, 16),
    padding: getResponsiveSize(8, 12, 16),
    marginBottom: getResponsiveSize(6, 8, 10),
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  breakdownItemLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#334155',
    marginBottom: 2,
    flexShrink: 1,
  },
  breakdownItemPeriod: {
    fontSize: getResponsiveFontSize(14),
    color: '#64748B',
    marginBottom: 4,
    flexShrink: 1,
  },
  breakdownItemValue: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: 'bold',
    color: '#1E40AF',
    flexShrink: 1,
  },
  highlightCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: getResponsiveSize(12, 16, 20),
    padding: getResponsiveSize(16, 24, 28),
    marginBottom: getResponsiveSize(12, 16, 20),
    borderWidth: 3,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  highlightCardTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: getResponsiveSize(8, 12, 16),
    textAlign: 'center',
    flexShrink: 1,
  },
  highlightCardValue: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'bold',
    color: '#1E40AF',
    textAlign: 'center',
    flexShrink: 1,
  },
  finalAmountCard: {
    backgroundColor: '#1E40AF',
    borderRadius: getResponsiveSize(16, 20, 24),
    padding: getResponsiveSize(20, 28, 32),
    marginBottom: getResponsiveSize(16, 20, 24),
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  finalAmountTitle: {
    fontSize: getResponsiveFontSize(22),
    fontWeight: '600',
    color: 'white',
    marginBottom: getResponsiveSize(12, 16, 20),
    textAlign: 'center',
    flexShrink: 1,
  },
  finalAmountValue: {
    fontSize: getResponsiveFontSize(32),
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flexShrink: 1,
  },
  repaymentCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(12, 16, 20),
    padding: getResponsiveSize(16, 20, 24),
    marginBottom: getResponsiveSize(12, 16, 20),
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  repaymentCardTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: '#475569',
    marginBottom: getResponsiveSize(12, 16, 20),
    textAlign: 'center',
    flexShrink: 1,
  },
  repaymentSummaryRow: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(8, 12, 16),
    alignItems: isSmallScreen ? 'flex-start' : 'center',
  },
  repaymentSummaryLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#64748B',
    flex: isSmallScreen ? undefined : 1,
    marginBottom: isSmallScreen ? 4 : 0,
  },
  repaymentSummaryValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#1E40AF',
    textAlign: isSmallScreen ? 'left' : 'right',
    flexShrink: 1,
  },
  repaymentInterestValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#DC2626',
    textAlign: isSmallScreen ? 'left' : 'right',
    flexShrink: 1,
  },
  repaymentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: getResponsiveSize(8, 12, 16),
    padding: getResponsiveSize(12, 16, 20),
    marginBottom: getResponsiveSize(8, 12, 16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  repaymentItemTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: getResponsiveSize(8, 12, 16),
    textAlign: 'center',
    flexShrink: 1,
  },
  repaymentItemRow: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(6, 8, 10),
    alignItems: isSmallScreen ? 'flex-start' : 'center',
  },
  repaymentItemLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#64748B',
    flex: isSmallScreen ? undefined : 1,
    marginBottom: isSmallScreen ? 2 : 0,
  },
  repaymentItemValue: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: '#1E40AF',
    textAlign: isSmallScreen ? 'left' : 'right',
    flexShrink: 1,
  },
  repaymentItemValueBold: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '800',
    color: '#1E40AF',
    textAlign: isSmallScreen ? 'left' : 'right',
    flexShrink: 1,
  },
  repaymentTotalRow: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(6, 8, 10),
    alignItems: isSmallScreen ? 'flex-start' : 'center',
  },
  repaymentTotalLabel: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: '#1E40AF',
    flex: isSmallScreen ? undefined : 1,
    marginBottom: isSmallScreen ? 4 : 0,
  },
  repaymentTotalValue: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '800',
    color: '#1E40AF',
    textAlign: isSmallScreen ? 'left' : 'right',
    flexShrink: 1,
  },
  netBalanceCard: {
    backgroundColor: 'white',
    borderRadius: getResponsiveSize(12, 16, 20),
    padding: getResponsiveSize(16, 24, 28),
    marginBottom: getResponsiveSize(16, 20, 24),
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  netBalanceTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: getResponsiveSize(12, 16, 20),
    textAlign: 'center',
    flexShrink: 1,
  },
  netBalanceRow: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(8, 12, 16),
    alignItems: isSmallScreen ? 'flex-start' : 'center',
  },
  netBalanceLabel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#64748B',
    flex: isSmallScreen ? undefined : 1,
    marginBottom: isSmallScreen ? 4 : 0,
  },
  netBalanceValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#1E40AF',
    textAlign: isSmallScreen ? 'left' : 'right',
    flexShrink: 1,
  },
  netBalanceRepaymentValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#DC2626',
    textAlign: isSmallScreen ? 'left' : 'right',
    flexShrink: 1,
  },
  netBalanceFinalLabel: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: '#1E40AF',
    flex: isSmallScreen ? undefined : 1,
    marginBottom: isSmallScreen ? 4 : 0,
  },
  netBalanceFinalValue: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '800',
    textAlign: isSmallScreen ? 'left' : 'right',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: getResponsiveSize(8, 12, 16),
  },
  overpaidText: {
    fontSize: getResponsiveFontSize(14),
    color: '#DC2626',
    textAlign: 'center',
    marginTop: getResponsiveSize(6, 8, 10),
    fontStyle: 'italic',
    flexShrink: 1,
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: getResponsiveSize(8, 12, 16),
    padding: getResponsiveSize(16, 20, 24),
    marginBottom: getResponsiveSize(20, 24, 28),
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  noteTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: getResponsiveSize(6, 8, 10),
    flexShrink: 1,
  },
  noteText: {
    fontSize: getResponsiveFontSize(15),
    color: '#92400E',
    lineHeight: getResponsiveSize(20, 22, 24),
    flexShrink: 1,
  },
  backButton: {
    backgroundColor: '#1E40AF',
    borderRadius: getResponsiveSize(8, 12, 16),
    paddingVertical: getResponsiveSize(14, 18, 22),
    paddingHorizontal: getResponsiveSize(20, 24, 28),
    alignItems: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  backButtonText: {
    color: 'white',
    fontSize: getResponsiveFontSize(18),
    fontWeight: 'bold',
    flexShrink: 1,
  },
});
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatLocalizedCurrency, formatNumber } from '@/utils/number-utils';

interface ResultCardProps {
  principal: number;
  totalInterest: number;
  finalAmount: number;
  years: number;
  months: number;
  days: number;
  totalDays: number;
  yearlyInterest: number;
  monthlyInterest: number;
  dailyInterest: number;
  isVisible: boolean;
}

export default function ResultCard({
  principal,
  totalInterest,
  finalAmount,
  years,
  months,
  days,
  totalDays,
  yearlyInterest,
  monthlyInterest,
  dailyInterest,
  isVisible
}: ResultCardProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  
  if (!isVisible) return null;

  const formatTimePeriod = () => {
    const parts = [];
    if (years > 0) parts.push(`${formatNumber(years, language)} ${years === 1 ? t('year') : t('years')}`);
    if (months > 0) parts.push(`${formatNumber(months, language)} ${months === 1 ? t('month') : t('months')}`);
    if (days > 0) parts.push(`${formatNumber(days, language)} ${days === 1 ? t('day') : t('days')}`);
    
    if (parts.length === 0) return 'No time period';
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts.join(' and ');
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.text 
      }
    ]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{t('calculationResults')}</Text>
      
      <View style={[styles.timeContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>{t('timePeriod')}:</Text>
        <Text style={[styles.timeValue, { color: theme.colors.text }]}>{formatTimePeriod()}</Text>
      </View>
      
      <View style={[styles.timeContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>{t('totalDays')}:</Text>
        <Text style={[styles.timeValue, { color: theme.colors.text }]}>{formatNumber(totalDays, language)} {t('days')}</Text>
      </View>
      
      <View style={styles.resultRow}>
        <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>{t('principalAmountResult')}:</Text>
        <Text style={[styles.resultValue, { color: theme.colors.text }]}>{formatLocalizedCurrency(principal, language)}</Text>
      </View>
      
      {/* Interest Breakdown */}
      {(yearlyInterest > 0 || monthlyInterest > 0 || dailyInterest > 0) && (
        <View style={[styles.interestBreakdown, { 
          backgroundColor: theme.colors.warning + '20',
          borderLeftColor: theme.colors.warning 
        }]}>
          <Text style={[styles.breakdownTitle, { color: theme.colors.text }]}>{t('interestBreakdown')}:</Text>
          
          {yearlyInterest > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
                {t('yearlyInterest')} ({formatNumber(years, language)} {years === 1 ? t('year') : t('years')}):
              </Text>
              <Text style={[styles.breakdownValue, { color: theme.colors.text }]}>{formatLocalizedCurrency(yearlyInterest, language)}</Text>
            </View>
          )}
          
          {monthlyInterest > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
                {t('monthlyInterest')} ({formatNumber(months, language)} {months === 1 ? t('month') : t('months')}):
              </Text>
              <Text style={[styles.breakdownValue, { color: theme.colors.text }]}>{formatLocalizedCurrency(monthlyInterest, language)}</Text>
            </View>
          )}
          
          {dailyInterest > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: theme.colors.textSecondary }]}>
                {t('dailyInterest')} ({formatNumber(days, language)} {days === 1 ? t('day') : t('days')}):
              </Text>
              <Text style={[styles.breakdownValue, { color: theme.colors.text }]}>{formatLocalizedCurrency(dailyInterest, language)}</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.resultRow}>
        <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>{t('totalInterest')}:</Text>
        <Text style={[styles.resultValue, styles.interestValue, { color: theme.colors.primary }]}>{formatLocalizedCurrency(totalInterest, language)}</Text>
      </View>
      
      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
      
      <View style={styles.resultRow}>
        <Text style={[styles.resultLabel, styles.totalLabel, { color: theme.colors.text }]}>{t('finalAmount')}:</Text>
        <Text style={[styles.resultValue, styles.totalValue, { color: theme.colors.text }]}>{formatLocalizedCurrency(finalAmount, language)}</Text>
      </View>
      
      <View style={[styles.calculationNote, { 
        backgroundColor: theme.colors.primary + '20',
        borderLeftColor: theme.colors.primary 
      }]}>
        <Text style={[styles.noteText, { color: theme.colors.textSecondary }]}>
          {t('calculationNote')} {formatNumber(years, language)} {years === 1 ? t('year') : t('years')}
          {months > 0 && `, ${t('simpleInterestFor')} ${formatNumber(months, language)} ${months === 1 ? t('month') : t('months')}`}
          {days > 0 && `, ${t('simpleDailyInterestFor')} ${formatNumber(days, language)} ${days === 1 ? t('day') : t('days')}`}.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 8,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 15,
  },
  resultValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  interestValue: {
    // color will be set by theme
  },
  interestBreakdown: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    flex: 1,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  calculationNote: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  noteText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
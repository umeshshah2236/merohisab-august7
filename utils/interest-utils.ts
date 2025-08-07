import { BSDate, getDateBreakdown, DateBreakdown } from './date-utils';
import { Language } from '@/contexts/LanguageContext';
import { formatLocalizedCurrency } from './number-utils';

/**
 * Calculate compound interest with new logic:
 * - Compound interest yearly on principal for full years
 * - Simple interest for leftover months on principal after full years
 * - Simple interest for leftover days on principal after full years (not after monthly interest)
 * 
 * @param principal - Initial amount
 * @param monthlyRate - Monthly interest rate (e.g., 1 for 1%)
 * @param startDate - Start date in BS
 * @param endDate - End date in BS
 * @returns Object containing calculated values
 */
export function calculateCompoundInterest(
  principal: number,
  monthlyRate: number,
  startDate: BSDate,
  endDate: BSDate
): {
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
  breakdown: DateBreakdown;
} {
  // Get the exact breakdown of time period
  const breakdown = getDateBreakdown(startDate, endDate);
  
  if (breakdown.totalDays <= 0) {
    return {
      principal,
      totalInterest: 0,
      finalAmount: principal,
      years: 0,
      months: 0,
      days: 0,
      totalDays: 0,
      yearlyInterest: 0,
      monthlyInterest: 0,
      dailyInterest: 0,
      breakdown
    };
  }
  
  // Calculate annual rate from monthly rate
  const annualRate = monthlyRate * 12;
  const annualRateDecimal = annualRate / 100;
  const monthlyRateDecimal = monthlyRate / 100;
  const dailyRate = monthlyRateDecimal / 30; // Daily rate = monthly rate / 30
  
  // Step 1: Apply compound interest for complete years
  let principalAfterYears = principal;
  let yearlyInterest = 0;
  
  for (let i = 0; i < breakdown.years; i++) {
    const yearInterest = principalAfterYears * annualRateDecimal;
    yearlyInterest += yearInterest;
    principalAfterYears += yearInterest;
  }
  
  // Step 2: Apply simple interest for remaining full months
  // Use principal after years, not after adding monthly interest
  let monthlyInterest = 0;
  if (breakdown.months > 0) {
    monthlyInterest = principalAfterYears * monthlyRateDecimal * breakdown.months;
  }
  
  // Step 3: Apply simple interest for remaining days
  // Use principal after years, not after adding monthly interest
  let dailyInterest = 0;
  if (breakdown.days > 0) {
    dailyInterest = principalAfterYears * dailyRate * breakdown.days;
  }
  
  const totalInterest = yearlyInterest + monthlyInterest + dailyInterest;
  const finalAmount = principalAfterYears + monthlyInterest + dailyInterest;
  
  return {
    principal,
    totalInterest: Math.round(totalInterest * 100) / 100,
    finalAmount: Math.round(finalAmount * 100) / 100,
    years: breakdown.years,
    months: breakdown.months,
    days: breakdown.days,
    totalDays: breakdown.totalDays,
    yearlyInterest: Math.round(yearlyInterest * 100) / 100,
    monthlyInterest: Math.round(monthlyInterest * 100) / 100,
    dailyInterest: Math.round(dailyInterest * 100) / 100,
    breakdown
  };
}

/**
 * Format number as currency based on language
 */
export function formatCurrency(amount: number, language: Language = 'en'): string {
  return formatLocalizedCurrency(amount, language);
}
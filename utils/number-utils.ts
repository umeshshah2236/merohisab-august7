/**
 * Utility functions for number localization between English and Nepali
 */

// Mapping for English to Nepali numerals
const englishToNepaliMap: Record<string, string> = {
  '0': '०',
  '1': '१',
  '2': '२',
  '3': '३',
  '4': '४',
  '5': '५',
  '6': '६',
  '7': '७',
  '8': '८',
  '9': '९'
};

// Mapping for Nepali to English numerals
const nepaliToEnglishMap: Record<string, string> = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9'
};

/**
 * Convert English numerals to Nepali numerals
 */
export function convertToNepaliNumerals(text: string): string {
  return text.replace(/[0-9]/g, (digit) => englishToNepaliMap[digit] || digit);
}

/**
 * Convert Nepali numerals to English numerals
 */
export function convertToEnglishNumerals(text: string): string {
  return text.replace(/[०-९]/g, (digit) => nepaliToEnglishMap[digit] || digit);
}

/**
 * Format number based on language preference
 * Note: Always returns English numerals for better readability
 */
export function formatNumber(num: number | string, language: 'en' | 'ne'): string {
  const numStr = num.toString();
  // Always return English numerals regardless of language
  return numStr;
}

/**
 * Parse localized number string to actual number
 */
export function parseLocalizedNumber(text: string): number {
  const englishText = convertToEnglishNumerals(text);
  return parseFloat(englishText) || 0;
}

/**
 * Format currency amount with proper numerals
 * Note: Always keeps numerical values in English for better readability
 */
export function formatLocalizedCurrency(amount: number, language: 'en' | 'ne'): string {
  // Always use English locale to ensure English numerals
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(amount);
  
  if (language === 'ne') {
    // Keep numbers in English but use Nepali currency symbol
    return `रु ${formatted}`;
  } else {
    return `NPR ${formatted}`;
  }
}
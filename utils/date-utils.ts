import { BS_CALENDAR_DATA } from '@/constants/calendar';

export interface BSDate {
  year: string;
  month: number;
  day: number;
}

export interface DateBreakdown {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

/**
 * Calculate the exact breakdown of years, months, and days between two BS dates
 * Uses the improved formula: same-day duration + day adjustment
 */
export function getDateBreakdown(startDate: BSDate, endDate: BSDate): DateBreakdown {
  // Normalize dates to ensure all values are numbers
  const normalizedStartDate: BSDate = {
    year: startDate.year,
    month: typeof startDate.month === 'string' ? parseInt(startDate.month) : startDate.month,
    day: typeof startDate.day === 'string' ? parseInt(startDate.day) : startDate.day
  };
  
  const normalizedEndDate: BSDate = {
    year: endDate.year,
    month: typeof endDate.month === 'string' ? parseInt(endDate.month) : endDate.month,
    day: typeof endDate.day === 'string' ? parseInt(endDate.day) : endDate.day
  };
  
  const totalDays = getDaysBetweenDates(normalizedStartDate, normalizedEndDate);
  
  if (totalDays <= 0) {
    return { years: 0, months: 0, days: 0, totalDays: 0 };
  }

  // Step 1: Calculate same-day duration (from start date to same day in end month/year)
  const startYear = parseInt(normalizedStartDate.year);
  const endYear = parseInt(normalizedEndDate.year);
  const startMonth = normalizedStartDate.month;
  const endMonth = normalizedEndDate.month;
  const startDay = normalizedStartDate.day;
  const endDay = normalizedEndDate.day;

  // Calculate total months between start and end (same day)
  let totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth);
  
  // Step 2: Adjust for day difference
  let finalDays = endDay - startDay;
  
  // If end day is less than start day, we need to borrow from the month
  if (finalDays < 0) {
    totalMonths--; // Reduce one month
    
    // Get days in the previous month to borrow from
    let borrowMonth = endMonth - 1;
    let borrowYear = endYear;
    
    if (borrowMonth < 1) {
      borrowMonth = 12;
      borrowYear--;
    }
    
    const daysInBorrowMonth = getMaxDayForMonthYear(borrowYear.toString(), borrowMonth);
    finalDays = daysInBorrowMonth + finalDays; // Add borrowed days
  }
  
  // Step 3: Convert total months to years and months
  const finalYears = Math.floor(totalMonths / 12);
  const finalMonths = totalMonths % 12;
  
  return {
    years: finalYears,
    months: finalMonths,
    days: finalDays,
    totalDays
  };
}

/**
 * Get the next month date
 */
function getNextMonth(date: BSDate): BSDate {
  const currentYear = parseInt(date.year);
  // Ensure day is treated as number
  const dayNumber = typeof date.day === 'string' ? parseInt(date.day) : date.day;
  
  if (date.month === 12) {
    return {
      year: (currentYear + 1).toString(),
      month: 1,
      day: dayNumber
    };
  } else {
    return {
      ...date,
      month: date.month + 1,
      day: dayNumber
    };
  }
}

/**
 * Calculate the total number of days between two BS dates
 */
export function getDaysBetweenDates(startDate: BSDate, endDate: BSDate): number {
  // Convert both dates to days since a reference point
  const startDays = getDaysSinceReference(startDate);
  const endDays = getDaysSinceReference(endDate);
  
  // Return the difference
  return endDays - startDays;
}

/**
 * Calculate days since 2070/01/01 (as a reference point)
 */
function getDaysSinceReference(date: BSDate): number {
  let totalDays = 0;
  const currentYear = parseInt(date.year);
  
  // Add days from complete years
  for (let year = 2070; year < currentYear; year++) {
    const yearStr = year.toString();
    if (BS_CALENDAR_DATA[yearStr]) {
      const yearData = BS_CALENDAR_DATA[yearStr];
      if (Array.isArray(yearData)) {
        totalDays += yearData.reduce((sum: number, days: number) => sum + days, 0);
      }
    }
  }
  
  // Add days from months in the current year
  const currentYearData = BS_CALENDAR_DATA[date.year];
  if (Array.isArray(currentYearData)) {
    for (let month = 0; month < date.month - 1; month++) {
      if (currentYearData[month] !== undefined) {
        totalDays += currentYearData[month];
      }
    }
  }
  
  // Add days from the current month - ensure day is treated as number
  const dayNumber = typeof date.day === 'string' ? parseInt(date.day) : date.day;
  totalDays += dayNumber - 1;
  
  return totalDays;
}

/**
 * Validate if a BS date is valid
 */
export function isValidBSDate(date: BSDate): boolean {
  // Check if year exists in our data
  if (!BS_CALENDAR_DATA[date.year]) {
    return false;
  }
  
  // Check if month is valid (1-12)
  if (date.month < 1 || date.month > 12) {
    return false;
  }
  
  // Check if day is valid for that month and year
  const daysInMonth = BS_CALENDAR_DATA[date.year][date.month - 1];
  if (date.day < 1 || date.day > daysInMonth) {
    return false;
  }
  
  return true;
}

/**
 * Get the maximum day for a given month and year
 */
export function getMaxDayForMonthYear(year: string, month: number): number {
  if (BS_CALENDAR_DATA[year] && month >= 1 && month <= 12) {
    return BS_CALENDAR_DATA[year][month - 1];
  }
  return 30; // Default fallback
}

/**
 * Format timestamp to human-readable format using Nepal timezone
 * Shows date in format: 2082/04/09 (2:32PM) as NPT time
 */
export function formatTimeAgo(dateString: string): string {
  try {
    // Parse the date string
    const inputDate = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(inputDate.getTime())) {
      return 'No recent activity';
    }
    
    // Get Nepal timezone offset (GMT+5:45 = 345 minutes)
    const nepalOffsetMs = 345 * 60 * 1000;
    
    // Convert to Nepal timezone
    const dateInNepal = new Date(inputDate.getTime() + nepalOffsetMs);
    
    // Convert to BS date
    const bsDate = convertADToBS(dateInNepal);
    if (!bsDate) {
      return 'No recent activity';
    }
    
    // Format time
    const hours = dateInNepal.getHours();
    const minutes = dateInNepal.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    // Format as: 2082/04/09 (2:32PM)
    const yearStr = bsDate.year;
    const monthStr = bsDate.month.toString().padStart(2, '0');
    const dayStr = bsDate.day.toString().padStart(2, '0');
    
    return `${yearStr}/${monthStr}/${dayStr} (${displayHours}:${displayMinutes}${ampm})`;
    
  } catch (error) {
    console.error('Error formatting time ago:', error, 'for date:', dateString);
    return 'No recent activity';
  }
}

/**
 * Convert AD date to BS date (improved conversion for Nepal timezone)
 * Uses current date reference: 2082 Shrawan 9 corresponds to July 24, 2025 NPT
 */
export function convertADToBS(adDate: Date): BSDate | null {
  try {
    const year = adDate.getFullYear();
    const month = adDate.getMonth() + 1;
    const day = adDate.getDate();
    
    // Reference point: July 25, 2025 = 2082 Shrawan 9 (updated based on user feedback)
    // This gives us a more accurate conversion base
    const referenceAD = new Date(2025, 6, 25); // July 25, 2025 (month is 0-indexed)
    const referenceBS = { year: '2082', month: 4, day: 9 }; // Shrawan 9, 2082
    
    // Calculate days difference from reference
    const inputDate = new Date(year, month - 1, day);
    const daysDiff = Math.floor((inputDate.getTime() - referenceAD.getTime()) / (1000 * 60 * 60 * 24));
    
    // Start from reference BS date and add/subtract days
    let resultYear = parseInt(referenceBS.year);
    let resultMonth = referenceBS.month;
    let resultDay = referenceBS.day + daysDiff;
    
    // Adjust for negative days (going backwards)
    while (resultDay < 1) {
      resultMonth--;
      if (resultMonth < 1) {
        resultMonth = 12;
        resultYear--;
      }
      
      const yearStr = resultYear.toString();
      if (BS_CALENDAR_DATA[yearStr] && resultMonth >= 1 && resultMonth <= 12) {
        resultDay += BS_CALENDAR_DATA[yearStr][resultMonth - 1];
      } else {
        resultDay += 30; // Fallback
      }
    }
    
    // Adjust for excess days (going forwards)
    const yearStr = resultYear.toString();
    while (BS_CALENDAR_DATA[yearStr] && resultMonth >= 1 && resultMonth <= 12) {
      const maxDaysInMonth = BS_CALENDAR_DATA[yearStr][resultMonth - 1];
      if (resultDay <= maxDaysInMonth) {
        break;
      }
      
      resultDay -= maxDaysInMonth;
      resultMonth++;
      if (resultMonth > 12) {
        resultMonth = 1;
        resultYear++;
      }
    }
    
    // Final validation
    const finalYearStr = resultYear.toString();
    if (!BS_CALENDAR_DATA[finalYearStr] || resultMonth < 1 || resultMonth > 12 || resultDay < 1) {
      // Fallback to approximate conversion if our calculation fails
      return getApproximateBSDate(adDate);
    }
    
    return {
      year: finalYearStr,
      month: resultMonth,
      day: resultDay
    };
    
  } catch (error) {
    console.error('Error converting AD to BS:', error);
    return getApproximateBSDate(adDate);
  }
}

/**
 * Fallback approximate BS conversion
 */
function getApproximateBSDate(adDate: Date): BSDate | null {
  try {
    const year = adDate.getFullYear();
    const month = adDate.getMonth() + 1;
    const day = adDate.getDate();
    
    // Basic conversion logic (approximate)
    let bsYear: string;
    let bsMonth: number;
    let bsDay: number;
    
    // Determine BS year - BS New Year typically falls around April 13-15
    if (month > 4 || (month === 4 && day >= 14)) {
      bsYear = (year + 57).toString();
    } else {
      bsYear = (year + 56).toString();
    }
    
    // Approximate month and day conversion
    if (month === 1) {
      bsMonth = 9; // Poush
      bsDay = Math.min(day + 16, 30);
    } else if (month === 2) {
      bsMonth = 10; // Magh
      bsDay = Math.min(day + 17, 30);
    } else if (month === 3) {
      bsMonth = 11; // Falgun
      bsDay = Math.min(day + 15, 30);
    } else if (month === 4) {
      if (day < 14) {
        bsMonth = 12; // Chaitra
        bsDay = Math.min(day + 17, 30);
        bsYear = (parseInt(bsYear) - 1).toString();
      } else {
        bsMonth = 1; // Baishakh
        bsDay = day - 13;
      }
    } else if (month === 5) {
      bsMonth = 1; // Baishakh
      bsDay = day + 17;
      if (bsDay > 31) {
        bsMonth = 2; // Jestha
        bsDay = bsDay - 31;
      }
    } else if (month === 6) {
      bsMonth = 2; // Jestha
      bsDay = day + 17;
      if (bsDay > 31) {
        bsMonth = 3; // Ashadh
        bsDay = bsDay - 31;
      }
    } else if (month === 7) {
      bsMonth = 3; // Ashadh
      bsDay = day + 16;
      if (bsDay > 31) {
        bsMonth = 4; // Shrawan
        bsDay = bsDay - 31;
      }
    } else if (month === 8) {
      bsMonth = 4; // Shrawan
      bsDay = day + 16;
      if (bsDay > 32) {
        bsMonth = 5; // Bhadra
        bsDay = bsDay - 32;
      }
    } else if (month === 9) {
      bsMonth = 5; // Bhadra
      bsDay = day + 15;
      if (bsDay > 31) {
        bsMonth = 6; // Ashwin
        bsDay = bsDay - 31;
      }
    } else if (month === 10) {
      bsMonth = 6; // Ashwin
      bsDay = day + 14;
      if (bsDay > 31) {
        bsMonth = 7; // Kartik
        bsDay = bsDay - 31;
      }
    } else if (month === 11) {
      bsMonth = 7; // Kartik
      bsDay = day + 13;
      if (bsDay > 29) {
        bsMonth = 8; // Mangsir
        bsDay = bsDay - 29;
      }
    } else {
      bsMonth = 8; // Mangsir
      bsDay = day + 14;
      if (bsDay > 30) {
        bsMonth = 9; // Poush
        bsDay = bsDay - 30;
      }
    }
    
    // Validate and adjust the date according to our BS calendar data
    if (BS_CALENDAR_DATA[bsYear] && bsMonth >= 1 && bsMonth <= 12) {
      const maxDaysInMonth = BS_CALENDAR_DATA[bsYear][bsMonth - 1];
      if (bsDay > maxDaysInMonth) {
        bsMonth++;
        bsDay = 1;
        if (bsMonth > 12) {
          bsMonth = 1;
          bsYear = (parseInt(bsYear) + 1).toString();
        }
      }
      if (bsDay < 1) {
        bsDay = 1;
      }
    }
    
    // Final validation
    if (!BS_CALENDAR_DATA[bsYear] || bsMonth < 1 || bsMonth > 12 || bsDay < 1) {
      return null;
    }
    
    return {
      year: bsYear,
      month: bsMonth,
      day: bsDay
    };
    
  } catch (error) {
    console.error('Error in approximate BS conversion:', error);
    return null;
  }
}
import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Animated, Platform, ScrollView, RefreshControl, Alert, Modal, InteractionManager } from 'react-native';
import TextInputWithDoneBar from '@/components/TextInputWithDoneBar';
import { Stack, router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Clock, Edit3, Trash2, MoreHorizontal, UserX, Calculator, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { useAuth } from '@/contexts/AuthContext';
import { useTransactionEntries, TransactionEntry as DBTransactionEntry } from '@/contexts/TransactionEntriesContext';
import { useCustomers } from '@/contexts/CustomersContext';
import { getCurrentNepalDate, getAccurateCurrentBSDate } from '@/utils/current-date-utils';
import { convertADToBS } from '@/utils/date-utils';
import EditTransactionModal from '@/components/EditTransactionModal';
import { NetworkStatus } from '@/components/NetworkDiagnostic';
import { capitalizeFirstLetters, getCapitalizedFirstName } from '@/utils/string-utils';
import DatePicker from '@/components/DatePicker';
import { BSDate } from '@/utils/date-utils';
import { firestoreHelpers } from '@/lib/firebase';

interface TransactionEntry {
  id: string;
  date: string;
  time: string;
  amount: number;
  type: 'given' | 'received';
  description?: string;
  balance: number;
}

interface DayGroup {
  date: string;
  displayDate: string;
  entries: TransactionEntry[];
}

export default React.memo(function CustomerDetailScreen() {
  const { theme, isDark } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { setFirebaseUser, getAllTransactionEntries } = useTransactionEntries();
  const transactionEntriesContext = useTransactionEntries();
  const { deleteCustomer, customers, fetchCustomers, addCustomer } = useCustomers();

  // Real-time update method for external calls
  const updateTransactions = useCallback((newTransactions: TransactionEntry[]) => {
    console.log('Customer detail: Receiving real-time transaction update', newTransactions.length);
    setTransactionEntries(newTransactions);
    setDisplayedTransactionEntries(newTransactions);
    setHasFreshTransactionData(true);
  }, []);

  // Register this instance globally for real-time updates
  useEffect(() => {
    (globalThis as any).__customerDetailInstance = {
      updateTransactions
    };
    
    return () => {
      // Clean up when component unmounts
      if ((globalThis as any).__customerDetailInstance) {
        delete (globalThis as any).__customerDetailInstance;
      }
    };
  }, [updateTransactions]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
    const bounceAnim = useRef(new Animated.Value(0)).current;
    
  const customerName = params.customerName as string || 'Customer';
  const customerPhone = params.customerPhone as string || '';
  
  // SUPER FAST: Use global cache instead of slow JSON parsing from params
  const getCachedTransactions = () => {
    const cache = (globalThis as any).__customerDetailCache;
    if (cache && cache.customerName === customerName && cache.transactions) {
      console.log('Customer detail: Using FAST global cache for transactions');
      return cache.transactions;
    }
    // Fallback to params if cache not available (shouldn't happen with new approach)
    return params.transactions ? JSON.parse(params.transactions as string) : [];
  };
  
  const initialTransactions = getCachedTransactions();

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<DBTransactionEntry | null>(null);
  const [transactionEntries, setTransactionEntries] = useState<DBTransactionEntry[]>(initialTransactions);
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Interest calculation modal state
  const [interestModalVisible, setInterestModalVisible] = useState(false);
  const [interestRate, setInterestRate] = useState('');
  const [endDate, setEndDate] = useState<BSDate>(() => {
    // Default to current date in BS format
    const currentBSDate = getAccurateCurrentBSDate();
    return {
      year: currentBSDate.year,
      month: currentBSDate.month,
      day: currentBSDate.day
    };
  });
  
  // State to prevent blinking - maintain previous data while loading new data
  const [displayedTransactionEntries, setDisplayedTransactionEntries] = useState<DBTransactionEntry[]>(initialTransactions);
  // Track previous data to compare for changes
  const [previousTransactionCount, setPreviousTransactionCount] = useState(initialTransactions.length);
  const [previousTotalAmount, setPreviousTotalAmount] = useState(
    initialTransactions.reduce((sum: number, entry: DBTransactionEntry) => sum + entry.amount, 0)
  );

  const getCustomerTransactions = useCallback(
    async (customerName: string) => {
      if (!transactionEntriesContext?.getCustomerTransactions) {
        return [];
      }
      return await transactionEntriesContext.getCustomerTransactions(customerName);
    },
    [transactionEntriesContext]
  );
  
  // Function to check if data has actually changed
  const hasDataChanged = useCallback((newEntries: DBTransactionEntry[]) => {
    const currentTransactionCount = newEntries.length;
    const currentTotalAmount = newEntries.reduce((sum, entry) => sum + entry.amount, 0);
    
    const hasChanged = currentTransactionCount !== previousTransactionCount || 
                      currentTotalAmount !== previousTotalAmount;
    
    console.log('Data change check:', {
      currentTransactionCount,
      previousTransactionCount,
      currentTotalAmount,
      previousTotalAmount,
      hasChanged
    });
    
    return hasChanged;
  }, [previousTransactionCount, previousTotalAmount]);

  console.log('Customer detail: customerName:', customerName);
  console.log('Customer detail: customerPhone:', customerPhone);

  // Handle interest calculation
  const handleCalculateInterest = useCallback(async () => {
    if (!interestRate || !endDate) {
      Alert.alert(t('error'), t('pleaseEnterAllFields'));
      return;
    }

    const rate = parseFloat(interestRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert(t('error'), t('pleaseEnterValidInterestRate'));
      return;
    }

    // Close modal first
    setInterestModalVisible(false);

    try {
      // Use require to avoid dynamic import issues
      const { calculateCompoundInterest } = require('@/utils/interest-utils');
      
      // Use endDate directly as it's already in BSDate format
      const endDateBS = {
        year: endDate.year,
        month: endDate.month,
        day: endDate.day
      };

      // Get all customer transactions and separate into "given" and "received"
      const customerTransactions = displayedTransactionEntries.filter(transaction =>
        transaction.customer_name.toLowerCase() === customerName.toLowerCase()
      );

      const givenTransactions = customerTransactions.filter(t => t.transaction_type === 'given');
      const receivedTransactions = customerTransactions.filter(t => t.transaction_type === 'received');

      console.log('Interest calculation - Given transactions:', givenTransactions.length);
      console.log('Interest calculation - Received transactions:', receivedTransactions.length);

      // Calculate total amount due from all "given" transactions
      let totalAmountDue = 0;
      let earliestGivenDate: string | null = null;

      givenTransactions.forEach((transaction) => {
        // Parse transaction date (assuming BS format YYYY-MM-DD)
        const dateParts = transaction.transaction_date.split('-');
        const transactionDateBS = {
          year: dateParts[0],
          month: parseInt(dateParts[1]),
          day: parseInt(dateParts[2])
        };

        // Calculate interest on this amount from transaction date to end date
        const result = calculateCompoundInterest(
          transaction.amount,
          rate, // Monthly rate
          transactionDateBS,
          endDateBS
        );

        totalAmountDue += result.finalAmount;

        // Track earliest date for display
        if (!earliestGivenDate || transaction.transaction_date < earliestGivenDate) {
          earliestGivenDate = transaction.transaction_date;
        }
      });

      // Calculate total repayments with interest
      let totalRepaymentWithInterest = 0;

      receivedTransactions.forEach((transaction) => {
        // Parse transaction date (assuming BS format YYYY-MM-DD)
        const dateParts = transaction.transaction_date.split('-');
        const transactionDateBS = {
          year: dateParts[0],
          month: parseInt(dateParts[1]),
          day: parseInt(dateParts[2])
        };

        // Calculate interest on this repayment from repayment date to end date
        const result = calculateCompoundInterest(
          transaction.amount,
          rate, // Monthly rate
          transactionDateBS,
          endDateBS
        );

        totalRepaymentWithInterest += result.finalAmount;
      });

      // Calculate net balance (like repayment calculator)
      const netBalance = totalAmountDue - totalRepaymentWithInterest;

      // Navigate to calculator results with the calculated data
      router.push({
        pathname: '/(tabs)/(home)/calculator/results',
        params: {
          // Main calculation results
          principal: givenTransactions.reduce((sum, t) => sum + t.amount, 0).toString(),
          totalInterest: (totalAmountDue - givenTransactions.reduce((sum, t) => sum + t.amount, 0)).toString(),
          finalAmount: totalAmountDue.toString(),
          
          // Net balance results
          netBalance: netBalance.toString(),
          totalRepaymentAmount: receivedTransactions.reduce((sum, t) => sum + t.amount, 0).toString(),
          totalRepaymentWithInterest: totalRepaymentWithInterest.toString(),
          
          // Dates for display
          startDateYear: earliestGivenDate ? (earliestGivenDate as string).split('-')[0] : endDateBS.year.toString(),
          startDateMonth: earliestGivenDate ? (earliestGivenDate as string).split('-')[1] : endDateBS.month.toString(),
          startDateDay: earliestGivenDate ? (earliestGivenDate as string).split('-')[2] : endDateBS.day.toString(),
          endDateYear: endDateBS.year.toString(),
          endDateMonth: endDateBS.month.toString(),
          endDateDay: endDateBS.day.toString(),
          
          // Rate and type
          monthlyRate: rate.toString(),
          calculationType: 'customer_interest',
          customerName: customerName,
          
          // Transaction counts for display
          givenTransactionCount: givenTransactions.length.toString(),
          receivedTransactionCount: receivedTransactions.length.toString(),
        }
      });

    } catch (error) {
      console.error('Interest calculation error:', error);
              Alert.alert(t('error'), t('calculationError'));
    }
  }, [interestRate, endDate, displayedTransactionEntries, customerName, t]);

  // Convert date to proper BS format with date and time using Nepal timezone
  const formatNepaliDateTime = React.useCallback((dateString: string, createdAtString?: string): string => {
    try {
      console.log('Formatting date:', dateString, 'created_at:', createdAtString);
      
      // Get the actual transaction time from created_at if available
      let transactionTime: Date;
      let useCreatedAtForTime = false;
      
      if (createdAtString) {
        const createdDate = new Date(createdAtString);
        if (!isNaN(createdDate.getTime())) {
          transactionTime = createdDate;
          useCreatedAtForTime = true;
          console.log('Using created_at time:', createdDate.toISOString());
        } else {
          // Fallback to current time if created_at is invalid
          transactionTime = new Date();
          console.log('Invalid created_at, using current time:', transactionTime.toISOString());
        }
      } else {
        // Use current time if no created_at available
        transactionTime = new Date();
        console.log('No created_at, using current time:', transactionTime.toISOString());
      }
      
      // Try to parse the loan_date as BS date first
      let displayDate: string;
      if (dateString && dateString.includes('-')) {
        // If dateString is in BS format (YYYY-MM-DD), use it directly
        const dateParts = dateString.split('-');
        if (dateParts.length === 3) {
          const year = dateParts[0];
          const month = parseInt(dateParts[1]);
          const day = parseInt(dateParts[2]);
          
          if (year && month >= 1 && month <= 12 && day >= 1 && day <= 32) {
            displayDate = `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
            console.log('Using BS date from loan_date:', displayDate);
          } else {
            // Fallback to current BS date
            const currentBS = getAccurateCurrentBSDate();
            displayDate = `${currentBS.year}/${currentBS.month.toString().padStart(2, '0')}/${currentBS.day.toString().padStart(2, '0')}`;
            console.log('Invalid BS date parts, using current BS date:', displayDate);
          }
        } else {
          // Fallback to current BS date
          const currentBS = getAccurateCurrentBSDate();
          displayDate = `${currentBS.year}/${currentBS.month.toString().padStart(2, '0')}/${currentBS.day.toString().padStart(2, '0')}`;
          console.log('Invalid BS date format, using current BS date:', displayDate);
        }
      } else {
        // Try to convert AD date to BS
        const adDate = new Date(dateString);
        if (!isNaN(adDate.getTime())) {
          const bsDate = convertADToBS(adDate);
          if (bsDate) {
            displayDate = `${bsDate.year}/${bsDate.month.toString().padStart(2, '0')}/${bsDate.day.toString().padStart(2, '0')}`;
            console.log('Converted AD to BS date:', displayDate);
          } else {
            // Fallback to current BS date
            const currentBS = getAccurateCurrentBSDate();
            displayDate = `${currentBS.year}/${currentBS.month.toString().padStart(2, '0')}/${currentBS.day.toString().padStart(2, '0')}`;
            console.log('AD to BS conversion failed, using current BS date:', displayDate);
          }
        } else {
          // Fallback to current BS date
          const currentBS = getAccurateCurrentBSDate();
          displayDate = `${currentBS.year}/${currentBS.month.toString().padStart(2, '0')}/${currentBS.day.toString().padStart(2, '0')}`;
          console.log('Invalid date string, using current BS date:', displayDate);
        }
      }
      
      // Format time in 12-hour format using the actual transaction time
      const hours = transactionTime.getHours();
      const minutes = transactionTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      
      const formattedTime = `${displayHours}:${displayMinutes}${ampm}`;
      const result = `${displayDate} (${formattedTime})`;
      
      console.log('Formatted Nepal date-time result:', result);
      return result;
    } catch (error) {
      console.error('Error formatting Nepali date-time:', error, 'for date:', dateString);
      // Return a safe fallback
      const currentBS = getAccurateCurrentBSDate();
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      
      return `${currentBS.year}/${currentBS.month.toString().padStart(2, '0')}/${currentBS.day.toString().padStart(2, '0')} (${displayHours}:${displayMinutes}${ampm})`;
    }
  }, []);

  // Move formatNepaliDate function for day headers
  const formatNepaliDate = React.useCallback((date: Date): string => {
    try {
      // Convert the actual date to BS format
      const bsDate = convertADToBS(date);
      if (!bsDate) {
        console.error('Failed to convert date to BS format, using current BS date');
        // Fallback to current BS date
        const currentBS = getAccurateCurrentBSDate();
        const monthNames = [
          t('baishakh'), t('jestha'), t('ashadh'), t('shrawan'), t('bhadra'), t('ashwin'),
          t('kartik'), t('mangsir'), t('poush'), t('magh'), t('falgun'), t('chaitra')
        ];
        const monthName = monthNames[currentBS.month - 1];
        return `${currentBS.day.toString().padStart(2, '0')} ${monthName} ${currentBS.year}`;
      }
      
      const monthNames = [
        t('baishakh'), t('jestha'), t('ashadh'), t('shrawan'), t('bhadra'), t('ashwin'),
        t('kartik'), t('mangsir'), t('poush'), t('magh'), t('falgun'), t('chaitra')
      ];
      const monthName = monthNames[bsDate.month - 1];
      return `${bsDate.day.toString().padStart(2, '0')} ${monthName} ${bsDate.year}`;
    } catch (error) {
      console.error('Error formatting Nepali date:', error);
      // Return a safe fallback using current BS date
      const currentBS = getAccurateCurrentBSDate();
      const monthNames = [
        t('baishakh'), t('jestha'), t('ashadh'), t('shrawan'), t('bhadra'), t('ashwin'),
        t('kartik'), t('mangsir'), t('poush'), t('magh'), t('falgun'), t('chaitra')
      ];
      const monthName = monthNames[currentBS.month - 1];
      return `${currentBS.day.toString().padStart(2, '0')} ${monthName} ${currentBS.year}`;
    }
  }, [t]);

  // Update both contexts with current user
  useEffect(() => {
    if (user) {
      setFirebaseUser(user);
      if (transactionEntriesContext?.setFirebaseUser) {
        transactionEntriesContext.setFirebaseUser(user);
      }
    }
  }, [user, setFirebaseUser, transactionEntriesContext]);

  // Background refresh function - exactly like dashboard
  const handleBackgroundRefresh = useCallback(async () => {
    console.log('Customer detail: handleBackgroundRefresh called');
    
    try {
      console.log('Customer detail: Starting data refresh...');
      
      if (customerName && user) {
        console.log('Customer detail: Fetching ALL transaction entries (like dashboard)');
        try {
          // Use getAllTransactionEntries like dashboard does
          const allEntries = await getAllTransactionEntries();
          console.log('Customer detail: All data fetched successfully');
          console.log('Customer detail: All entries count:', allEntries.length);
          
          // Filter for this customer locally (like dashboard approach)
          const customerEntries = allEntries.filter(entry => 
            entry.customer_name.toLowerCase() === customerName.toLowerCase()
          );
          console.log('Customer detail: Filtered entries count:', customerEntries.length);
          
          // Always update the data (like dashboard does)
          setTransactionEntries(customerEntries);
          setDisplayedTransactionEntries(customerEntries);
          setHasFreshTransactionData(true);
          
          // REAL-TIME CACHE UPDATE: Also update global cache for instant dashboard updates
          (globalThis as any).__customerDetailCache = {
            customerName: customerName,
            transactions: customerEntries,
            cachedAt: Date.now()
          };
          console.log('Customer detail: Updated global cache with fresh data');
          
          // Check if data has actually changed for logging
          const dataChanged = hasDataChanged(customerEntries);
          if (dataChanged) {
            console.log('Customer detail: Data has changed, updating content');
            // Update previous values for next comparison
            setPreviousTransactionCount(customerEntries.length);
            setPreviousTotalAmount(customerEntries.reduce((sum, entry) => sum + entry.amount, 0));
          } else {
            console.log('Customer detail: No data changes detected');
          }
          
          setNetworkError(false); // Clear network error on successful fetch
        } catch (error) {
          console.error('Customer detail: Error refreshing data:', error);
          // Check if it's a network error
          if (error instanceof Error && 
              (error.message.includes('Network request failed') || 
               error.message.includes('Failed to fetch') ||
               error.message.includes('timeout'))) {
            setNetworkError(true);
          }
        }
      }
    } catch (error) {
      console.error('Customer detail: Error in background refresh:', error);
      // Check if it's a network error
      if (error instanceof Error && 
          (error.message.includes('Network request failed') || 
           error.message.includes('Failed to fetch') ||
           error.message.includes('timeout'))) {
        setNetworkError(true);
      }
    }
  }, [getAllTransactionEntries, customerName, user, hasDataChanged]);

  // Manual refresh function - shows loading indicators
  const handleRefresh = useCallback(async () => {
    console.log('Manual refresh called');
    setIsRefreshing(true);
    setNetworkError(false);
    
    try {
      console.log('Customer detail: Manual refreshing all data...');
      // Refresh transaction entries
      if (customerName && user) {
        console.log('Customer detail: Manual refreshing ALL transaction entries (like dashboard)');
        try {
          // Use getAllTransactionEntries like dashboard does
          const allEntries = await getAllTransactionEntries();
          console.log('Manual refreshed ALL transaction entries:', allEntries.length);
          
          // Filter for this customer locally (like dashboard approach)
          const customerEntries = allEntries.filter(entry => 
            entry.customer_name.toLowerCase() === customerName.toLowerCase()
          );
          console.log('Manual refreshed customer transaction entries:', customerEntries.length);
          
          // For manual refresh, always update displayed content
          setTransactionEntries(customerEntries);
          setDisplayedTransactionEntries(customerEntries);
          setHasFreshTransactionData(true);
          
          // Update previous values for next comparison
          setPreviousTransactionCount(customerEntries.length);
          setPreviousTotalAmount(customerEntries.reduce((sum, entry) => sum + entry.amount, 0));
          
          setNetworkError(false); // Clear network error on successful fetch
        } catch (error) {
          console.error('Error manual refreshing transaction entries:', error);
          // Check if it's a network error
          if (error instanceof Error && 
              (error.message.includes('Network request failed') || 
               error.message.includes('Failed to fetch') ||
               error.message.includes('timeout'))) {
            setNetworkError(true);
          }
        }
      }
    } catch (error) {
      console.error('Error manual refreshing data:', error);
      // Check if it's a network error
      if (error instanceof Error && 
          (error.message.includes('Network request failed') || 
           error.message.includes('Failed to fetch') ||
           error.message.includes('timeout'))) {
        setNetworkError(true);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [getCustomerTransactions, customerName, user]);

  // Track if screen is focused
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(true); // Start as true since we have initial data
  const [hasRedirected, setHasRedirected] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [hasFreshTransactionData, setHasFreshTransactionData] = useState(true); // Start as true


  // Track if screen is focused - REAL-TIME DATA UPDATES
  useFocusEffect(
    React.useCallback(() => {
      console.log('Customer detail: Screen focused - checking for data updates');
      setIsScreenFocused(true);
      
      // SMART REFRESH: Always refresh when coming back to screen to catch new transactions
      // This ensures data is always current when user adds/edits transactions and comes back
      console.log('Customer detail: Refreshing data to ensure latest transactions are shown');
      handleBackgroundRefresh();

      return () => {
        console.log('Customer detail: Screen unfocused');
        setIsScreenFocused(false);
      };
    }, [handleBackgroundRefresh]) // Include dependency for real-time updates
  );







  // Get customer transactions and calculate running balance - OPTIMIZED
  const customerTransactions = useMemo(() => {
    console.log('Customer detail: FAST calculation of customer transactions');
    console.log('Displayed transaction entries:', displayedTransactionEntries.length);
    
    // FAST MODE: Always show data if available (no waiting for fresh data flag)
    if (displayedTransactionEntries.length === 0) {
      console.log('Customer detail: No transaction data available');
      return [];
    }
    
    // Use displayed transaction entries to prevent blinking
    const customerTransactions = displayedTransactionEntries.filter(transaction => 
      transaction.customer_name.toLowerCase() === customerName.toLowerCase()
    );

    // Sort by created_at timestamp (oldest first) to calculate running balance correctly
    // This ensures new entries are processed in the correct chronological order
    const sortedTransactions = customerTransactions.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateA - dateB;
    });

    let runningBalance = 0;
    const transactions: TransactionEntry[] = [];

    sortedTransactions.forEach(transaction => {
      // Calculate balance impact
      const balanceImpact = transaction.transaction_type === 'given' 
        ? transaction.amount  // YOU GAVE: customer owes you more
        : -transaction.amount; // YOU GOT: customer owes you less
      
      runningBalance += balanceImpact;

      const formattedTime = formatNepaliDateTime(transaction.transaction_date, transaction.created_at);
      console.log('Transaction entry:', {
        id: transaction.id,
        transaction_date: transaction.transaction_date,
        created_at: transaction.created_at,
        formatted_time: formattedTime
      });
      
      transactions.push({
        id: transaction.id,
        date: transaction.transaction_date,
        time: formattedTime,
        amount: transaction.amount,
        type: transaction.transaction_type,
        description: transaction.description || undefined,
        balance: runningBalance
      });
    });

    // Sort by created_at timestamp (newest first) for UI display
    // This ensures new entries always appear at the top
    return transactions.sort((a, b) => {
      const entryA = sortedTransactions.find(transaction => transaction.id === a.id);
      const entryB = sortedTransactions.find(transaction => transaction.id === b.id);
      const dateA = new Date(entryA?.created_at || a.date).getTime();
      const dateB = new Date(entryB?.created_at || b.date).getTime();
      return dateB - dateA; // Newest first
    });
  }, [displayedTransactionEntries, customerName, formatNepaliDateTime]);

  // Cache for expensive date conversions
  const dateConversionCache = useRef(new Map<string, string>()).current;
  
  // Group transactions by date - OPTIMIZED with caching
  const groupedTransactions = useMemo(() => {
    const groups: DayGroup[] = [];
    const dateGroups = new Map<string, TransactionEntry[]>();

    customerTransactions.forEach(transaction => {
              // Use the transaction's created_at timestamp for grouping instead of transaction_date
        const transactionEntry = displayedTransactionEntries.find(entry => entry.id === transaction.id);
        let groupingDate: Date;
        let dateKey: string;
        
        if (transactionEntry?.created_at) {
          groupingDate = new Date(transactionEntry.created_at);
          const adDateKey = groupingDate.toISOString().split('T')[0];
          
          // Check cache first for expensive BS conversion
          if (dateConversionCache.has(adDateKey)) {
            dateKey = dateConversionCache.get(adDateKey)!;
          } else {
            // Convert to BS date for proper grouping (expensive operation)
            const bsDate = convertADToBS(groupingDate);
            if (bsDate) {
              dateKey = `${bsDate.year}-${bsDate.month.toString().padStart(2, '0')}-${bsDate.day.toString().padStart(2, '0')}`;
            } else {
              dateKey = adDateKey;
            }
            // Cache the result
            dateConversionCache.set(adDateKey, dateKey);
          }
        } else {
          // Fallback: try to parse the transaction date
          if (transaction.date && transaction.date.includes('-')) {
            // If it's in BS format, use it directly for grouping
            dateKey = transaction.date;
            groupingDate = new Date(); // Use current date for display purposes
          } else {
            groupingDate = new Date(transaction.date);
            const adDateKey = groupingDate.toISOString().split('T')[0];
            
            // Check cache first
            if (dateConversionCache.has(adDateKey)) {
              dateKey = dateConversionCache.get(adDateKey)!;
            } else {
              const bsDate = convertADToBS(groupingDate);
              if (bsDate) {
                dateKey = `${bsDate.year}-${bsDate.month.toString().padStart(2, '0')}-${bsDate.day.toString().padStart(2, '0')}`;
              } else {
                dateKey = adDateKey;
              }
              // Cache the result
              dateConversionCache.set(adDateKey, dateKey);
            }
          }
        }
      
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, []);
      }
      dateGroups.get(dateKey)!.push(transaction);
    });

    // Convert to array and sort by BS date (newest first)
    Array.from(dateGroups.entries())
      .sort(([a], [b]) => {
        // Parse BS dates for proper sorting
        const parseBS = (dateStr: string) => {
          if (dateStr.includes('-') && dateStr.split('-').length === 3) {
            const [year, month, day] = dateStr.split('-').map(Number);
            return { year, month, day };
          }
          // Fallback to AD date parsing
          const date = new Date(dateStr);
          const bsDate = convertADToBS(date);
          if (bsDate) {
            return { 
              year: parseInt(bsDate.year), 
              month: bsDate.month, 
              day: bsDate.day 
            };
          }
          return { year: 0, month: 0, day: 0 };
        };
        
        const bsA = parseBS(a);
        const bsB = parseBS(b);
        
        // Sort by year, then month, then day (newest first)
        if (bsB.year !== bsA.year) return bsB.year - bsA.year;
        if (bsB.month !== bsA.month) return bsB.month - bsA.month;
        return bsB.day - bsA.day;
      })
      .forEach(([dateKey, entries]) => {
        // Parse the BS date from dateKey for display
        let displayDate: string;
        let entryBSDate: { year: number; month: number; day: number } | null = null;
        
        if (dateKey.includes('-') && dateKey.split('-').length === 3) {
          const [year, month, day] = dateKey.split('-').map(Number);
          entryBSDate = { year, month, day };
          
          const monthNames = [
            t('baishakh'), t('jestha'), t('ashadh'), t('shrawan'), t('bhadra'), t('ashwin'),
            t('kartik'), t('mangsir'), t('poush'), t('magh'), t('falgun'), t('chaitra')
          ];
          const monthName = monthNames[month - 1];
          displayDate = `${day.toString().padStart(2, '0')} ${monthName} ${year}`;
        } else {
          // Fallback to AD date parsing
          const date = new Date(dateKey);
          const bsDate = convertADToBS(date);
          if (bsDate) {
            entryBSDate = { 
              year: parseInt(bsDate.year), 
              month: bsDate.month, 
              day: bsDate.day 
            };
          }
          displayDate = formatNepaliDate(date);
        }
        
        // Check if it's today
        const currentBSDate = getAccurateCurrentBSDate();
        if (entryBSDate && 
            entryBSDate.year === parseInt(currentBSDate.year) && 
            entryBSDate.month === currentBSDate.month && 
            entryBSDate.day === currentBSDate.day) {
          displayDate = `${displayDate}`;
        }

        groups.push({
          date: dateKey,
          displayDate,
          entries: entries.sort((a, b) => {
            // Sort entries within the same day by created_at timestamp (newest first)
            const entryA = transactionEntries.find(transaction => transaction.id === a.id);
            const entryB = transactionEntries.find(transaction => transaction.id === b.id);
            const dateA = new Date(entryA?.created_at || a.date).getTime();
            const dateB = new Date(entryB?.created_at || b.date).getTime();
            return dateB - dateA; // Newest first within the day
          })
        });
      });

    return groups;
  }, [customerTransactions, formatNepaliDate, transactionEntries, t]);

  // Force re-calculation when transaction data changes
  useEffect(() => {
    console.log('Customer detail: Transaction data changed, recalculating customer transactions');
    console.log('Current transaction count:', displayedTransactionEntries.length);
    console.log('Force update count:', forceUpdate);
  }, [displayedTransactionEntries, forceUpdate]);

  // Calculate customer balance directly (like dashboard approach)
  // Always calculate balance - no loading dependencies
  let customerBalance = 0;
  
  const customerBalanceTransactions = displayedTransactionEntries.filter(transaction => 
    transaction.customer_name.toLowerCase() === customerName.toLowerCase()
  );
  
  customerBalanceTransactions.forEach(transaction => {
    const balanceImpact = transaction.transaction_type === 'given' 
      ? transaction.amount  // YOU GAVE: customer owes you more
      : -transaction.amount; // YOU GOT: customer owes you less
    customerBalance += balanceImpact;
  });



  useEffect(() => {
    if (customerTransactions.length === 0) {
      const startBounceAnimation = () => {
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setTimeout(startBounceAnimation, 500);
        });
      };

      startBounceAnimation();
    }
  }, [bounceAnim, customerTransactions.length]);

  const getInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const getFirstName = (name: string): string => {
    return getCapitalizedFirstName(name);
  };

  const handleToReceive = () => {
    // REMOVED: Haptic feedback now called in onPress for consistency
    // REMOVED: Delay for instant response like dashboard
    
    // Find the customer by name to get their ID
    const customerToReceive = customers.find(c => c.name === customerName);
    
    if (!customerToReceive) {
      Alert.alert(t('error'), t('customerNotFound'));
      return;
    }
    
    // Navigate to Add Receive Entry screen
    console.log('TO RECEIVE pressed for:', customerName, 'with ID:', customerToReceive.id);
    router.push({
      pathname: '/(tabs)/(home)/add-receive-entry',
      params: {
        customerName,
        customerPhone,
        customerId: customerToReceive.id
      }
    });
  };

  const handleToGive = () => {
    // REMOVED: Haptic feedback now called in onPress for consistency
    // REMOVED: Delay for instant response like dashboard
    
    // Find the customer by name to get their ID
    const customerToGive = customers.find(c => c.name === customerName);
    
    if (!customerToGive) {
      Alert.alert(t('error'), t('customerNotFound'));
      return;
    }
    
    // Navigate to Add Give Entry screen
    console.log('TO GIVE pressed for:', customerName, 'with ID:', customerToGive.id);
    router.push({
      pathname: '/(tabs)/(home)/add-give-entry',
      params: {
        customerName,
        customerPhone,
        customerId: customerToGive.id
      }
    });
  };

  const handleEditTransaction = (entry: TransactionEntry) => {
    // REMOVED: Duplicate haptic feedback (now called in onPress)
    // REMOVED: Delay for instant response like dashboard
    
    console.log('Edit button clicked for entry:', entry);
    console.log('Available transaction entries:', transactionEntries);
    
    // Find the corresponding transaction entry from the transaction entries
    const transactionEntry = transactionEntries.find(transaction => transaction.id === entry.id);
    
    if (transactionEntry) {
      console.log('Found transaction entry for editing:', transactionEntry);
      
      // Navigate to dedicated edit screen based on transaction type
      const editParams = {
        customerName,
        customerPhone,
        editTransactionId: transactionEntry.id,
        editAmount: transactionEntry.amount.toString(),
        editDescription: transactionEntry.description || '',
        editDate: transactionEntry.transaction_date
      };
      
      console.log('Navigating with edit params:', editParams);
      
      if (entry.type === 'received') {
        router.push({
          pathname: '/(tabs)/(home)/edit-receive-entry',
          params: editParams
        });
      } else {
        router.push({
          pathname: '/(tabs)/(home)/edit-give-entry',
          params: editParams
        });
      }
    } else {
      console.error('Could not find transaction entry for editing:', entry.id);
              Alert.alert(t('error'), t('couldNotFindTransactionForEditing'));
    }
  };

  const handleDeleteTransaction = async (entry: TransactionEntry) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Find corresponding transaction entry for delete functionality
    const transactionEntry = transactionEntries.find(te => 
      te.amount === entry.amount && 
      te.transaction_type === entry.type &&
      Math.abs(new Date(te.transaction_date).getTime() - new Date(entry.date).getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
    );
    
    if (!transactionEntry) {
      Alert.alert(t('error'), t('transactionNotFound'));
      return;
    }

    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this ${entry.type === 'given' ? 'You Gave' : 'You Got'} transaction of रु${entry.amount.toLocaleString()}?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (transactionEntriesContext?.deleteTransactionEntry) {
                await transactionEntriesContext.deleteTransactionEntry(transactionEntry.id);
                console.log('Transaction deleted successfully, background refreshing data...');
                // Set transaction activity flag for dashboard smart refresh
                (globalThis as any).__lastTransactionActivity = Date.now();
                // CRITICAL FIX: Invalidate customer cache since transaction was modified
                delete (globalThis as any).__customerSummariesCache;
                await handleBackgroundRefresh();
                Alert.alert(t('success'), t('transactionDeletedSuccessfully'));
              }
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert(t('error'), error instanceof Error ? error.message : t('failedToDeleteTransaction'));
            }
          }
        }
      ]
    );
  };

  const toggleTransactionActions = (transactionId: string) => {
    setExpandedTransactionId(expandedTransactionId === transactionId ? null : transactionId);
  };

  const handleEditCustomer = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log('Edit customer pressed for:', customerName);
    
    // Find the customer by name to get their ID
    // Use case-insensitive search to be more reliable
    const customerToEdit = customers.find(c => 
      c.name.toLowerCase().trim() === customerName.toLowerCase().trim()
    );
    
    if (!customerToEdit) {
      console.error('Customer not found for editing:', customerName);
      console.log('Available customers:', customers.map(c => ({ id: c.id, name: c.name })));
      Alert.alert(t('error'), t('customerNotFoundForEditing'));
      return;
    }
    
    console.log('Found customer to edit:', customerToEdit);
    
    const navigationParams = {
      editMode: 'true',
      customerId: customerToEdit.id,
      customerName: customerToEdit.name, // Use the exact name from database
      customerPhone: customerToEdit.phone || ''
    };
    
    console.log('=== NAVIGATING TO CUSTOMER FORM ===');
    console.log('Navigation params:', navigationParams);
    
    router.push({
      pathname: '/(tabs)/(home)/customer-form',
      params: navigationParams
    });
  };

  const handleDeleteCustomer = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete ${customerName}?\n\nThis will also delete all transaction history with this customer. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Attempting to delete customer:', customerName);
              console.log('Available customers:', customers.map(c => ({ id: c.id, name: c.name })));
              
              // Find the customer by name (case-insensitive search)
              let customerToDelete = customers.find(c => 
                c.name.toLowerCase().trim() === customerName.toLowerCase().trim()
              );
              
              console.log('Found customer to delete:', customerToDelete);
              
              if (!customerToDelete) {
                console.log('Customer not found in current list, refreshing customers...');
                console.log('Current customer names:', customers.map(c => c.name));
                
                // CRITICAL FIX: Create the missing customer automatically
                try {
                  console.log('🆕 Creating missing customer record for:', customerName);
                  const newCustomer = await addCustomer({
                    name: customerName.trim(),
                    phone: customerPhone || null,
                    customer_type: 'customer' as 'customer' | 'supplier'
                  });
                  
                  console.log('✅ Customer created successfully:', newCustomer.data);
                  
                  // Use the newly created customer for deletion
                  customerToDelete = {
                    id: newCustomer.data?.id || '',
                    name: customerName.trim(),
                    phone: customerPhone || null,
                    customer_type: 'customer' as 'customer' | 'supplier'
                  };
                  
                  console.log('🎯 Using newly created customer for deletion:', customerToDelete);
                  
                } catch (createError) {
                  console.error('❌ Failed to create customer:', createError);
                  throw new Error(`Customer "${customerName}" not found and could not be created. Error: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
                }
              }
              
              if (deleteCustomer && customerToDelete?.id) {
                console.log('🗑️ Starting comprehensive customer deletion...');
                console.log('Customer ID:', customerToDelete.id);
                console.log('Customer Name:', customerName);
                
                // STEP 1: Delete all transactions for this customer
                console.log('🔄 Step 1: Deleting all customer transactions...');
                const customerTransactions = transactionEntries.filter(t => 
                  t.customer_name.toLowerCase().trim() === customerName.toLowerCase().trim()
                );
                
                console.log(`Found ${customerTransactions.length} transactions to delete for customer: ${customerName}`);
                
                // Delete each transaction
                for (const transaction of customerTransactions) {
                  try {
                    console.log('Deleting transaction:', transaction.id, 'Amount:', transaction.amount);
                    await firestoreHelpers.deleteTransactionEntry(transaction.id);
                    console.log('✅ Transaction deleted:', transaction.id);
                  } catch (transactionError) {
                    console.error('❌ Failed to delete transaction:', transaction.id, transactionError);
                    // Continue deleting other transactions even if one fails
                  }
                }
                
                console.log('✅ All customer transactions deleted');
                
                // STEP 2: Delete the customer record
                console.log('🔄 Step 2: Deleting customer record...');
                await deleteCustomer(customerToDelete.id);
                console.log('✅ Customer record deleted successfully');
                
                // STEP 3: Refresh both transaction entries and customers context
                console.log('🔄 Step 3: Refreshing transaction entries context...');
                try {
                  // Trigger a refresh of transaction entries so dashboard gets updated data
                  if (transactionEntriesContext?.getAllTransactionEntries) {
                    await transactionEntriesContext.getAllTransactionEntries();
                    console.log('✅ Transaction entries context refreshed');
                  }
                } catch (refreshError) {
                  console.error('⚠️ Failed to refresh transaction entries context:', refreshError);
                  // Don't fail the deletion if refresh fails
                }
                
                console.log('🔄 Step 3b: Refreshing customers context...');
                try {
                  // Also refresh customers context to remove the deleted customer
                  await fetchCustomers();
                  console.log('✅ Customers context refreshed');
                } catch (refreshError) {
                  console.error('⚠️ Failed to refresh customers context:', refreshError);
                  // Don't fail the deletion if refresh fails
                }
                
                // STEP 4: Clear all caches and set refresh flag
                console.log('🧹 Step 4: Clearing caches...');
                delete (globalThis as any).__customerSummariesCache;
                delete (globalThis as any).__customerDetailCache;
                delete (globalThis as any).__dashboardCache;
                delete (globalThis as any).__preloadedData;
                // Force dashboard to refresh when we return
                (globalThis as any).__forceRefreshDashboard = true;
                // Set additional flag to indicate customer was deleted
                (globalThis as any).__deletedCustomerName = customerName;
                console.log('✅ All caches cleared and refresh flag set');
                
                Alert.alert(t('success'), `${t('customerAndTransactionsDeleted')}: "${customerName}" (${customerTransactions.length} ${customerTransactions.length === 1 ? t('transaction') : t('transactions')})`, [
                  {
                    text: t('ok'),
                    onPress: () => {
                      // Don't set loading flags - smooth navigation like Settings
                      delete (globalThis as any).__isReturningFromStatement;
                      
                      // Android-specific: Use InteractionManager for smooth navigation after deletion
                      if (Platform.OS === 'android') {
                        InteractionManager.runAfterInteractions(() => {
                          router.replace('/(tabs)/(home)/dashboard');
                        });
                      } else {
                        // iOS: Direct navigation
                        router.replace('/(tabs)/(home)/dashboard');
                      }
                    }
                  }
                ]);
              } else {
                console.error('Delete customer function not available or invalid customer ID');
                throw new Error('Unable to delete customer - missing required data');
              }
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert(t('error'), error instanceof Error ? error.message : t('failedToDeleteCustomer'));
            }
          }
        }
      ]
    );
  };

  const handleGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Remove any existing flags that might cause loading states
    delete (globalThis as any).__isReturningFromStatement;
    
    // Android-specific: Use InteractionManager for smooth back navigation
    if (Platform.OS === 'android') {
      InteractionManager.runAfterInteractions(() => {
        router.back(); // Use router.back() for proper stack navigation
      });
    } else {
      // iOS: Direct back navigation
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: "Home",
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: 'white',
          headerLeft: () => (
            <TouchableOpacity
              onPress={handleGoBack}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
          ),
          // CRITICAL: Android background to prevent white flash during back navigation
          contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
          cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
        }} 
      />

      {/* Modern Professional Header */}
              <View style={[styles.modernHeader, { paddingTop: Platform.OS === 'ios' ? insets.top + 60 : insets.top + 20 }]}>
        {/* Gradient Background */}
        <LinearGradient
          colors={['#1E293B', '#334155']}
          style={styles.headerBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* Header Content */}
        <View style={styles.modernHeaderContent}>
          {/* Customer Profile Section */}
          <View style={styles.customerProfileSection}>
            <View style={styles.avatarSection}>
              <View style={styles.modernAvatar}>
                <Text style={styles.modernAvatarText}>{getInitials(customerName)}</Text>
              </View>
            </View>
            
            <View style={styles.customerInfo}>
              <View style={styles.nameAndActions}>
                <Text 
                  style={[
                    styles.customerNameText, 
                    Platform.OS === 'android' && styles.androidResponsiveName
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={Platform.OS === 'android'}
                  minimumFontScale={Platform.OS === 'android' ? 0.7 : 1}
                >
                  {getFirstName(customerName)}
                </Text>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.modernActionButton}
                    onPress={() => {
                      // INSTANT haptic feedback for maximum responsiveness
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      handleEditCustomer();
                    }}
                    activeOpacity={0.2}
                    hitSlop={{ top: 20, bottom: 20, left: 16, right: 16 }}
                    pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
                    delayPressIn={0}
                    delayPressOut={0}
                  >
                    <Edit3 size={14} color="#64748B" strokeWidth={2} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modernActionButton, styles.deleteActionButton]}
                    onPress={() => {
                      // INSTANT haptic feedback for maximum responsiveness
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      handleDeleteCustomer();
                    }}
                    activeOpacity={0.2}
                    hitSlop={{ top: 20, bottom: 20, left: 16, right: 16 }}
                    pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
                    delayPressIn={0}
                    delayPressOut={0}
                  >
                    <UserX size={14} color="#EF4444" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Calculate Interest Button - Below Customer Name */}
              <TouchableOpacity 
                style={styles.calculateInterestButtonBelowName}
                onPress={() => {
                  // INSTANT haptic feedback for maximum responsiveness
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setInterestModalVisible(true);
                }}
                activeOpacity={0.2}
                hitSlop={{ top: 20, bottom: 20, left: 16, right: 16 }}
                pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
                delayPressIn={0}
                delayPressOut={0}
              >
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']} 
                  style={styles.calculateInterestGradientBelowName}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Calculator size={12} color="white" strokeWidth={2} />
                  <Text style={styles.calculateInterestTextBelowName}>{t('calculateInterest')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {/* Balance Display - Moved to Right Side */}
            <View style={styles.balanceDisplaySectionRight}>
              <Text style={[styles.balanceLabel, {
                color: customerBalance > 0 ? '#10B981' : customerBalance < 0 ? '#EF4444' : '#64748B'
              }]}>
                {customerBalance > 0 ? t('toReceive') : customerBalance < 0 ? t('toGive') : t('allSettled')}
              </Text>
              <Text style={[styles.balanceAmount, {
                color: customerBalance > 0 ? '#10B981' : customerBalance < 0 ? '#EF4444' : '#64748B'
              }]}>
                रु{Math.abs(customerBalance).toLocaleString()}
              </Text>
            </View>
          </View>

        </View>
      </View>

      <SafeAreaView style={[styles.content, { backgroundColor: theme.colors.background }]}>
        {/* FIXED SECTION - Network Status and Transaction History Header */}
        <View style={styles.fixedTopSection}>
          {/* Network Status Indicator */}
          <NetworkStatus 
            isOnline={!networkError} 
            onRetry={() => {
              console.log('Network retry requested');
              handleRefresh();
            }}
          />

          {/* Transaction History Header - Always show like dashboard */}
          <View style={styles.historyHeaderContainer}>
            <View style={styles.historyHeader}>
              <Clock size={20} color={theme.colors.textSecondary} />
              <Text style={[styles.historyHeaderText, { color: theme.colors.text }]}>{t('transactionHistory')}</Text>
            </View>
            <Text style={[styles.historySubtitle, { color: theme.colors.textSecondary }]}>
              {t('tapEditButton')}
            </Text>
          </View>
        </View>

        {/* SCROLLABLE SECTION - Transaction List Only */}
        <ScrollView 
          style={styles.scrollableTransactionList}
          contentContainerStyle={styles.transactionListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
            {/* Transaction Entries - Always show content like dashboard */}
            {customerTransactions.length > 0 ? (
              // Show transaction entries when we have transactions (like dashboard approach)
              groupedTransactions.map((dayGroup) => (
                <View key={dayGroup.date} style={styles.dayGroupContainer}>
                  {/* Date Header */}
                  <View style={[styles.dateHeader, { 
                    backgroundColor: theme.colors.surface,
                    borderBottomColor: theme.colors.border,
                    borderBottomWidth: 1
                  }]}>
                    <Calendar size={16} color={theme.colors.textSecondary} />
                    <Text style={[styles.dateHeaderText, { color: theme.colors.text }]}>{dayGroup.displayDate}</Text>
                  </View>
                  
                  {/* Entries for this date */}
                  <View style={styles.dayEntriesContainer}>
                    {dayGroup.entries.map((entry, index) => {
                      // Find corresponding transaction entry for edit functionality
                      const transactionEntry = displayedTransactionEntries.find(te => 
                        te.amount === entry.amount && 
                        te.transaction_type === entry.type &&
                        Math.abs(new Date(te.transaction_date).getTime() - new Date(entry.date).getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
                      );
                      
                      return (
                        <View key={entry.id} style={[styles.modernTransactionCard, {
                          backgroundColor: theme.colors.card,
                          borderBottomColor: theme.colors.border
                        }]}>
                          {/* Left Border Indicator */}
                          <View style={[
                            styles.leftBorderIndicator,
                            { backgroundColor: entry.type === 'given' ? '#EF4444' : '#10B981' }
                          ]} />
                          
                          {/* Main Card Content */}
                          <View style={styles.modernCardContent}>
                            {/* Left Side - Icon and Transaction Info */}
                            <View style={styles.leftSection}>
                              <View style={[
                                styles.modernTransactionIcon,
                                { backgroundColor: entry.type === 'given' ? '#FEF2F2' : '#F0FDF4' }
                              ]}>
                                {entry.type === 'given' ? (
                                  <TrendingUp size={16} color="#EF4444" strokeWidth={2} />
                                ) : (
                                  <TrendingDown size={16} color="#10B981" strokeWidth={2} />
                                )}
                              </View>
                              
                              <View style={styles.transactionInfo}>
                                <Text style={[
                                  styles.modernTransactionType,
                                  { color: entry.type === 'given' ? '#EF4444' : '#10B981' }
                                ]}>
                                  {entry.type === 'given' ? t('youGave') : t('youReceived')}
                                </Text>
                                
                                <Text style={[styles.modernTransactionTime, { color: theme.colors.textSecondary }]}>
                                  {entry.time}
                                </Text>
                                
                                {entry.description && (
                                  <Text style={[styles.modernTransactionDescription, { color: theme.colors.textSecondary }]}>
                                    {entry.description}
                                  </Text>
                                )}
                              </View>
                            </View>
                            
                            {/* Right Side - Amount, Balance and Edit Button */}
                            <View style={styles.rightSection}>
                              <View style={styles.amountSection}>
                                <Text style={[
                                  styles.modernTransactionAmount,
                                  { color: entry.type === 'given' ? '#EF4444' : '#10B981' }
                                ]}>
                                  रु {entry.amount.toLocaleString()}
                                </Text>
                                
                                <View style={[
                                  styles.modernBalanceChip,
                                  { backgroundColor: entry.balance > 0 ? '#DCFCE7' : entry.balance < 0 ? '#FEE2E2' : '#F3F4F6' }
                                ]}>
                                  <Text style={[
                                    styles.modernBalanceText,
                                    { color: entry.balance > 0 ? '#059669' : entry.balance < 0 ? '#DC2626' : '#6B7280' }
                                  ]}>
                                    Bal. रु {Math.abs(entry.balance).toLocaleString()}
                                  </Text>
                                </View>
                              </View>
                              
                              {/* Modern Edit Button */}
                              <TouchableOpacity
                                style={styles.modernEditButton}
                                onPress={() => {
                                  // COPY DASHBOARD PERFECT TOUCH: Same haptic feedback
                                  if (Platform.OS !== 'web') {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                  }
                                  console.log('Edit button pressed for entry:', entry.id);
                                  handleEditTransaction(entry);
                                }}
                                activeOpacity={0.2}
                                hitSlop={{ top: 20, bottom: 20, left: 16, right: 16 }}
                                pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
                                delayPressIn={0}
                                delayPressOut={0}
                              >
                                <View style={styles.modernEditButtonContainer}>
                                  <Edit3 
                                    size={14} 
                                    color="white" 
                                    strokeWidth={2.5}
                                  />
                                </View>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            ) : (
              // Show empty state when no fresh data or no transactions
              <View style={styles.emptyState}>
                <View style={[styles.emptyStateCard, {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border
                }]}>
                  <View style={styles.emptyStateIcon}>
                    <Clock size={48} color="#D1D5DB" />
                  </View>
                  <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                    {t('noTransactionsYet')}
                  </Text>
                  <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                    {t('startAddingTransactions')} {customerName} {t('toSeeThemHere')}
                  </Text>
                </View>
                
                {/* Animated Arrow - Positioned Lower */}
                <View style={styles.arrowContainer}>
                  <Animated.View 
                    style={[
                      styles.animatedArrow,
                      {
                        transform: [
                          {
                            translateY: bounceAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 15],
                            }),
                          },
                        ],
                        opacity: bounceAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.6, 1, 0.6],
                        }),
                      },
                    ]}
                  >
                    <TrendingDown size={32} color="#d4656e" />
                  </Animated.View>
                </View>
              </View>
            )}
        </ScrollView>

        {/* Bottom Action Buttons */}
        <View style={[styles.actionButtonsContainer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.bottomActionButton, styles.receiveButton]}
            onPress={() => {
              // INSTANT haptic feedback for maximum responsiveness
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              handleToReceive();
            }}
            activeOpacity={0.2}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
            delayPressIn={0}
            delayPressOut={0}
          >
            <Text style={styles.bottomActionButtonText}>{t('youGotRs')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.bottomActionButton, styles.giveButton]}
            onPress={() => {
              // INSTANT haptic feedback for maximum responsiveness
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              handleToGive();
            }}
            activeOpacity={0.2}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
            delayPressIn={0}
            delayPressOut={0}
          >
            <Text style={styles.bottomActionButtonText}>{t('youGaveRs')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        onTransactionUpdated={async () => {
          console.log('Transaction updated, background refreshing data immediately...');
          // Set transaction activity flag for dashboard smart refresh
          (globalThis as any).__lastTransactionActivity = Date.now();
          await handleBackgroundRefresh();
        }}
        onTransactionDeleted={async () => {
          console.log('Transaction deleted, background refreshing data immediately...');
          // Set transaction activity flag for dashboard smart refresh
          (globalThis as any).__lastTransactionActivity = Date.now();
          await handleBackgroundRefresh();
        }}
      />

      {/* Interest Calculation Modal - Redesigned with Blue Theme */}
      <Modal
        visible={interestModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setInterestModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)' }]}>
          <View style={[styles.interestModalContainer, { backgroundColor: theme.colors.surface }]}>
            <LinearGradient
              colors={['#1E40AF', '#3B82F6']}
              style={styles.modalGradientHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleSection}>
                  <Calculator size={20} color="white" strokeWidth={2} />
                  <Text style={styles.modalTitle}>{t('calculateInterest')}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setInterestModalVisible(false)}
                  style={styles.closeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={20} color="white" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
                {t('calculateInterestDescription') || 'Calculate interest based on customer transaction history. Principal amount and dates will be taken from transaction records.'}
              </Text>

              {/* Interest Rate Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDark ? '#60a5fa' : '#1E40AF' }]}>{t('monthlyInterestRate')} (%)</Text>
                <View style={[styles.inputContainer, { 
                  borderColor: isDark ? theme.colors.border : '#DBEAFE',
                  backgroundColor: theme.colors.background,
                }]}>
                  <TextInputWithDoneBar
                    style={[styles.textInput, { color: theme.colors.text }]}
                    value={interestRate}
                    onChangeText={setInterestRate}
                    placeholder={t('enterInterestRate') || '2'}
                    placeholderTextColor={isDark ? '#6b7280' : '#9CA3AF'}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* End Date Picker */}
              <DatePicker
                value={endDate}
                onChange={(date) => setEndDate(date)}
                label={t('endDate') + ' (BS)'}
              />

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  }]}
                  onPress={() => {
                    // COPY DASHBOARD PERFECT TOUCH: Same haptic feedback
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    setInterestModalVisible(false);
                  }}
                  activeOpacity={0.2}
                  hitSlop={{ top: 20, bottom: 20, left: 16, right: 16 }}
                  pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
                  delayPressIn={0}
                  delayPressOut={0}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>{t('cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.calculateButton}
                  onPress={() => {
                    // COPY DASHBOARD PERFECT TOUCH: Same haptic feedback
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    handleCalculateInterest();
                  }}
                  activeOpacity={0.2}
                  hitSlop={{ top: 20, bottom: 20, left: 16, right: 16 }}
                  pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
                  delayPressIn={0}
                  delayPressOut={0}
                >
                  <LinearGradient
                    colors={['#1E40AF', '#3B82F6']}
                    style={styles.calculateButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Calculator size={16} color="white" strokeWidth={2} />
                    <Text style={styles.calculateButtonText}>{t('calculate')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B', // Match new slate gradient start color
  },
  content: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },

  // Modern Header Styles
  modernHeader: {
    position: 'relative',
    paddingBottom: 12,
    paddingHorizontal: 16,
    marginTop: Platform.OS === 'ios' ? -50 : 0,
    overflow: 'hidden',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  modernHeaderContent: {
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  customerProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modernAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.3,
  },
  customerInfo: {
    flex: 1,
    gap: 2,
  },
  nameAndActions: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 3,
  },
  customerNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  androidResponsiveName: {
    // Android-specific responsive styling
    maxWidth: '75%', // Ensure space for action buttons
    textAlign: 'left',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  deleteActionButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  customerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    letterSpacing: 0.3,
  },

  // Balance Display Styles
  balanceDisplaySection: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 120,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'right',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'right',
  },
  balanceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  balanceIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceStatus: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // History Header Styles
  historyHeaderContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  historyHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  historySubtitle: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 28,
  },

  // Fixed top section styles
  fixedTopSection: {
    backgroundColor: 'transparent',
  },
  
  // Scrollable transaction list styles
  scrollableTransactionList: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  transactionListContent: {
    paddingBottom: 100, // Extra padding for bottom action buttons
  },
  
  contentArea: {
    flex: 1,
  },
  transactionsList: {
    flex: 1,
    paddingBottom: 90,
  },

  // Day Group Styles
  dayGroupContainer: {
    marginBottom: 0,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayEntriesContainer: {
    gap: 0,
  },

  // Modern Transaction Card Styles
  modernTransactionCard: {
    borderRadius: 0,
    marginBottom: 0,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 0,
    borderBottomWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  leftBorderIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  modernCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingLeft: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  modernTransactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionInfo: {
    flex: 1,
    gap: 3,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountSection: {
    alignItems: 'flex-end',
    gap: 6,
  },
  modernTransactionType: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modernTransactionAmount: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  modernTransactionTime: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
  },
  modernBalanceChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-end',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  modernBalanceText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modernTransactionDescription: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  modernEditButton: {
    marginLeft: 12,
    zIndex: 10,
    elevation: 5,
  },
  modernEditButtonContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#DC2626',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },

  // Empty State Styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
    paddingTop: 40,
  },
  emptyStateCard: {
    alignItems: 'center',
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
  },
  arrowContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  animatedArrow: {
    padding: 8,
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 16,
    gap: 16,
    borderTopWidth: 1,
  },
  bottomActionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  receiveButton: {
    backgroundColor: '#2F855A',
  },
  giveButton: {
    backgroundColor: '#C53030',
  },
  bottomActionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  editIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  // Red Edit Icon Styles - Matching Screenshot
  redEditIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 2,
  },
  redEditIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#DC2626',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    // Ensure it's always visible
    zIndex: 10,
  },
  transactionCardExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  expandedActionButtonsRow: {
    flexDirection: 'column',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    marginTop: -1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  editActionButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  expandedDeleteActionButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  actionButtonDivider: {
    height: 1,
    width: '100%',
    backgroundColor: '#E5E7EB',
  },
  actionButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  actionButtonContent: {
    flex: 1,
    gap: 2,
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Bottom row containing both Calculate Interest Button and Balance Display
  bottomButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },

  // Calculate Interest Button Styles
  calculateInterestButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#3B82F6', // Updated shadow color to match blue
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    // Removed alignSelf since we're now in a row layout
  },
  calculateInterestGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  calculateInterestText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.3,
  },
  
  // Calculate Interest Button Below Name Styles
  calculateInterestButtonBelowName: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  calculateInterestGradientBelowName: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  calculateInterestTextBelowName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    letterSpacing: 0.2,
  },
  
  // Balance Display Section Right
  balanceDisplaySectionRight: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 100,
  },

  // Interest Modal Styles - Compact Blue Theme
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  interestModalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 360,
    overflow: 'hidden',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalGradientHeader: {
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  closeButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DBEAFE',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    minHeight: 24,
    fontWeight: '600',
  },
  inputIcon: {
    marginLeft: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  calculateButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  calculateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  calculateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },

});
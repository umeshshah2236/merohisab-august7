import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { BS_MONTHS, BS_YEARS } from '@/constants/calendar';
import { BSDate, getMaxDayForMonthYear } from '@/utils/date-utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { formatNumber } from '@/utils/number-utils';
import { getAccurateCurrentBSDate } from '@/utils/current-date-utils';

interface DatePickerProps {
  value: BSDate;
  onChange: (date: BSDate) => void;
  label: string;
  error?: string;
}

export default function DatePicker({ value, onChange, label, error }: DatePickerProps) {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [tempDate, setTempDate] = useState<BSDate>(value);
  const [maxDay, setMaxDay] = useState(getMaxDayForMonthYear(value.year, value.month));
  const [isFirstModalOpen, setIsFirstModalOpen] = useState(true);
  
  // Refs for FlatLists to control scrolling
  const yearListRef = useRef<FlatList>(null);
  const monthListRef = useRef<FlatList>(null);
  const dayListRef = useRef<FlatList>(null);
  
  // Update max days when year or month changes
  useEffect(() => {
    const newMaxDay = getMaxDayForMonthYear(tempDate.year, tempDate.month);
    setMaxDay(newMaxDay);
    
    // Adjust day if it exceeds the maximum for the selected month/year
    if (tempDate.day > newMaxDay) {
      setTempDate(prev => ({ ...prev, day: newMaxDay }));
    }
  }, [tempDate.year, tempDate.month]);

  // Update tempDate when value prop changes
  useEffect(() => {
    setTempDate(value);
  }, [value]);
  
  // Set default date when modal opens for the first time
  useEffect(() => {
    if (isModalVisible && isFirstModalOpen) {
      // Set default to current Nepali date
      const currentDate = getAccurateCurrentBSDate();
      const defaultDate: BSDate = { 
        year: currentDate.year.toString(), 
        month: currentDate.month, 
        day: currentDate.day 
      };
      setTempDate(defaultDate);
      setIsFirstModalOpen(false);
    }
  }, [isModalVisible, isFirstModalOpen]);

  // Auto-scroll to selected items when modal opens
  useEffect(() => {
    if (isModalVisible) {
      // Small delay to ensure FlatLists are rendered
      setTimeout(() => {
        try {
          // Scroll to selected year
          const yearIndex = BS_YEARS.findIndex(year => year === tempDate.year);
          if (yearIndex !== -1 && yearListRef.current) {
            yearListRef.current.scrollToIndex({ 
              index: yearIndex, 
              animated: true,
              viewPosition: 0.5 // Center the item
            });
          }
          
          // Scroll to selected month
          const monthIndex = tempDate.month - 1;
          if (monthIndex >= 0 && monthIndex < BS_MONTHS.length && monthListRef.current) {
            monthListRef.current.scrollToIndex({ 
              index: monthIndex, 
              animated: true,
              viewPosition: 0.5
            });
          }
          
          // Scroll to selected day
          const dayIndex = tempDate.day - 1;
          if (dayIndex >= 0 && dayIndex < days.length && dayListRef.current) {
            dayListRef.current.scrollToIndex({ 
              index: dayIndex, 
              animated: true,
              viewPosition: 0.5
            });
          }
        } catch (error) {
          console.log('Error scrolling to selected date:', error);
        }
      }, 150);
    }
  }, [isModalVisible, tempDate]);
  
  const handleConfirm = () => {
    onChange(tempDate);
    setIsModalVisible(false);
  };
  
  const handleCancel = () => {
    setTempDate(value);
    setIsModalVisible(false);
  };

  const handleYearChange = (year: string) => {
    const newMaxDay = getMaxDayForMonthYear(year, tempDate.month);
    const adjustedDay = tempDate.day > newMaxDay ? newMaxDay : tempDate.day;
    setTempDate(prev => ({ ...prev, year, day: adjustedDay }));
  };

  const handleMonthChange = (month: number) => {
    const newMaxDay = getMaxDayForMonthYear(tempDate.year, month);
    const adjustedDay = tempDate.day > newMaxDay ? newMaxDay : tempDate.day;
    setTempDate(prev => ({ ...prev, month, day: adjustedDay }));
  };

  // Generate days array based on max days for the selected month/year
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  // Get localized month names
  const getLocalizedMonthName = (monthIndex: number) => {
    const monthKeys = [
      'baishakh', 'jestha', 'ashadh', 'shrawan', 'bhadra', 'ashwin',
      'kartik', 'mangsir', 'poush', 'magh', 'falgun', 'chaitra'
    ];
    return t(monthKeys[monthIndex]);
  };

  const formatDisplayDate = () => {
    const monthName = getLocalizedMonthName(value.month - 1);
    const year = formatNumber(value.year, language);
    const day = formatNumber(value.day, language);
    
    if (language === 'ne') {
      return `${year} ${monthName} ${day}`;
    }
    return `${year} ${monthName} ${day}`;
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.pickerButton, 
          { 
            borderColor: error ? theme.colors.error : theme.colors.border,
            backgroundColor: theme.colors.inputBackground 
          }
        ]}
        onPress={() => setIsModalVisible(true)}
      >
        <Text style={[styles.dateText, { color: theme.colors.text }]}>
          {formatDisplayDate()}
        </Text>
        <Calendar size={24} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('selectBSDate')}</Text>
            
            <View style={styles.dateSelectors}>
              {/* Selected Items Row */}
              <View style={styles.selectorRow}>
                {/* Selected Year */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>
                    {language === 'ne' ? 'वर्ष' : 'Year'}
                  </Text>
                  <View style={styles.selectedItemContainer}>
                    <Text style={styles.selectedItemText}>
                      {formatNumber(tempDate.year, language)}
                    </Text>
                  </View>
                </View>
                
                {/* Selected Month */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>
                    {language === 'ne' ? 'महिना' : 'Month'}
                  </Text>
                  <View style={styles.selectedItemContainer}>
                    <Text style={styles.selectedItemText}>
                      {getLocalizedMonthName(tempDate.month - 1)}
                    </Text>
                  </View>
                </View>
                
                {/* Selected Day */}
                <View style={styles.selectorContainer}>
                  <Text style={styles.selectorLabel}>
                    {language === 'ne' ? `दिन (${formatNumber(maxDay, language)} ${t('days')})` : `Day (${maxDay} ${t('days')})`}
                  </Text>
                  <View style={styles.selectedItemContainer}>
                    <Text style={styles.selectedItemText}>
                      {formatNumber(tempDate.day, language)}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Options Row */}
              <View style={styles.selectorRow}>
                {/* Year Options */}
                <View style={styles.selectorContainer}>
                  <FlatList
                    ref={yearListRef}
                    data={BS_YEARS.filter(year => year !== tempDate.year)}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.selectorItem}
                        onPress={() => handleYearChange(item)}
                      >
                        <Text style={styles.selectorItemText}>
                          {formatNumber(item, language)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={styles.selectorList}
                    showsVerticalScrollIndicator={true}
                    scrollEnabled={true}
                  />
                </View>
                
                {/* Month Options */}
                <View style={styles.selectorContainer}>
                  <FlatList
                    ref={monthListRef}
                    data={BS_MONTHS.map((month, index) => ({ month, index: index + 1 })).filter(item => item.index !== tempDate.month)}
                    keyExtractor={(item) => `${item.month}-${item.index}`}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.selectorItem}
                        onPress={() => handleMonthChange(item.index)}
                      >
                        <Text style={styles.selectorItemText}>
                          {getLocalizedMonthName(item.index - 1)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={styles.selectorList}
                    showsVerticalScrollIndicator={true}
                    scrollEnabled={true}
                  />
                </View>
                
                {/* Day Options */}
                <View style={styles.selectorContainer}>
                  <FlatList
                    ref={dayListRef}
                    data={days.filter(day => day !== tempDate.day)}
                    keyExtractor={(item) => item.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.selectorItem}
                        onPress={() => setTempDate(prev => ({ ...prev, day: item }))}
                      >
                        <Text style={styles.selectorItemText}>
                          {formatNumber(item, language)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    style={styles.selectorList}
                    showsVerticalScrollIndicator={true}
                    scrollEnabled={true}
                  />
                </View>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.cancelButton, { borderColor: theme.colors.border }]} 
                onPress={handleCancel}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>{t('cancel')}</Text>
              </Pressable>
              <Pressable 
                style={[styles.confirmButton, { backgroundColor: theme.colors.primary }]} 
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>{t('confirm')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    width: '100%',
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
    fontWeight: '700',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  dateText: {
    fontSize: 18,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 14,
    marginTop: 6,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  dateSelectors: {
    marginBottom: 20,
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectorContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  selectorLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    color: '#444',
  },
  selectedItemContainer: {
    backgroundColor: '#1e40af',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedItemText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  selectorList: {
    maxHeight: 150,
  },
  selectorItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 4,
    alignItems: 'center',
    backgroundColor: 'rgba(30, 64, 175, 0.05)',
  },
  selectorItemText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 16,
    marginLeft: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
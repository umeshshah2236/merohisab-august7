import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView, Dimensions, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import TextInputWithDoneBar from '@/components/TextInputWithDoneBar';
import { Stack, router } from 'expo-router';
import { Search, Plus, User, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Contacts from 'expo-contacts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const { width } = Dimensions.get('window');

// Responsive breakpoints
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;

// Dynamic sizing based on screen size
const getResponsiveSize = (small: number, medium: number, large: number) => {
  if (isSmallScreen) return small;
  if (isMediumScreen) return medium;
  return large;
};

interface Contact {
  id: string;
  name: string;
  phoneNumbers?: { number: string }[];
  firstName?: string;
  lastName?: string;
}



export default function AddCustomerScreen() {
  const { theme, isDark } = useTheme();
  const languageContext = useLanguage();
  const t = languageContext?.t || ((key: string) => key);
  useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contactsLoaded, setContactsLoaded] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      console.log('Starting to load contacts...');
      const startTime = Date.now();
      
      // Show loading state immediately
      setLoading(true);
      setContactsLoaded(false);
      
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });

      console.log(`Contacts API call took: ${Date.now() - startTime}ms`);
      const processingStartTime = Date.now();

      if (data && data.length > 0) {
        console.log(`Processing ${data.length} contacts...`);
        
        // Use more efficient processing with pre-allocated arrays
        const validContacts: Contact[] = [];
        
        // Process contacts in smaller chunks to avoid blocking the UI
        const chunkSize = 50;
        const totalChunks = Math.ceil(data.length / chunkSize);
        
        for (let i = 0; i < totalChunks; i++) {
          const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize);
          
          // Process chunk
          const chunkContacts = chunk
            .filter((contact: any) => contact.name && contact.name.trim() !== '')
            .map((contact: any) => ({
              id: contact.id || `contact_${i}_${Math.random().toString(36).substr(2, 9)}`,
              name: contact.name || 'Unknown',
              phoneNumbers: contact.phoneNumbers
                ?.filter((phone: any) => phone.number && phone.number.trim() !== '')
                .map((phone: any) => ({
                  number: phone.number!
                })) || [],
              firstName: contact.firstName,
              lastName: contact.lastName,
            }));
          
          validContacts.push(...chunkContacts);
          
          // Allow UI to update between chunks (only for large contact lists)
          if (data.length > 200 && i < totalChunks - 1) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
        
        console.log(`Contact processing took: ${Date.now() - processingStartTime}ms`);
        const sortingStartTime = Date.now();
        
        // Sort efficiently using localeCompare with options for better performance
        validContacts.sort((a, b) => a.name.localeCompare(b.name, undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        }));
        
        console.log(`Contact sorting took: ${Date.now() - sortingStartTime}ms`);
        console.log(`Total contacts loaded: ${validContacts.length}`);
        
        setContacts(validContacts);
      } else {
        console.log('No contacts found');
        setContacts([]);
      }
      
      setContactsLoaded(true);
      console.log(`Total contact loading time: ${Date.now() - startTime}ms`);
      
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContacts([]);
      setContactsLoaded(true);
      Alert.alert(t('error'), t('failedToLoadContacts'));
    } finally {
      setLoading(false);
    }
  }, []);

  const requestContactsPermission = useCallback(async () => {
    try {
      // On web/desktop, contacts API is not available
      if (Platform.OS === 'web') {
        setHasPermission(false);
        setLoading(false);
        setContactsLoaded(true);
        return;
      }

      console.log('Requesting contacts permission...');
      const permissionStartTime = Date.now();
      
      // Check if permission is already granted
      const { status: existingStatus } = await Contacts.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        console.log('Contacts permission already granted');
        setHasPermission(true);
        loadContacts();
        return;
      }
      
      // Request permission with a more user-friendly approach
      const { status } = await Contacts.requestPermissionsAsync();
      console.log(`Permission request took: ${Date.now() - permissionStartTime}ms`);

      if (status === 'granted') {
        console.log('Contacts permission granted');
        setHasPermission(true);
        // Start loading contacts immediately without waiting
        loadContacts();
      } else {
        console.log('Contacts permission denied');
        setHasPermission(false);
        setLoading(false);
        setContactsLoaded(true);
        // Don't show alert immediately - let user see the manual option first
      }
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      setHasPermission(false);
      setLoading(false);
      setContactsLoaded(true);
    }
  }, [loadContacts]);

  const filterContacts = useCallback(() => {
    if (!contactsLoaded) {
      setFilteredContacts([]);
      return;
    }
    
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    // Use more efficient filtering with optimized string matching
    const query = searchQuery.toLowerCase();
    const filtered: Contact[] = [];
    
    // Use for loop for better performance than filter
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      if (contact.name.toLowerCase().includes(query)) {
        filtered.push(contact);
        // Limit results to improve performance
        if (filtered.length >= 100) break;
      }
    }
    
    setFilteredContacts(filtered);
  }, [searchQuery, contacts, contactsLoaded]);

  useEffect(() => {
    requestContactsPermission();
  }, [requestContactsPermission]);

  useEffect(() => {
    filterContacts();
  }, [filterContacts]);



  const getInitials = (name: string): string => {
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
      '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatPhoneNumber = (phoneNumber: string): string => {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    
    // If it already starts with 977, remove it to get the local number
    if (cleaned.startsWith('977')) {
      return cleaned.substring(3);
    }
    
    // If it's a 10-digit number starting with 9, it's likely a Nepal mobile number
    if (cleaned.length === 10 && cleaned.startsWith('9')) {
      return cleaned;
    }
    
    // If it's longer than 10 digits, try to extract the last 10 digits
    if (cleaned.length > 10) {
      const last10 = cleaned.substring(cleaned.length - 10);
      if (last10.startsWith('9')) {
        return last10;
      }
    }
    
    // Return the cleaned number as is for other cases
    return cleaned;
  };

  const handleContactPress = (contact: Contact) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const rawPhoneNumber = contact.phoneNumbers && contact.phoneNumbers.length > 0 
      ? contact.phoneNumbers[0].number 
      : '';
    
    // Format the phone number to remove country codes and get local number
    const formattedPhone = formatPhoneNumber(rawPhoneNumber);

    // Navigate to customer form with pre-filled data
    router.push({
      pathname: '/(tabs)/(home)/customer-form',
      params: {
        customerName: contact.name,
        customerPhone: formattedPhone,
      }
    });
  };

  const handleAddCustomerManually = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const name = searchQuery.trim();
    if (name) {
      router.push({
        pathname: '/(tabs)/(home)/customer-form',
        params: {
          customerName: name,
        }
      });
    } else {
      router.push('/(tabs)/(home)/customer-form');
    }
  };

  const handleGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Use router.replace for smooth navigation like Settings -> Home
    // This prevents dashboard re-mounting and loading states
    setTimeout(() => {
      router.replace('/(tabs)/(home)/dashboard');
    }, 100);
  };











  // Responsive header sizing
  const headerPaddingTop = Math.max(insets.top + getResponsiveSize(16, 20, 24), 44);
  const headerPaddingBottom = getResponsiveSize(20, 24, 28);
  const headerPaddingHorizontal = getResponsiveSize(16, 20, 24);

  if (!hasPermission) {
    return (
      <>
        <Stack.Screen options={{ 
          headerShown: false,
          // CRITICAL: Android background to prevent white flash during navigation
          contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
          cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
        }} />
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView 
              style={[styles.container, { backgroundColor: theme.colors.background }]} 
              contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
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
                    width: getResponsiveSize(40, 44, 48),
                    height: getResponsiveSize(40, 44, 48),
                  }]} 
                  onPress={handleGoBack}
                >
                  <ArrowLeft size={getResponsiveSize(20, 24, 26)} color="white" />
                </TouchableOpacity>
                
                <View style={styles.titleContainer}>
                  <Text style={[styles.headerTitle, {
                    fontSize: getResponsiveSize(24, 28, 32),
                  }]}>
                    {t('addCustomer')}
                  </Text>
                  <Text style={[styles.headerSubtitle, {
                    fontSize: getResponsiveSize(14, 15, 16),
                    marginTop: getResponsiveSize(4, 6, 8),
                    marginBottom: getResponsiveSize(8, 10, 12),
                  }]}>
                    {t('chooseFromContactsOrAddManually')}
                  </Text>
                </View>
                
                <View style={[styles.spacer, {
                  width: getResponsiveSize(40, 44, 48),
                }]} />
              </View>
            </LinearGradient>
            
            <View style={[styles.formContainer, { 
              backgroundColor: isDark ? theme.colors.surface : 'white',
              paddingHorizontal: getResponsiveSize(20, 24, 28),
              paddingTop: getResponsiveSize(32, 36, 40),
              marginHorizontal: getResponsiveSize(16, 20, 24),
              marginTop: getResponsiveSize(-20, -24, -28),
              borderRadius: 20,
              shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: isDark ? 0.3 : 0.1,
              shadowRadius: 12,
              elevation: 8,
            }]}>
              {/* Manual Customer Input */}
              <View style={[styles.inputWrapper, {
                marginBottom: getResponsiveSize(24, 28, 32),
                marginTop: getResponsiveSize(4, 6, 8),
              }]}>
                <Text style={[styles.inputLabel, { 
                  color: isDark ? theme.colors.text : '#1e293b',
                  fontSize: getResponsiveSize(15, 16, 17),
                }]}>
                  {t('customerName')}
                </Text>
                <View style={[styles.inputContainer, {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.background,
                }]}>
                  <User size={20} color={isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b'} style={styles.inputIcon} />
                  <TextInputWithDoneBar
                    style={[styles.input, { color: isDark ? theme.colors.text : '#1e293b' }]}
                    placeholder={t('enterCustomerName')}
                    placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={false}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      style={styles.clearButton}
                    >
                      <Text style={[styles.clearButtonText, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b' }]}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Action Button */}
              <TouchableOpacity 
                style={[styles.signInButton, {
                  minHeight: getResponsiveSize(48, 52, 56),
                }]} 
                onPress={handleAddCustomerManually}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#2563eb', '#1d4ed8']}
                  style={styles.buttonGradient}
                >
                  <Plus size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={[styles.signInButtonText, {
                    fontSize: getResponsiveSize(14, 15, 16),
                  }]}>
                    {t('addCustomer')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Permission Section for Mobile - Only show if permission not granted */}
              {Platform.OS !== 'web' && !hasPermission && (
                <View style={[styles.permissionSection, {
                  marginTop: getResponsiveSize(24, 28, 32),
                  marginBottom: getResponsiveSize(16, 20, 24),
                  padding: getResponsiveSize(16, 20, 24),
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : theme.colors.background,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                }]}>
                  <View style={styles.permissionHeader}>
                    <User size={24} color={isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b'} />
                    <Text style={[styles.permissionTitle, { 
                      color: isDark ? theme.colors.text : '#1e293b',
                      fontSize: getResponsiveSize(15, 16, 17),
                      fontWeight: '600',
                    }]}>
                      Quick Add from Contacts
                    </Text>
                  </View>
                  <Text style={[styles.permissionDescription, { 
                    color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
                    fontSize: getResponsiveSize(13, 14, 15),
                    marginTop: 4,
                  }]}>
                    Access your contacts to quickly add customers without typing
                  </Text>
                  <TouchableOpacity
                    style={[styles.permissionButton, {
                      minHeight: getResponsiveSize(36, 40, 44),
                      marginTop: 12,
                    }]}
                    onPress={requestContactsPermission}
                  >
                    <LinearGradient
                      colors={['#2563eb', '#1d4ed8']}
                      style={styles.buttonGradient}
                    >
                      <Text style={[styles.permissionButtonText, {
                        fontSize: getResponsiveSize(13, 14, 15),
                      }]}>
                        Enable Contacts Access
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {/* Web Notice */}
              {Platform.OS === 'web' && (
                <View style={[styles.webNoticeSection, {
                  marginTop: getResponsiveSize(32, 36, 40),
                  marginBottom: getResponsiveSize(16, 20, 24),
                }]}>
                  <Text style={[styles.webNoticeText, { 
                    color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b',
                    fontSize: getResponsiveSize(13, 14, 15),
                  }]}>
                    {t('onDesktopYouCanManually')}
                  </Text>
                </View>
              )}
            </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ 
        headerShown: false,
        // CRITICAL: Android background to prevent white flash during navigation
        contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
        cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
      }} />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Sticky Header Section */}
          <LinearGradient
            colors={['#1e40af', '#3b82f6']}
            style={[styles.header, { 
              paddingTop: Platform.OS === 'ios' ? headerPaddingTop : insets.top + 40, // Increased padding for Android camera area
              paddingBottom: headerPaddingBottom,
              paddingHorizontal: headerPaddingHorizontal,
              marginTop: Platform.OS === 'android' ? -insets.top : 0, // Negative margin to extend behind status bar on Android
            }]}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity 
                style={[styles.backButton, {
                  width: getResponsiveSize(40, 44, 48),
                  height: getResponsiveSize(40, 44, 48),
                }]} 
                onPress={handleGoBack}
              >
                <ArrowLeft size={getResponsiveSize(20, 24, 26)} color="white" />
              </TouchableOpacity>
              
              <View style={styles.titleContainer}>
                <Text style={[styles.headerTitle, {
                  fontSize: getResponsiveSize(24, 28, 32),
                }]}>
                  {t('addCustomer')}
                </Text>
                <Text style={[styles.headerSubtitle, {
                  fontSize: getResponsiveSize(14, 15, 16),
                  marginTop: getResponsiveSize(4, 6, 8),
                  marginBottom: getResponsiveSize(8, 10, 12),
                }]}>
                  {loading ? t('loadingContacts') : `${contacts.length} ${t('contactsAvailable')}`}
                </Text>
              </View>
              
              <View style={[styles.spacer, {
                width: getResponsiveSize(40, 44, 48),
              }]} />
            </View>
          </LinearGradient>
          
          {/* Sticky Form Section */}
          <View style={[styles.stickyFormContainer, { 
            backgroundColor: isDark ? theme.colors.surface : 'white',
            paddingHorizontal: getResponsiveSize(20, 24, 28),
            paddingTop: getResponsiveSize(32, 36, 40),
            marginHorizontal: getResponsiveSize(16, 20, 24),
            marginTop: getResponsiveSize(-20, -24, -28),
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 12,
            elevation: 8,
          }]}>
            {/* Search Bar */}
            <View style={[styles.inputWrapper, {
              marginBottom: getResponsiveSize(24, 28, 32),
              marginTop: getResponsiveSize(4, 6, 8),
            }]}>
              <Text style={[styles.inputLabel, { 
                color: isDark ? theme.colors.text : '#1e293b',
                fontSize: getResponsiveSize(15, 16, 17),
              }]}>
                {t('searchContacts')}
              </Text>
              <View style={[styles.inputContainer, {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.background,
              }]}>
                <Search size={20} color={isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b'} style={styles.inputIcon} />
                <TextInputWithDoneBar
                  style={[styles.input, { color: isDark ? theme.colors.text : '#1e293b' }]}
                  placeholder={t('customerNameSearch')}
                  placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.4)' : '#94a3b8'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearButton}
                  >
                    <Text style={[styles.clearButtonText, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b' }]}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Add Customer Button */}
            <TouchableOpacity 
              style={[styles.signInButton, {
                minHeight: getResponsiveSize(48, 52, 56),
                marginBottom: getResponsiveSize(24, 28, 32),
              }]} 
              onPress={handleAddCustomerManually}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#2563eb', '#1d4ed8']}
                style={styles.buttonGradient}
              >
                <Plus size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={[styles.signInButtonText, {
                  fontSize: getResponsiveSize(14, 15, 16),
                }]}>
                  {t('addCustomer')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Loading Indicator */}
            {loading && (
              <View style={[styles.loadingIndicatorContainer, {
                marginBottom: getResponsiveSize(24, 28, 32),
              }]}>
                <ActivityIndicator 
                  size="small" 
                  color={isDark ? theme.colors.primary : '#2563eb'} 
                  style={{ marginRight: 12 }}
                />
                <Text style={[styles.loadingIndicatorText, {
                  color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#64748b',
                  fontSize: getResponsiveSize(14, 15, 16),
                }]}>
                  {t('loadingContacts')}
                </Text>
              </View>
            )}

            {/* Section Title */}
            {!loading && (
              <Text style={[styles.sectionTitle, { 
                color: isDark ? theme.colors.text : '#1e293b',
                fontSize: getResponsiveSize(16, 17, 18),
                marginBottom: getResponsiveSize(16, 18, 20),
              }]}>
                {t('yourContacts')} {contacts.length > 0 && `(${contacts.length})`}
              </Text>
            )}
          </View>

          {/* Scrollable Contacts List */}
          {!loading && (
            <ScrollView 
              style={[styles.scrollableContactsContainer, {
                backgroundColor: isDark ? theme.colors.surface : 'white',
                marginHorizontal: getResponsiveSize(16, 20, 24),
              }]}
              contentContainerStyle={[styles.contactsScrollContent, {
                paddingHorizontal: getResponsiveSize(20, 24, 28),
                paddingBottom: 100,
              }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {filteredContacts.map(contact => (
                <TouchableOpacity
                  key={contact.id}
                  style={[styles.contactItem, { 
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : theme.colors.background,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
                  }]}
                  onPress={() => handleContactPress(contact)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.contactAvatar, { backgroundColor: getAvatarColor(contact.name) }]}>
                    <Text style={styles.contactInitials}>{getInitials(contact.name)}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={[styles.contactName, { color: isDark ? theme.colors.text : '#1e293b' }]}>{contact.name}</Text>
                    {contact.phoneNumbers && contact.phoneNumbers.length > 0 && (
                      <Text style={[styles.contactPhone, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b' }]}>
                        {contact.phoneNumbers[0].number}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              
              {filteredContacts.length === 0 && searchQuery.trim() !== '' && (
                <View style={styles.noResultsContainer}>
                  <User size={48} color={isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b'} />
                  <Text style={[styles.noResultsText, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b' }]}>
                    {t('noContactsFoundMatching')} &quot;{searchQuery}&quot;
                  </Text>
                </View>
              )}
              
              {filteredContacts.length === 0 && searchQuery.trim() === '' && contactsLoaded && (
                <View style={styles.noResultsContainer}>
                  <User size={48} color={isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b'} />
                  <Text style={[styles.noResultsText, { color: isDark ? 'rgba(255, 255, 255, 0.6)' : '#64748b' }]}>
                    {t('noContactsAvailable')}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  stickyFormContainer: {
    // Dynamic styles applied inline
  },
  scrollableContactsContainer: {
    flex: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  contactsScrollContent: {
    flexGrow: 1,
  },
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '400',
  },
  spacer: {
    // Invisible spacer to balance the layout
  },
  formContainer: {
    // Dynamic styles applied inline
  },
  inputWrapper: {
    // Dynamic styles applied inline
  },
  inputLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
    minHeight: 60,
  },
  inputIcon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    minHeight: 44,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signInButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  signInButtonText: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  permissionSection: {
    alignItems: 'center',
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionTitle: {
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDescription: {
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  permissionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  webNoticeSection: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  webNoticeText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  contactsContainer: {
    // Dynamic styles applied inline
  },
  sectionTitle: {
    fontWeight: '600',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInitials: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  loadingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  loadingIndicatorText: {
    fontWeight: '500',
  },
});


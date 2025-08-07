import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Pressable, Alert, Platform, Dimensions } from 'react-native';
import TextInputWithDoneBar from '@/components/TextInputWithDoneBar';
import { Stack, router } from 'expo-router';
import { ChevronRight, Globe, Shield, FileText, Info, Palette, Sun, Moon, Smartphone, LogOut, User, Settings, Wifi, Trash2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { useTheme, ThemeMode } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';
import { formatNumber } from '@/utils/number-utils';
import * as Application from 'expo-application';
import { OfflineStatusCard } from '@/components/OfflineStatusCard';

import { auth } from '@/lib/firebase';

export default function SettingsScreen() {
  const { language, setLanguage, t } = useLanguage();
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { user, isAuthenticated, signOut, deleteAccount, sendOtp, verifyOtp } = useAuth();
  const { syncPendingOperations } = useNetwork();
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const handlePrivacyPolicy = () => {
    // Add haptic feedback for better user experience
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Add a small delay for smoother transition
    setTimeout(() => {
      router.push('/privacy-policy');
    }, 100);
  };

  const handleTermsOfService = () => {
    // Add haptic feedback for better user experience
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Add a small delay for smoother transition
    setTimeout(() => {
      router.push('/terms-of-service');
    }, 100);
  };

  const handleAbout = () => {
    // Add haptic feedback for better user experience
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Add a small delay for smoother transition
    setTimeout(() => {
      router.push('/about');
    }, 100);
  };

  const handleSignOut = () => {
    if (isSigningOut) return; // Prevent multiple sign out attempts
    
    if (Platform.OS === 'web') {
      // For web, use a simple confirm dialog
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        setIsSigningOut(true);
        signOut()
          .then(() => {
            console.log('Sign out completed');
          })
          .catch(error => {
            console.error('Sign out process had issues:', error);
            // Don't show error to user since sign out should work locally
          })
          .finally(() => {
            // Reset the signing out state after a short delay
            setTimeout(() => setIsSigningOut(false), 1000);
          });
      }
    } else {
      // For mobile, use Alert.alert
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign Out', 
            style: 'destructive',
            onPress: async () => {
              setIsSigningOut(true);
              try {
                // Add haptic feedback for sign out action
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }
                
                await signOut();
                console.log('Sign out completed');
              } catch (error) {
                console.error('Sign out process had issues:', error);
                // Don't show error to user since sign out should work locally
              } finally {
                // Reset the signing out state after a short delay
                setTimeout(() => setIsSigningOut(false), 1000);
              }
            }
          }
        ]
      );
    }
  };

  const handleSignIn = () => {
    // INSTANT haptic feedback for maximum responsiveness (same as Home → Calculator approach)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Remove delay for instant navigation (same as Home → Calculator approach)
    router.push('/auth/sign-in');
  };

  const handleDeleteAccount = () => {
    if (isDeletingAccount) return; // Prevent multiple delete attempts
    setDeleteModalVisible(true);
    setOtpSent(false);
    setOtpCode('');
    setOtpError('');
  };

  const handleSendDeleteOtp = async () => {
    if (!user?.phone || isSendingOtp) return;
    
    console.log('Starting OTP send for delete account:', user.phone);
    setIsSendingOtp(true);
    setOtpError('');
    
    try {
      console.log('Calling sendOtp function...');
      const result = await sendOtp(user.phone);
      console.log('SendOtp result:', result);
      
      if (result.success) {
        console.log('OTP sent successfully');
        setOtpSent(true);
        setOtpError('');
      } else {
        console.error('OTP send failed:', result.error);
        setOtpError(result.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Exception during OTP send:', error);
      setOtpError('Failed to send OTP. Please try again.');
    } finally {
      console.log('OTP send process completed');
      setIsSendingOtp(false);
    }
  };

  const handleVerifyDeleteOtp = async () => {
    if (!user?.phone || !otpCode || isVerifyingOtp) return;
    
    if (otpCode.length !== 6) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    
    setIsVerifyingOtp(true);
    setOtpError('');
    
    try {
      const result = await verifyOtp(user.phone, otpCode);
      if (result.success) {
        // OTP verified, proceed with account deletion
        setDeleteModalVisible(false);
        performAccountDeletion();
      } else {
        setOtpError(result.error || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      setOtpError('Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpError('');
  };

  const performAccountDeletion = async () => {
    setIsDeletingAccount(true);
    
    try {
      console.log('=== SETTINGS: Starting account deletion ===');
      console.log('Current user state:', { user, isAuthenticated });
      
      const result = await deleteAccount();
      
      console.log('Delete account result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete account');
      }

      // Show success message
      if (Platform.OS === 'web') {
        window.alert('Your account has been permanently deleted. All your data including customers, transactions, and profile information have been completely removed from our servers. You will need to sign up again to use the app.');
      } else {
        Alert.alert(
          'Account Permanently Deleted',
          'Your account has been permanently deleted. All your data including:\n\n• All customers and their information\n• All transaction history\n• Your profile and settings\n• All local app data\n\nEverything has been completely removed from our servers. You will need to sign up again to use the app.',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('Account deletion failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      
      if (Platform.OS === 'web') {
        window.alert(`Failed to delete account: ${errorMessage}`);
      } else {
        Alert.alert(
          'Deletion Failed',
          `Failed to delete account: ${errorMessage}`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const getThemeIcon = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return <Sun size={20} color={theme.colors.primary} />;
      case 'dark':
        return <Moon size={20} color={theme.colors.primary} />;
      case 'system':
        return <Smartphone size={20} color={theme.colors.primary} />;
    }
  };

  const getThemeLabel = (mode: ThemeMode) => {
    switch (mode) {
      case 'light':
        return t('lightMode');
      case 'dark':
        return t('darkMode');
      case 'system':
        return t('systemMode');
    }
  };

  // Get fully opaque modal background colors
  const getModalBackgroundColor = () => {
    return isDark ? '#1E1E2E' : '#FFFFFF';
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress,
    showChevron = true,
    isDestructive = false
  }: { 
    icon: React.ReactNode; 
    title: string; 
    subtitle?: string; 
    onPress: () => void;
    showChevron?: boolean;
    isDestructive?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.modernSettingItem, { backgroundColor: theme.colors.surface }]} 
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.modernIconContainer, { 
          backgroundColor: isDestructive ? (isDark ? '#7F1D1D' : '#fee2e2') : (isDark ? '#1E3A8A' : '#dbeafe')
        }]}>
          {icon}
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.modernSettingTitle, { 
            color: isDestructive ? (isDark ? '#FCA5A5' : '#dc2626') : theme.colors.text
          }]}>{title}</Text>
          {subtitle && <Text style={[styles.modernSettingSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>}
        </View>
      </View>
      {showChevron && <ChevronRight size={22} color={theme.colors.textSecondary} />}
    </TouchableOpacity>
  );

  const ModalOption = ({ 
    icon, 
    title, 
    selected, 
    onPress 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    selected: boolean; 
    onPress: () => void; 
  }) => (
    <TouchableOpacity 
      style={[
        styles.modalOption, 
        { 
          backgroundColor: selected ? theme.colors.primary + '20' : 'transparent',
          borderColor: selected ? theme.colors.primary : theme.colors.border
        }
      ]} 
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress();
      }}
    >
      <View style={styles.modalOptionLeft}>
        {icon}
        <Text style={[styles.modalOptionText, { color: theme.colors.text }]}>{title}</Text>
      </View>
      {selected && (
        <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]} />
      )}
    </TouchableOpacity>
  );





  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header - Following Gramin Calculator Results Page Structure */}
      <View style={[styles.simpleHeader, { 
        paddingTop: Platform.OS === 'ios' ? insets.top + (screenWidth < 375 ? 6 : screenWidth < 414 ? 8 : 10) : insets.top + 40, // Increased padding for Android camera area
        marginTop: Platform.OS === 'android' ? -insets.top : 0, // Negative margin to extend behind status bar on Android
      }]}>
        <View style={styles.headerTitleRow}>
          <Settings size={28} color="white" />
          <Text style={styles.simpleHeaderTitle}>
            {t('settings')}
          </Text>
        </View>
      </View>
      
      <ScrollView 
        style={[styles.scrollContainer, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        <View style={styles.modernSection}>
          <Text style={[styles.modernSectionTitle, { color: theme.colors.textSecondary }]}>ACCOUNT</Text>
          <View style={[styles.modernSectionCard, { backgroundColor: theme.colors.surface }]}>
            {isAuthenticated ? (
              <>
                <View style={styles.userInfoCard}>
                  <View style={styles.settingItemLeft}>
                    <View style={[styles.modernIconContainer, { backgroundColor: isDark ? '#1E3A8A' : '#dbeafe' }]}>
                      <User size={26} color="#2563eb" />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.userNameText, { color: theme.colors.text }]}>{user?.name}</Text>
                      <Text style={[styles.userPhoneText, { color: theme.colors.textSecondary }]}>{user?.phone}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <SettingItem
                  icon={<LogOut size={26} color={isDark ? '#FCA5A5' : '#dc2626'} />}
                  title={isSigningOut ? "Signing Out..." : "Sign Out"}
                  onPress={handleSignOut}
                  showChevron={false}
                  isDestructive={true}
                />

              </>
            ) : (
              <SettingItem
                icon={<User size={26} color="#2563eb" />}
                title="Sign In"
                subtitle={t('accessBusinessDashboard')}
                onPress={handleSignIn}
              />
            )}
          </View>
        </View>

        {/* Offline Status Section */}
        <View style={styles.modernSection}>
          <Text style={[styles.modernSectionTitle, { color: theme.colors.textSecondary }]}>SYNC STATUS</Text>
          <OfflineStatusCard onSync={syncPendingOperations} />
        </View>

        {/* Language Section */}
        <View style={styles.modernSection}>
          <Text style={[styles.modernSectionTitle, { color: theme.colors.textSecondary }]}>{t('language').toUpperCase()}</Text>
          <View style={[styles.modernSectionCard, { backgroundColor: theme.colors.surface }]}>
            <SettingItem
              icon={<Globe size={26} color="#2563eb" />}
              title={t('language')}
              subtitle={language === 'en' ? t('english') : t('nepali')}
              onPress={() => setLanguageModalVisible(true)}
            />
          </View>
        </View>

        {/* Theme Section */}
        <View style={styles.modernSection}>
          <Text style={[styles.modernSectionTitle, { color: theme.colors.textSecondary }]}>{t('theme').toUpperCase()}</Text>
          <View style={[styles.modernSectionCard, { backgroundColor: theme.colors.surface }]}>
            <SettingItem
              icon={<Palette size={26} color="#2563eb" />}
              title={t('theme')}
              subtitle={getThemeLabel(themeMode)}
              onPress={() => setThemeModalVisible(true)}
            />
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.modernSection}>
          <Text style={[styles.modernSectionTitle, { color: theme.colors.textSecondary }]}>LEGAL</Text>
          <View style={[styles.modernSectionCard, { backgroundColor: theme.colors.surface }]}>
            <SettingItem
              icon={<Shield size={26} color="#2563eb" />}
              title={t('privacyPolicy')}
              onPress={handlePrivacyPolicy}
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <SettingItem
              icon={<FileText size={26} color="#2563eb" />}
              title={t('termsOfService')}
              onPress={handleTermsOfService}
            />
          </View>
        </View>



        {/* App Section */}
        <View style={styles.modernSection}>
          <Text style={[styles.modernSectionTitle, { color: theme.colors.textSecondary }]}>APP</Text>
          <View style={[styles.modernSectionCard, { backgroundColor: theme.colors.surface }]}>
            <SettingItem
              icon={<Info size={26} color="#2563eb" />}
              title={t('aboutApp')}
              onPress={handleAbout}
            />
            {/* Delete Account Button - Only show if authenticated */}
            {isAuthenticated && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <SettingItem
                  icon={<Trash2 size={26} color={isDark ? '#FCA5A5' : '#dc2626'} />}
                  title={isDeletingAccount ? "Deleting Account..." : "Delete Account"}
                  subtitle="Permanently delete all your data"
                  onPress={handleDeleteAccount}
                  showChevron={false}
                  isDestructive={true}
                />
              </>
            )}
          </View>
        </View>

        {/* Version Section - Always at the bottom */}
        <View style={styles.modernSection}>
          <View style={[styles.modernSectionCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.versionContainer}>
              <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
                {t('version')} 1.0.0
              </Text>
            </View>
          </View>
        </View>

        {/* Language Selection Modal */}
        <Modal
          visible={languageModalVisible}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: getModalBackgroundColor() }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('selectLanguage')}</Text>
              
              <ModalOption
                icon={<Text style={styles.flagText}>🇺🇸</Text>}
                title={t('english')}
                selected={language === 'en'}
                onPress={() => {
                  setLanguage('en');
                  setLanguageModalVisible(false);
                }}
              />
              
              <ModalOption
                icon={<Text style={styles.flagText}>🇳🇵</Text>}
                title={t('nepali')}
                selected={language === 'ne'}
                onPress={() => {
                  setLanguage('ne');
                  setLanguageModalVisible(false);
                }}
              />
              
              <Pressable 
                style={[styles.modalCloseButton, { backgroundColor: theme.colors.border }]} 
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setLanguageModalVisible(false);
                }}
              >
                <Text style={[styles.modalCloseButtonText, { color: theme.colors.text }]}>{t('cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Theme Selection Modal */}
        <Modal
          visible={themeModalVisible}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: getModalBackgroundColor() }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('selectTheme')}</Text>
              
              <ModalOption
                icon={<Sun size={24} color={theme.colors.primary} />}
                title={t('lightMode')}
                selected={themeMode === 'light'}
                onPress={() => {
                  setThemeMode('light');
                  setThemeModalVisible(false);
                }}
              />
              
              <ModalOption
                icon={<Moon size={24} color={theme.colors.primary} />}
                title={t('darkMode')}
                selected={themeMode === 'dark'}
                onPress={async () => {
                  console.log('Dark mode selected');
                  await setThemeMode('dark');
                  console.log('Dark mode set, closing modal');
                  setThemeModalVisible(false);
                }}
              />
              
              <ModalOption
                icon={<Smartphone size={24} color={theme.colors.primary} />}
                title={t('systemMode')}
                selected={themeMode === 'system'}
                onPress={() => {
                  setThemeMode('system');
                  setThemeModalVisible(false);
                }}
              />
              
              <Pressable 
                style={[styles.modalCloseButton, { backgroundColor: theme.colors.border }]} 
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setThemeModalVisible(false);
                }}
              >
                <Text style={[styles.modalCloseButtonText, { color: theme.colors.text }]}>{t('cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Delete Account Confirmation Modal */}
        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="slide"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.deleteModalContent, { backgroundColor: getModalBackgroundColor() }]}>
              <View style={styles.deleteModalHeader}>
                <Text style={[styles.deleteModalTitle, { color: isDark ? '#FCA5A5' : '#dc2626' }]}>Delete Account</Text>
                <TouchableOpacity 
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    closeDeleteModal();
                  }} 
                  style={styles.closeButton}
                >
                  <X size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <Text style={[styles.deleteModalWarning, { color: theme.colors.text }]}>
                This will permanently delete all your data including loans, customers, and transaction entries. This action cannot be undone.
              </Text>
              
              {!otpSent ? (
                <View style={styles.deleteModalActions}>
                  <Text style={[styles.otpInstructions, { color: theme.colors.textSecondary }]}>
                    {t('forSecuritySendVerificationCode')} {user?.phone}
                  </Text>
                  
                  {otpError ? (
                    <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#dc2626' }]}>
                      {otpError}
                    </Text>
                  ) : null}
                  
                  <TouchableOpacity 
                    style={[styles.sendOtpButton, { 
                      backgroundColor: isDark ? '#7F1D1D' : '#dc2626',
                      opacity: isSendingOtp ? 0.7 : 1
                    }]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      handleSendDeleteOtp();
                    }}
                    disabled={isSendingOtp}
                  >
                    <Text style={styles.sendOtpButtonText}>
                      {isSendingOtp ? t('sendingOTP') : t('sendVerificationCode')}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.cancelButton, { backgroundColor: theme.colors.border }]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      closeDeleteModal();
                    }}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.deleteModalActions}>
                  <Text style={[styles.otpInstructions, { color: theme.colors.textSecondary }]}>
                    Enter the 6-digit code sent to {user?.phone}
                  </Text>
                  
                  <TextInputWithDoneBar
                    style={[styles.otpInput, { 
                      backgroundColor: theme.colors.surface,
                      borderColor: otpError ? (isDark ? '#FCA5A5' : '#dc2626') : theme.colors.border,
                      color: theme.colors.text
                    }]}
                    value={otpCode}
                    onChangeText={(text) => {
                      setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                      setOtpError('');
                    }}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                    maxLength={6}
                    autoFocus
                  />
                  
                  {otpError ? (
                    <Text style={[styles.errorText, { color: isDark ? '#FCA5A5' : '#dc2626' }]}>
                      {otpError}
                    </Text>
                  ) : null}
                  
                  <TouchableOpacity 
                    style={[styles.verifyButton, { 
                      backgroundColor: isDark ? '#7F1D1D' : '#dc2626',
                      opacity: (isVerifyingOtp || otpCode.length !== 6) ? 0.7 : 1
                    }]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      handleVerifyDeleteOtp();
                    }}
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                  >
                    <Text style={styles.verifyButtonText}>
                      {isVerifyingOtp ? 'Verifying...' : 'Verify & Delete Account'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.resendButton, { opacity: isSendingOtp ? 0.7 : 1 }]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      handleSendDeleteOtp();
                    }}
                    disabled={isSendingOtp}
                  >
                    <Text style={[styles.resendButtonText, { color: theme.colors.primary }]}>
                      {isSendingOtp ? 'Sending...' : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.cancelButton, { backgroundColor: theme.colors.border }]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      closeDeleteModal();
                    }}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>


      </ScrollView>
    </View>
  );
}

const { width: screenWidth } = Dimensions.get('window');

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
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: screenWidth < 375 ? 6 : 8,
  },
  simpleHeaderTitle: {
    fontSize: screenWidth < 375 ? 22 : screenWidth < 414 ? 24 : 26,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: screenWidth < 375 ? 12 : screenWidth < 414 ? 16 : 20,
    paddingTop: screenWidth < 375 ? 12 : 16,
    paddingBottom: screenWidth < 375 ? 20 : 24,
  },
  modernSection: {
    marginBottom: screenWidth < 375 ? 16 : 20,
  },
  modernSectionTitle: {
    fontSize: screenWidth < 375 ? 15 : screenWidth < 414 ? 16 : 17,
    fontWeight: '800',
    color: '#6b7280',
    marginBottom: screenWidth < 375 ? 8 : 10,
    marginLeft: 4,
    letterSpacing: 1,
  },
  modernSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: screenWidth < 375 ? 12 : 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  modernSettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenWidth < 375 ? 14 : screenWidth < 414 ? 16 : 20,
    paddingVertical: screenWidth < 375 ? 14 : screenWidth < 414 ? 16 : 18,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernIconContainer: {
    width: screenWidth < 375 ? 44 : 48,
    height: screenWidth < 375 ? 44 : 48,
    borderRadius: screenWidth < 375 ? 22 : 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: screenWidth < 375 ? 12 : 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  modernSettingTitle: {
    fontSize: screenWidth < 375 ? 17 : screenWidth < 414 ? 18 : 19,
    fontWeight: '700',
    lineHeight: screenWidth < 375 ? 22 : 24,
  },
  modernSettingSubtitle: {
    fontSize: screenWidth < 375 ? 14 : screenWidth < 414 ? 15 : 16,
    marginTop: 2,
    lineHeight: screenWidth < 375 ? 18 : 20,
    fontWeight: '500',
  },
  userInfoCard: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  userNameText: {
    fontSize: screenWidth < 375 ? 17 : screenWidth < 414 ? 18 : 19,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: screenWidth < 375 ? 22 : 24,
  },
  userPhoneText: {
    fontSize: screenWidth < 375 ? 14 : screenWidth < 414 ? 15 : 16,
    color: '#6b7280',
    marginTop: 2,
    lineHeight: screenWidth < 375 ? 18 : 20,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 20,
  },
  versionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  versionText: {
    fontSize: screenWidth < 375 ? 14 : screenWidth < 414 ? 15 : 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: screenWidth < 375 ? '85%' : '80%',
    borderRadius: 12,
    padding: screenWidth < 375 ? 16 : 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: screenWidth < 375 ? 17 : screenWidth < 414 ? 18 : 19,
    fontWeight: '800',
    marginBottom: screenWidth < 375 ? 16 : 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: screenWidth < 375 ? 14 : 16,
    borderRadius: 8,
    marginBottom: screenWidth < 375 ? 10 : 12,
    borderWidth: 2,
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: screenWidth < 375 ? 15 : screenWidth < 414 ? 16 : 17,
    marginLeft: screenWidth < 375 ? 10 : 12,
    fontWeight: '600',
  },
  flagText: {
    fontSize: 24,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalCloseButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  deleteModalContent: {
    width: screenWidth < 375 ? '90%' : '85%',
    borderRadius: 16,
    padding: screenWidth < 375 ? 20 : 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  deleteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: screenWidth < 375 ? 20 : 22,
    fontWeight: '800',
  },
  closeButton: {
    padding: 4,
  },
  deleteModalWarning: {
    fontSize: screenWidth < 375 ? 15 : 16,
    lineHeight: screenWidth < 375 ? 22 : 24,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  deleteModalActions: {
    gap: 16,
  },
  otpInstructions: {
    fontSize: screenWidth < 375 ? 14 : 15,
    textAlign: 'center',
    lineHeight: screenWidth < 375 ? 20 : 22,
    fontWeight: '500',
  },
  otpInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 4,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  sendOtpButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendOtpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  verifyButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
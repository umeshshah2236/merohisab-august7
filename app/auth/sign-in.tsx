import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, Dimensions, TouchableWithoutFeedback, Keyboard, TextInput } from 'react-native';
import TextInputWithDoneBar from '@/components/TextInputWithDoneBar';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { ArrowLeft, Phone, MessageSquare } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNetwork } from '@/contexts/NetworkContext';

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

export default function SignInScreen() {
  const { t } = useLanguage();
  const { theme, isDark } = useTheme();
  const { checkUserExists, sendOtp, verifyOtp } = useAuth();
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const phoneInputRef = useRef<any>(null);
  const otpInputRef = useRef<any>(null);
  
  const [phoneNumber, setPhoneNumber] = useState('+977');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpExpiryTime, setOtpExpiryTime] = useState<number | null>(null);
  const [otpExpired, setOtpExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [errors, setErrors] = useState<{
    phone?: string;
    otp?: string;
  }>({});

  // Countdown timer for resend OTP
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  // OTP expiry timer
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (otpExpiryTime && isOtpSent) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = otpExpiryTime - now;
        
        if (remaining <= 0) {
          setOtpExpired(true);
          setTimeRemaining('');
          clearInterval(interval);
        } else {
          const minutes = Math.floor(remaining / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpExpiryTime, isOtpSent]);

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove spaces and check if it starts with +977 and has exactly 10 digits after
    const cleanPhone = phone.replace(/\s/g, '');
    const nepaliPhoneRegex = /^\+977[0-9]{10}$/;
    return nepaliPhoneRegex.test(cleanPhone);
  };

  const handleSendOtp = async (isResend = false) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // 🌐 Check network connectivity first
    if (!isOnline) {
      setErrors({ phone: t('noInternetConnectionCheckNetwork') });
      Alert.alert(t('noInternetConnection'), t('pleaseCheckNetworkConnection'));
      return;
    }

    if (isResend) {
      setIsResending(true);
    } else {
      setIsLoading(true);
    }
    setErrors({});

    if (!validatePhoneNumber(phoneNumber)) {
      setErrors({ phone: 'Please enter a valid Nepali phone number (+977XXXXXXXXXX)' });
      if (isResend) {
        setIsResending(false);
      } else {
        setIsLoading(false);
      }
      return;
    }

    const cleanPhone = phoneNumber.replace(/\s/g, '');

    // Check if user exists before sending OTP (only for initial send, not resend)
    if (!isResend) {
      const userCheck = await checkUserExists(cleanPhone);
      
      if (userCheck.error) {
        setErrors({ phone: userCheck.error });
        setIsLoading(false);
        return;
      }

      // For both new and existing users, send OTP for verification
      // The system will automatically create account if user doesn't exist
    }

    const result = await sendOtp(cleanPhone);

    if (result.success) {
      setIsOtpSent(true);
      setCountdown(60); // 1 minute countdown (60 seconds)
      setOtpExpiryTime(result.expiresAt || (Date.now() + (10 * 60 * 1000))); // Use server time or fallback to 10 minutes
      setOtpExpired(false);
      setOtp(''); // Clear previous OTP
      Alert.alert(t('otpSent'), t('pleaseCheckPhoneForVerificationCode'));
    } else {
      setErrors({ phone: result.error });
      Alert.alert(t('failedToSendOTP'), result.error || t('pleaseTryAgain'));
    }

    if (isResend) {
      setIsResending(false);
    } else {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // 🌐 Check network connectivity first
    if (!isOnline) {
      setErrors({ otp: t('noInternetConnectionCheckNetwork') });
      Alert.alert(t('noInternetConnection'), t('pleaseCheckNetworkConnection'));
      return;
    }

    setIsLoading(true);
    setErrors({});

    if (!otp || otp.length !== 6) {
      setErrors({ otp: t('pleaseEnterThe6DigitOTP') });
      setIsLoading(false);
      return;
    }

    if (otpExpired) {
      setErrors({ otp: t('otpHasExpiredPleaseRequestNewCode') });
      setIsLoading(false);
      return;
    }

    const result = await verifyOtp(phoneNumber.replace(/\s/g, ''), otp);

    if (result.success) {
      // Clear all OTP-related state on success
      setIsOtpSent(false);
      setOtp('');
      setErrors({});
      setCountdown(0);
      setOtpExpiryTime(null);
      setOtpExpired(false);
      setTimeRemaining('');
      
      // Navigate immediately to dashboard for seamless transition
      router.replace('/(tabs)/(home)/dashboard');
    } else {
      setErrors({ otp: result.error });
      
      // If the error indicates expired/invalid OTP, suggest requesting new code
      if (result.error?.includes('expired') || result.error?.includes('invalid')) {
        Alert.alert(
          t('verificationFailed'), 
          result.error,
          [
            { text: t('ok'), style: 'default' },
            { 
              text: t('requestNewCode'), 
              onPress: () => {
                setIsOtpSent(false);
                setOtp('');
                setErrors({});
                setCountdown(0);
                setOtpExpiryTime(null);
                setOtpExpired(false);
                setTimeRemaining('');
              }
            }
          ]
        );
      } else {
        Alert.alert(t('verificationFailed'), result.error || t('pleaseTryAgain'));
      }
    }

    setIsLoading(false);
  };

  const handleGoBack = () => {
    // INSTANT haptic feedback for maximum responsiveness (same as Home → Calculator approach)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Remove delay for instant navigation (same as Home → Calculator approach)
    router.back();
  };





  // Responsive header sizing - more compact
  const headerPaddingTop = Math.max(insets.top + getResponsiveSize(12, 16, 20), 40);
  const headerPaddingBottom = getResponsiveSize(16, 20, 24);
  const headerPaddingHorizontal = getResponsiveSize(12, 16, 20);

  const inputBackgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : theme.colors.inputBackground;
  const inputBorderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border;
  const inputTextColor = isDark ? 'white' : theme.colors.text;
  const placeholderTextColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(160, 160, 160, 0.8)';

  return (
    <>
      <Stack.Screen options={{ 
        headerShown: false,
      }} />
      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} style={{ backgroundColor: theme.colors.background, flex: 1 }}>
          <ScrollView 
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={[styles.contentContainer, { backgroundColor: theme.colors.background }]}
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
                  fontSize: getResponsiveSize(22, 26, 30),
                }]}>
                  {isOtpSent ? t('verifyCode') : t('welcomeBack')}
                </Text>
                <Text style={[styles.headerSubtitle, {
                  fontSize: getResponsiveSize(13, 14, 15),
                  marginTop: getResponsiveSize(2, 4, 6),
                  marginBottom: getResponsiveSize(4, 6, 8),
                }]}>
                  {isOtpSent ? t('enterVerificationCodeSentToPhone') : t('signInOrCreateAccount')}
                </Text>
              </View>
              
              <View style={[styles.spacer, {
                width: getResponsiveSize(40, 44, 48),
              }]} />
            </View>
          </LinearGradient>
          
          <View style={[styles.formContainer, { 
            backgroundColor: theme.colors.surface,
            paddingHorizontal: getResponsiveSize(16, 20, 24),
            paddingTop: getResponsiveSize(24, 28, 32),
            marginHorizontal: getResponsiveSize(12, 16, 20),
            marginTop: getResponsiveSize(-16, -20, -24),
            borderRadius: getResponsiveSize(16, 18, 20),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 12,
            elevation: 8,
          }]}>
            {!isOtpSent ? (
              /* Phone Number Input */
              <View style={[styles.inputWrapper, {
                marginBottom: getResponsiveSize(20, 24, 28),
                marginTop: getResponsiveSize(2, 4, 6),
              }]}>
                <Text style={[styles.inputLabel, { 
                  color: theme.colors.text,
                  fontSize: getResponsiveSize(16, 17, 18),
                  fontWeight: '700',
                }]}>
                  {t('phoneNumber')}
                </Text>
                 <View style={[styles.inputContainer, {
                   borderColor: errors.phone ? '#ef4444' : theme.colors.border,
                   backgroundColor: theme.colors.background,
                 }]}>
                  <Phone size={20} color={isDark ? '#94a3b8' : '#64748b'} style={styles.inputIcon} /> 
                  <TextInputWithDoneBar
                    ref={phoneInputRef}
                    style={[styles.input, { color: theme.colors.text }, Platform.OS === 'web' && styles.webInput]}
                    value={phoneNumber}
                    onChangeText={(text) => {
                      // Add haptic feedback when user starts typing
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      // Ensure +977 prefix is always present
                      if (!text.startsWith('+977')) {
                        setPhoneNumber('+977');
                      } else {
                        setPhoneNumber(text);
                      }
                    }}
                    placeholder="+977 98XXXXXXXX"
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    maxLength={14}
                    spellCheck={false}
                    autoComplete="off"
                    textContentType="telephoneNumber"
                    returnKeyType="done"
                  />
                </View>
                {errors.phone && (
                  <Text style={[styles.errorText, { color: '#ef4444' }]}> 
                    {errors.phone}
                  </Text>
                )}
              </View>
            ) : (
              /* OTP Input */
              <View style={[styles.inputWrapper, {
                marginBottom: getResponsiveSize(20, 24, 28),
              }]}>
                <Text style={[styles.inputLabel, { 
                  color: theme.colors.text,
                  fontSize: getResponsiveSize(16, 17, 18),
                  fontWeight: '700',
                }]}>
                  {t('verificationCode')}
                </Text>
                <Text style={[styles.otpHint, { 
                  color: otpExpired ? '#ef4444' : (isDark ? '#94a3b8' : '#64748b'),
                  fontSize: getResponsiveSize(12, 13, 14),
                }]}>
                  {otpExpired 
                    ? t('otpHasExpiredPleaseRequestNewCode')
                    : Platform.OS === 'android' 
                      ? `${t('pleaseEnterThe6DigitOTP')}.${timeRemaining ? ` Expires in ${timeRemaining}` : ''}`
                      : `${t('pleaseEnterThe6DigitOTP')}.${timeRemaining ? ` Expires in ${timeRemaining}` : ''}`
                  }
                </Text>
                 <View style={[styles.inputContainer, {
                   borderColor: errors.otp ? '#ef4444' : theme.colors.border,
                   backgroundColor: theme.colors.background,
                 }]}>
                  <MessageSquare size={20} color={isDark ? '#94a3b8' : '#64748b'} style={styles.inputIcon} />
                  <TextInputWithDoneBar
                    ref={otpInputRef}
                    style={[styles.input, { color: theme.colors.text, textAlign: 'center', letterSpacing: 4 }, Platform.OS === 'web' && styles.webInput]}
                    value={otp}
                    onChangeText={(text) => {
                      // Add haptic feedback when user starts typing
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setOtp(text);
                    }}
                    placeholder="000000"
                    placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    maxLength={6}
                    spellCheck={false}
                    autoComplete="off"
                    textContentType="oneTimeCode"
                    returnKeyType="done"
                  />
                </View>
                {errors.otp && (
                  <Text style={[styles.errorText, { color: '#ef4444' }]}>
                    {errors.otp}
                  </Text>
                )}
                <View style={styles.otpActions}>
                  <TouchableOpacity 
                    style={[styles.resendButton, {
                      backgroundColor: (countdown > 0 || isResending) ? 'rgba(0,0,0,0.05)' : 'transparent',
                      borderRadius: 8,
                    }]}
                    onPress={() => handleSendOtp(true)}
                    disabled={countdown > 0 || isResending}
                  >
                    <Text style={[styles.resendText, { 
                      color: countdown > 0 ? (isDark ? '#64748b' : '#64748b') : (isDark ? '#60a5fa' : '#2563eb'),
                      opacity: countdown > 0 ? 0.6 : 1,
                      fontWeight: countdown > 0 ? '500' : '600'
                    }]}>
                      {isResending ? t('resendingOTP') : countdown > 0 ? `${t('resendOTP')} (${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')})` : t('resendOTP')}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.changeNumberButton}
                    onPress={() => {
                      setIsOtpSent(false);
                      setOtp('');
                      setErrors({});
                      setCountdown(0);
                      setOtpExpiryTime(null);
                      setOtpExpired(false);
                      setTimeRemaining('');
                    }}
                  >
                    <Text style={[styles.changeNumberText, { color: isDark ? '#94a3b8' : '#64748b' }]}> 
                      {t('changePhoneNumber')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
                         {/* Action Button */}
             <TouchableOpacity 
               style={[styles.signInButton, {
                 minHeight: getResponsiveSize(48, 52, 56),
                 opacity: (isLoading || (isOtpSent && otpExpired)) ? 0.7 : 1,
                 marginBottom: getResponsiveSize(24, 28, 32),
               }]} 
               onPress={() => {
                 // INSTANT haptic feedback for maximum responsiveness
                 if (Platform.OS !== 'web') {
                   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                 }
                 Keyboard.dismiss();
                 // Remove delay for instant response
                 isOtpSent ? handleVerifyOtp() : handleSendOtp(false);
               }}
               disabled={isLoading || (isOtpSent && otpExpired)}
               activeOpacity={0.2}
               hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
               pressRetentionOffset={{ top: 20, bottom: 20, left: 20, right: 20 }}
               delayPressIn={0}
               delayPressOut={0}
             >
               <LinearGradient
                 colors={['#2563eb', '#1d4ed8']}
                 style={styles.buttonGradient}
               >
                 <Text style={[styles.signInButtonText, {
                   fontSize: getResponsiveSize(14, 15, 16),
                 }]}>
                   {isLoading 
                     ? (isOtpSent ? t('verifyingOTP') : t('sendingOTPButton')) 
                     : (isOtpSent ? t('verifyOTP') : t('sendOTP'))
                   }
                 </Text>
               </LinearGradient>
             </TouchableOpacity>




          </View>
          </ScrollView>
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
    backgroundColor: '#FFFFFF', // Ensure white background
    flexGrow: 1, // Fill entire screen
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 8,
    minHeight: 40,
  },
  webInput: {
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
      outlineWidth: 0,
    }),
    cursor: 'text',
  } as any,
  errorText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  otpActions: {
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeNumberButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeNumberText: {
    fontSize: 13,
    fontWeight: '500',
  },
  otpHint: {
    marginBottom: 8,
    fontStyle: 'italic',
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
  },
  signInButtonText: {
    color: 'white',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

});
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Calculator, ArrowLeftRight, ArrowRight, ClipboardList, Sparkles, TrendingUp, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/contexts/AuthContext';

import NameInputModal from '@/components/NameInputModal';
import { capitalizeFirstLetters } from '@/utils/string-utils';

export default function HomeScreen() {
  const { t } = useLanguage();
  const { theme, isDark, isLoading: themeLoading } = useTheme();
  const { firstName, isFirstLaunch, isLoading, setUserName, skipNameEntry } = useUserProfile();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();
  const [isPageFullyLoaded, setIsPageFullyLoaded] = useState(false);
  
  // ALL useEffect hooks must come before any early returns
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      console.log('User authenticated, redirecting to dashboard');
      // Immediate redirect for faster transition
      router.replace('/(tabs)/(home)/dashboard');
    }
  }, [isAuthenticated, authLoading]);

  // Mark page as fully loaded
  useEffect(() => {
    if (!isLoading && !authLoading && !themeLoading) {
      const timer = setTimeout(() => {
        setIsPageFullyLoaded(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, authLoading, themeLoading]);

  // Android-specific responsive dimensions
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isAndroid = Platform.OS === 'android';
  
  // Android aggressive responsive scaling to fit everything on screen
  const isSmallScreen = screenHeight < 700;
  const isVerySmallScreen = screenHeight < 600;
  
  // Debug logging for Android devices
  if (isAndroid) {
    // Removed excessive screen dimensions logging to prevent render loops
  }
  
  const getResponsiveSize = (baseSize: number) => {
    if (!isAndroid) return baseSize; // Keep iOS unchanged
    
    // ULTRA aggressive scaling for small screens
    if (isVerySmallScreen) return Math.round(baseSize * 0.45); // 55% smaller
    if (isSmallScreen) return Math.round(baseSize * 0.6); // 40% smaller
    
    const scale = screenWidth / 375;
    return Math.round(baseSize * Math.min(Math.max(scale, 0.65), 0.9));
  };
  
  const getResponsivePadding = (basePadding: number) => {
    if (!isAndroid) return basePadding; // Keep iOS unchanged
    
    // ULTRA aggressive padding reduction for small screens
    if (isVerySmallScreen) return Math.round(basePadding * 0.35); // 65% smaller
    if (isSmallScreen) return Math.round(basePadding * 0.45); // 55% smaller
    
    const scale = screenWidth / 375;
    return Math.round(basePadding * Math.min(Math.max(scale, 0.6), 0.85));
  };

  const handleFeaturePress = (route: string) => {
    // INSTANT haptic feedback for maximum responsiveness
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Remove delay for instant navigation
    router.push(route as any);
  };

  const handleTrackLoansPress = () => {
    // INSTANT haptic feedback for maximum responsiveness
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // Remove delay for instant navigation
    if (!isAuthenticated) {
      router.push('/auth/sign-in');
    } else {
      router.push('/(tabs)/(home)/dashboard');
    }
  };

  const getGreeting = () => {
    if (firstName) {
      return `Hi! ${capitalizeFirstLetters(firstName)}`;
    }
    return 'Hi there!';
  };

  // Show loading screen
  if (isLoading || authLoading || themeLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading...</Text>
      </View>
    );
  }

  // Don't render content if user is authenticated (will redirect) - but show background to prevent white page
  if (!authLoading && isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]} />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.contentContainer, {
          // Force minimum content height for scrolling on Android
          minHeight: isAndroid && isVerySmallScreen ? screenHeight * 1.2 : undefined,
        }]}
        showsVerticalScrollIndicator={true}
        indicatorStyle={isDark ? 'white' : 'black'}
        bounces={true}
        alwaysBounceVertical={false}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={isDark ? ['#1e3a8a', '#3b82f6'] : ['#1e40af', '#2563eb']}
          style={[styles.heroSection, { 
            paddingTop: Platform.OS === 'ios' ? insets.top + 20 : insets.top + getResponsivePadding(isVerySmallScreen ? 20 : 40),
            paddingBottom: getResponsivePadding(isVerySmallScreen ? 15 : 28),
            paddingHorizontal: getResponsivePadding(20),
            marginTop: Platform.OS === 'android' ? -insets.top : 0,
            // DRASTICALLY limit height on small screens
            ...(isAndroid && isVerySmallScreen && { maxHeight: screenHeight * 0.25 }),
            ...(isAndroid && isSmallScreen && !isVerySmallScreen && { maxHeight: screenHeight * 0.3 }),
          }]}
        >
          <View style={styles.heroContent}>
            {/* Logo and Title */}
            <View style={styles.logoRow}>
              <View style={[styles.logoIcon, {
                width: getResponsiveSize(44),
                height: getResponsiveSize(44),
                borderRadius: getResponsiveSize(22),
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                borderWidth: 2,
                borderColor: 'rgba(255, 255, 255, 0.4)',
              }]}>
                <Sparkles size={getResponsiveSize(22)} color="#ffffff" />
              </View>
              <Text style={[styles.appTitle, {
                fontSize: getResponsiveSize(26),
                marginLeft: getResponsivePadding(14),
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }]}>
                {t('appTitle')}
              </Text>
            </View>

            {/* Welcome Message */}
            <View style={[styles.welcomeSection, { marginTop: getResponsivePadding(isVerySmallScreen ? 8 : 16) }]}>
              <Text style={[styles.welcomeTitle, {
                fontSize: getResponsiveSize(isVerySmallScreen ? 16 : 20),
                marginBottom: getResponsivePadding(isVerySmallScreen ? 3 : 6),
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 1,
              }]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.welcomeSubtitle, {
                fontSize: getResponsiveSize(isVerySmallScreen ? 13 : 16),
                lineHeight: getResponsiveSize(isVerySmallScreen ? 16 : 22),
                textShadowColor: 'rgba(0, 0, 0, 0.15)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 1,
              }]}>
                {t('financialTools')}
              </Text>
            </View>

            {/* Trust Indicators */}
            <View style={[styles.trustIndicators, {
              marginTop: getResponsivePadding(isVerySmallScreen ? 8 : 16),
              alignSelf: 'center',
              width: '100%',
              maxWidth: isAndroid ? screenWidth * 0.9 : 300,
            }]}>
              <View style={styles.trustItem}>
                <Shield size={getResponsiveSize(isVerySmallScreen ? 14 : 18)} color="#ffffff" />
                <Text style={[styles.trustText, { fontSize: getResponsiveSize(isVerySmallScreen ? 11 : 14) }]}>Secure</Text>
              </View>
              <View style={styles.trustItem}>
                <TrendingUp size={getResponsiveSize(isVerySmallScreen ? 14 : 18)} color="#ffffff" />
                <Text style={[styles.trustText, { fontSize: getResponsiveSize(isVerySmallScreen ? 11 : 14) }]}>Reliable</Text>
              </View>
              <View style={styles.trustItem}>
                <Sparkles size={getResponsiveSize(isVerySmallScreen ? 14 : 18)} color="#ffffff" />
                <Text style={[styles.trustText, { fontSize: getResponsiveSize(isVerySmallScreen ? 11 : 14) }]}>Easy to Use</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        
        {/* Features Section */}
        <View style={[styles.featuresSection, {
          paddingHorizontal: getResponsivePadding(20),
          marginTop: getResponsivePadding(isVerySmallScreen ? -8 : -16),
          marginBottom: getResponsivePadding(isVerySmallScreen ? 12 : 24),
        }]}>
          <TouchableOpacity 
            style={[styles.featureCard, {
              backgroundColor: theme.colors.surface,
              marginBottom: getResponsivePadding(18),
              paddingHorizontal: getResponsivePadding(20),
              paddingVertical: getResponsivePadding(16),
            }]}
            onPress={() => handleFeaturePress('/(tabs)/(home)/calculator')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { 
              backgroundColor: isDark ? '#1e3a8a' : '#dbeafe',
              width: getResponsiveSize(isVerySmallScreen ? 40 : 52),
              height: getResponsiveSize(isVerySmallScreen ? 40 : 52),
              borderWidth: 2,
              borderColor: isDark ? '#3b82f6' : '#2563eb',
            }]}>
              <Calculator size={getResponsiveSize(isVerySmallScreen ? 18 : 22)} color={isDark ? '#ffffff' : '#2563eb'} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, {
                fontSize: getResponsiveSize(isVerySmallScreen ? 15 : 18),
                color: theme.colors.text,
                fontWeight: '500',
              }]}>
                {t('calculator')}
              </Text>
              <Text style={[styles.featureDesc, {
                fontSize: getResponsiveSize(isVerySmallScreen ? 13 : 16),
                color: theme.colors.textSecondary,
                lineHeight: getResponsiveSize(isVerySmallScreen ? 17 : 22),
                fontWeight: '400',
              }]}>
                {t('calculateInterestDesc')}
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <ArrowRight size={getResponsiveSize(20)} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.featureCard, {
              backgroundColor: theme.colors.surface,
              marginBottom: getResponsivePadding(18),
              paddingHorizontal: getResponsivePadding(20),
              paddingVertical: getResponsivePadding(16),
            }]}
            onPress={() => handleFeaturePress('/(tabs)/(home)/karobar')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { 
              backgroundColor: isDark ? '#92400e' : '#fef3c7',
              width: getResponsiveSize(isVerySmallScreen ? 40 : 52),
              height: getResponsiveSize(isVerySmallScreen ? 40 : 52),
              borderWidth: 2,
              borderColor: isDark ? '#f59e0b' : '#d97706',
            }]}>
              <ArrowLeftRight size={getResponsiveSize(isVerySmallScreen ? 18 : 22)} color={isDark ? '#ffffff' : '#d97706'} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, {
                fontSize: getResponsiveSize(isVerySmallScreen ? 15 : 18),
                color: theme.colors.text,
                fontWeight: '500',
              }]}>
                {t('karobar')}
              </Text>
              <Text style={[styles.featureDesc, {
                fontSize: getResponsiveSize(isVerySmallScreen ? 13 : 16),
                color: theme.colors.textSecondary,
                lineHeight: getResponsiveSize(isVerySmallScreen ? 17 : 22),
                fontWeight: '400',
              }]}>
                {t('trackLoansDesc')}
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <ArrowRight size={getResponsiveSize(20)} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Call to Action Section */}
        <View style={[styles.ctaSection, {
          paddingHorizontal: getResponsivePadding(isVerySmallScreen ? 12 : isSmallScreen ? 16 : 20),
          marginBottom: getResponsivePadding(isVerySmallScreen ? 10 : isSmallScreen ? 15 : 28),
          paddingBottom: getResponsivePadding(isVerySmallScreen ? 5 : isSmallScreen ? 8 : 16),
        }]}>
          <View style={[styles.ctaCard, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            paddingHorizontal: getResponsivePadding(isVerySmallScreen ? 12 : isSmallScreen ? 16 : 20),
            paddingVertical: getResponsivePadding(isVerySmallScreen ? 10 : isSmallScreen ? 12 : 16),
            borderRadius: getResponsiveSize(isVerySmallScreen ? 16 : isSmallScreen ? 20 : 24),
          }]}>
            <View style={styles.ctaContent}>
              <Text style={[styles.ctaTitle, {
                fontSize: getResponsiveSize(isVerySmallScreen ? 13 : isSmallScreen ? 16 : 20),
                marginBottom: getResponsivePadding(isVerySmallScreen ? 3 : isSmallScreen ? 5 : 8),
                color: theme.colors.text,
                fontWeight: '500',
                lineHeight: getResponsiveSize(isVerySmallScreen ? 16 : isSmallScreen ? 20 : 24),
              }]}>
                {t('readyToGetStarted')}
              </Text>
              <Text style={[styles.ctaSubtitle, {
                fontSize: getResponsiveSize(isVerySmallScreen ? 11 : isSmallScreen ? 13 : 17),
                marginBottom: getResponsivePadding(isVerySmallScreen ? 8 : isSmallScreen ? 12 : 20),
                lineHeight: getResponsiveSize(isVerySmallScreen ? 14 : isSmallScreen ? 16 : 23),
                color: theme.colors.textSecondary,
                fontWeight: '400',
              }]}>
                {t('joinThousandsOfUsers')}
              </Text>
              
              {/* Beautiful Nepali Style Button - Pure Blue Design */}
              <View style={{ backgroundColor: 'transparent', borderRadius: 30 }}>
                <Pressable 
                  style={({ pressed }: { pressed: boolean }) => [
                    styles.nepaliButton, 
                    {
                      paddingHorizontal: getResponsivePadding(isVerySmallScreen ? 18 : isSmallScreen ? 22 : 28),
                      paddingVertical: getResponsivePadding(isVerySmallScreen ? 10 : isSmallScreen ? 12 : 14),
                      backgroundColor: 'transparent',
                      // MAXIMUM RESPONSIVENESS: Both platforms get instant press animation
                      opacity: pressed ? 0.7 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    }
                  ]}
                  onPress={() => {
                    // INSTANT haptic feedback for maximum responsiveness
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    handleTrackLoansPress();
                  }}
                  // Enable ripple for better touch feedback
                  android_ripple={Platform.OS === 'android' ? { color: 'rgba(255,255,255,0.2)', borderless: false } : undefined}
                  android_disableSound={false}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                  pressRetentionOffset={{ top: 30, bottom: 30, left: 30, right: 30 }}
                >
                  {/* Decorative Border */}
                  <View style={[styles.nepaliButtonBorder, { backgroundColor: 'transparent' }]}>
                    {/* Main Gradient Content */}
                    <LinearGradient
                      colors={['#2563eb', '#1d4ed8', '#1e40af']}
                      style={styles.nepaliButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {/* Traditional Corner Decorations */}
                      <View style={styles.cornerDecorations}>
                        <View style={[styles.cornerDot, styles.topLeft]} />
                        <View style={[styles.cornerDot, styles.topRight]} />
                        <View style={[styles.cornerDot, styles.bottomLeft]} />
                        <View style={[styles.cornerDot, styles.bottomRight]} />
                      </View>
                      
                      {/* Content Container */}
                      <View style={styles.nepaliButtonContent}>
                        <ClipboardList 
                          size={getResponsiveSize(isVerySmallScreen ? 14 : isSmallScreen ? 16 : 20)} 
                          color="#ffffff" 
                          strokeWidth={2.5}
                        />
                        <Text style={[styles.nepaliButtonText, {
                          fontSize: getResponsiveSize(isVerySmallScreen ? 12 : isSmallScreen ? 14 : 17),
                          marginLeft: getResponsivePadding(isVerySmallScreen ? 6 : isSmallScreen ? 8 : 10),
                          lineHeight: getResponsiveSize(isVerySmallScreen ? 14 : isSmallScreen ? 16 : 20),
                        }]}>
                          {t('trackLoans')}
                        </Text>
                      </View>
                      
                      {/* Subtle Inner Blue Shine Effect */}
                      <LinearGradient
                        colors={['rgba(59,130,246,0.3)', 'transparent', 'rgba(29,78,216,0.2)']}
                        style={styles.buttonShine}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    </LinearGradient>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
        
        {/* Android scroll indicator for very small screens */}
        {isAndroid && isVerySmallScreen && (
          <View style={{
            alignItems: 'center',
            paddingVertical: 20,
            backgroundColor: theme.colors.background,
          }}>
            <Text style={{
              fontSize: 12,
              color: theme.colors.textSecondary,
              textAlign: 'center',
            }}>
              ↑ Scroll up to see more content ↑
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Name Input Modal */}
      {isFirstLaunch && isPageFullyLoaded && !isLoading && !authLoading && !themeLoading && (
        <NameInputModal
          visible={true}
          onNameSet={setUserName}
          onClose={skipNameEntry}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'android' 
      ? (Dimensions.get('window').height < 600 ? 40 : Math.max(60, Dimensions.get('window').height * 0.1))
      : 40,
  },
  heroSection: {
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    zIndex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appTitle: {
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  welcomeSection: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontWeight: '500',
    color: '#ffffff',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: '#ffffff',
    textAlign: 'center',
    maxWidth: Platform.OS === 'android' ? Dimensions.get('window').width * 0.75 : 280,
    fontWeight: '400',
  },
  trustIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  trustItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: Platform.OS === 'android' ? Math.max(80, Dimensions.get('window').width * 0.2) : 80,
  },
  trustText: {
    color: '#ffffff',
    fontWeight: '500',
    marginTop: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  featuresSection: {
    zIndex: 2,
  },
  featureCard: {
    borderRadius: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 16 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 3 : 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 8 : 16,
    elevation: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 6 : 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.1)',
  },
  iconContainer: {
    borderRadius: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 12 : 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 1 : 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 2 : 4,
    elevation: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 2 : 4,
  },
  featureContent: {
    flex: 1,
    marginLeft: Platform.OS === 'android' ? Math.max(16, Dimensions.get('window').width * 0.04) : 16,
  },
  featureTitle: {
    fontWeight: '500',
    marginBottom: 4,
  },
  featureDesc: {
    lineHeight: 20,
  },
  arrowContainer: {
    marginLeft: Platform.OS === 'android' ? Math.max(12, Dimensions.get('window').width * 0.032) : 12,
  },
  ctaSection: {},
  ctaCard: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaContent: {
    alignItems: 'center',
    width: '100%',
  },
  ctaTitle: {
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
  },
  ctaSubtitle: {
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: Platform.OS === 'android' ? Dimensions.get('window').width * 0.8 : 280,
  },
  // Beautiful Nepali Style Button
  nepaliButton: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    // iOS gets beautiful shadows
    ...(Platform.OS === 'ios' && {
      shadowColor: '#2563eb',
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      borderWidth: 0,
      borderColor: 'transparent',
    }),
    // Android gets clean flat design - no shadows/elevation
    ...(Platform.OS === 'android' && {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
      borderWidth: 0,
      borderColor: 'transparent',
    }),
    transform: [{ scale: 1 }],
  },
  nepaliButtonBorder: {
    borderRadius: 28,
    backgroundColor: 'transparent',
    // iOS gets decorative border
    ...(Platform.OS === 'ios' && {
      padding: 2,
      borderWidth: 1,
      borderColor: 'rgba(37, 99, 235, 0.4)',
    }),
    // Android gets minimal clean border
    ...(Platform.OS === 'android' && {
      padding: 0,
      borderWidth: 0,
      borderColor: 'transparent',
    }),
  },
  nepaliButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 18,
    position: 'relative',
    overflow: 'hidden',
    // iOS gets slightly rounded inner gradient
    ...(Platform.OS === 'ios' && {
      borderRadius: 26,
    }),
    // Android gets full rounded gradient
    ...(Platform.OS === 'android' && {
      borderRadius: 28,
    }),
  },
  nepaliButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: 'transparent',
  },
  nepaliButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.5,
  },
  cornerDecorations: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  cornerDot: {
    position: 'absolute',
    width: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 4 : 6,
    height: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 4 : 6,
    borderRadius: Platform.OS === 'android' && Dimensions.get('window').height < 600 ? 2 : 3,
    backgroundColor: 'rgba(59, 130, 246, 0.6)',
    // iOS gets corner dot shadows
    ...(Platform.OS === 'ios' && {
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 2,
    }),
    // Android gets clean corner dots - no shadows
    ...(Platform.OS === 'android' && {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    }),
  },
  topLeft: {
    top: 8,
    left: 8,
  },
  topRight: {
    top: 8,
    right: 8,
  },
  bottomLeft: {
    bottom: 8,
    left: 8,
  },
  bottomRight: {
    bottom: 8,
    right: 8,
  },
  buttonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  // Backward compatibility styles
  primaryButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 18,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
});
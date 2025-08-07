import { Tabs, router, usePathname } from "expo-router";
import { Calculator, Settings, BarChart3, ArrowLeft, Home } from "lucide-react-native";
import React, { useRef } from "react";
import { BackHandler, Platform, TouchableOpacity, View, Text, Dimensions } from "react-native";
import { useSafeAreaInsets, SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import * as Haptics from 'expo-haptics';
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

export default React.memo(function TabLayout() {
  const { t } = useLanguage();
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // IMMEDIATE: Force dark background for calculator/karobar routes to prevent flash
  const isCalculatorOrKarobar = pathname.includes('/calculator') || pathname.includes('/karobar');
  const forceDarkBackground = Platform.OS === 'android' && isCalculatorOrKarobar;
  
  // Memoize expensive calculations to prevent re-computation
  const isCurrentlyOnHomePage = React.useMemo(() => {
    // PRECISE check for home pages
    return pathname === '/(tabs)/(home)' ||
           pathname === '/(tabs)/(home)/index' ||
           pathname === '/(tabs)/(home)/dashboard';
  }, [pathname]);
  
  // Memoize tab bar colors to prevent re-computation
  const tabBarColors = React.useMemo(() => ({
    backgroundColor: isDark ? '#1E3A8A' : (Platform.OS === 'ios' ? '#3B82F6' : '#FFFFFF'), // Blue for iOS, white for Android in light mode
    borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.5)'
  }), [isDark]);
  
  // Hide tab bar on specific pages
  const shouldHideTabBar = React.useMemo(() => {
    // Check if pathname contains any of these route segments
    return pathname.includes('/add-receive-entry') ||
           pathname.includes('/add-give-entry') ||
           pathname.includes('/edit-receive-entry') ||
           pathname.includes('/edit-give-entry') ||
           pathname.includes('/add-customer') ||
           pathname.includes('/customer-form') ||
           pathname.includes('/customer-detail') ||
           pathname.includes('/calculator') ||  // This covers both /calculator and /calculator/results
           pathname.includes('/karobar');       // This covers both /karobar and /karobar/results
  }, [pathname]);

  // Detect phones without built-in navigation buttons
  const hasNavigationButtons = React.useMemo(() => {
    // More aggressive detection - if bottom insets are small (< 20px), treat as no navigation buttons
    // This covers gesture-based navigation and older devices
    return insets.bottom >= 20;
  }, [insets.bottom]);
  
  // Handle hardware back button for ALL users (authenticated and non-authenticated)
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('Back button pressed. Pathname:', pathname, 'isAuthenticated:', isAuthenticated);
      
      if (isAuthenticated) {
        // Authenticated user flow
        if (pathname === '/(tabs)/(home)/dashboard') {
          // From dashboard (main authenticated page), exit app
          console.log('On authenticated dashboard - allowing app to close');
          return false;
        }
        
        // For authenticated users, prevent going back to public flow
        // Always navigate to dashboard instead of allowing back navigation
        // This ensures users can never go back to calculator/public flow
        console.log('Authenticated user on other page - redirecting to dashboard');
        router.replace('/(tabs)/(home)/dashboard');
        return true; // Prevent default back behavior
      } else {
        // Non-authenticated user flow - check for main home page
        const isOnMainHome = pathname === '/(tabs)/(home)' || 
                            pathname === '/(tabs)/(home)/index' || 
                            pathname === '/(tabs)/(home)/' ||
                            pathname.endsWith('/(tabs)/(home)') ||
                            pathname.endsWith('/(home)') ||
                            (!pathname.includes('/calculator') && !pathname.includes('/karobar') && !pathname.includes('/settings') && pathname.includes('/(home)'));
        
        if (isOnMainHome) {
          // From main home page (non-authenticated), allow app to close
          console.log('On main home page - allowing app to close');
          return false;
        }
        
        // For non-authenticated users, prevent going back to authenticated pages
        // Always navigate to home instead of allowing back navigation to blank pages
        console.log('Non-authenticated user on other page - redirecting to home');
        router.replace('/(tabs)/(home)');
        return true; // Prevent default back behavior
      }
    });

    return () => backHandler.remove();
  }, [pathname, isAuthenticated]);

  // Custom tab bar for devices without navigation buttons (iPhones without home button)
  if (!hasNavigationButtons) {
    const screenWidth = Dimensions.get('window').width;
    
    const CustomTabBar = () => {
      if (shouldHideTabBar) return null;

  return (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          backgroundColor: tabBarColors.backgroundColor,
          flexDirection: 'row',
          zIndex: 999,
          // Add top margin with super light line
          marginTop: 0.1,
          borderTopWidth: 0.1,
          borderTopColor: isDark ? 'rgba(255,255,255,0.005)' : 'rgba(0,0,0,0.002)',
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
        }}>
          {/* Home Tab */}
          <TouchableOpacity
            style={{
              flex: 1,
              justifyContent: Platform.OS === 'ios' ? 'flex-end' : 'center',
              alignItems: 'center',
              paddingVertical: Platform.OS === 'ios' ? 12 : 8,
              position: 'relative',
              opacity: isCurrentlyOnHomePage ? 0.5 : 1, // Make it look inactive when on Home
            }}
            disabled={isCurrentlyOnHomePage} // Completely disable when on Home
            onPress={() => {
              // Navigate to home page from other pages
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              if (isAuthenticated) {
                router.replace('/(tabs)/(home)/dashboard');
              } else {
                router.replace('/(tabs)/(home)');
              }
            }}
          >
            {/* Line indicator for active tab */}
            {isCurrentlyOnHomePage && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                marginLeft: -15,
                width: 30,
                height: 3,
                backgroundColor: isDark ? '#FFFFFF' : '#3B82F6',
                borderRadius: 2,
              }} />
            )}
            {isAuthenticated ? (
              <Home color={isCurrentlyOnHomePage ? (isDark ? "#FFFFFF" : (Platform.OS === 'ios' ? "#FFFFFF" : "#3B82F6")) : (isDark ? "#94A3B8" : (Platform.OS === 'ios' ? "#FFFFFF" : "#6B7280"))} strokeWidth={2.5} size={24} />
            ) : (
              <Calculator color={isCurrentlyOnHomePage ? (isDark ? "#FFFFFF" : (Platform.OS === 'ios' ? "#FFFFFF" : "#3B82F6")) : (isDark ? "#94A3B8" : (Platform.OS === 'ios' ? "#FFFFFF" : "#6B7280"))} strokeWidth={2.5} size={24} />
            )}
            <Text style={{ 
              color: isCurrentlyOnHomePage ? (isDark ? "#FFFFFF" : (Platform.OS === 'ios' ? "#FFFFFF" : "#3B82F6")) : (isDark ? "#94A3B8" : (Platform.OS === 'ios' ? "#FFFFFF" : "#6B7280")), 
              fontSize: 12, 
              marginTop: 4, 
              fontWeight: 'bold' 
            }}>
              {t('home')}
            </Text>
          </TouchableOpacity>
          
          {/* Settings Tab */}
          <TouchableOpacity
            style={{
              flex: 1,
              justifyContent: Platform.OS === 'ios' ? 'flex-end' : 'center',
              alignItems: 'center',
              paddingVertical: Platform.OS === 'ios' ? 12 : 8,
              position: 'relative',
            }}
            onPress={() => {
              // If already on settings page, do absolutely nothing
              if (pathname.includes('/settings')) {
                return;
              }
              
              // Navigate to settings page from other pages
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              router.replace('/(tabs)/settings');
            }}
          >
            {/* Line indicator for active tab */}
            {pathname.includes('/settings') && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                marginLeft: -15,
                width: 30,
                height: 3,
                backgroundColor: isDark ? '#FFFFFF' : '#3B82F6',
                borderRadius: 2,
              }} />
            )}
            <Settings color={pathname.includes('/settings') ? (isDark ? "#FFFFFF" : (Platform.OS === 'ios' ? "#FFFFFF" : "#3B82F6")) : (isDark ? "#94A3B8" : (Platform.OS === 'ios' ? "#FFFFFF" : "#6B7280"))} strokeWidth={2.5} size={24} />
            <Text style={{ 
              color: pathname.includes('/settings') ? (isDark ? "#FFFFFF" : (Platform.OS === 'ios' ? "#FFFFFF" : "#3B82F6")) : (isDark ? "#94A3B8" : (Platform.OS === 'ios' ? "#FFFFFF" : "#6B7280")), 
              fontSize: 12, 
              marginTop: 4, 
              fontWeight: 'bold' 
            }}>
              {t('settings')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            tabBarStyle: { display: 'none' }, // Hide React Navigation's tab bar completely
            headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: t('home'),
          tabBarLabel: t('home'),
          tabBarIcon: ({ color }) => {
            // Gray out icon when disabled, white when active
            const iconColor = isCurrentlyOnHomePage ? "#666666" : "#FFFFFF";
            
            if (isAuthenticated) {
              return <Home color={iconColor} strokeWidth={2.5} />;
            }
            return <Calculator color={iconColor} strokeWidth={2.5} />;
          },
          headerShown: false,
          headerTitle: 'Home',
          headerTitleStyle: {
            fontWeight: 'bold',
          }
        }}
        listeners={{
          tabPress: (e) => {
            // ALWAYS prevent default
            e.preventDefault();
            
            // If already on home page, do absolutely nothing
            if (isCurrentlyOnHomePage) {
              return;
            }
            
            // Navigate to home page from other pages
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            if (isAuthenticated) {
              router.replace('/(tabs)/(home)/dashboard');
            } else {
              router.replace('/(tabs)/(home)');
            }
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color }) => <Settings color={color} strokeWidth={2.5} />,
          headerShown: false,
          headerTitleStyle: {
            fontWeight: 'bold',
          }
        }}
        listeners={{
          tabPress: (e) => {
            // Add haptic feedback
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        }}
      />
        </Tabs>
        <CustomTabBar />
      </View>
    );
  }

  // Normal return for devices WITH navigation buttons
  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF', // White icons and text on blue background
        tabBarInactiveTintColor: '#FFFFFF', // White icons and text on blue background
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarPressColor: Platform.OS === 'android' ? 'transparent' : undefined, // Remove touch feedback on Android
        tabBarPressOpacity: Platform.OS === 'android' ? 0 : undefined, // Remove touch feedback on Android
        tabBarStyle: shouldHideTabBar ? { display: 'none' } : {
          backgroundColor: '#3B82F6', // Blue background for normal tab bar
          paddingBottom: Platform.OS === 'android' ? -5 : Math.max(insets.bottom - 48, 0),
          paddingTop: Platform.OS === 'ios' ? 8 : 0, // Reduced top padding for iOS
          height: Platform.OS === 'android' ? 55 : 60 + Math.max(insets.bottom - 48, 0),
          // Add top margin with super light line
          marginTop: 0.1,
          borderTopWidth: 0.1,
          borderTopColor: isDark ? 'rgba(255,255,255,0.005)' : 'rgba(0,0,0,0.002)',
          elevation: 0, // Remove Android shadow
          shadowOpacity: 0, // Remove iOS shadow
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
        },
        tabBarLabelStyle: {
          fontWeight: 'bold',
          color: '#FFFFFF', // White text on blue background
        },
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        // CRITICAL: Android background to prevent white flash at all levels
        tabBarBackground: () => null, // Remove default background
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: t('home'),
          tabBarLabel: t('home'),
          tabBarIcon: ({ color }) => {
            // Use React Navigation's provided color (which respects our tint colors)
            if (isAuthenticated) {
              return <Home color={color} strokeWidth={2.5} />;
            }
            return <Calculator color={color} strokeWidth={2.5} />;
          },
          headerShown: false,
          headerTitle: 'Home',
          headerTitleStyle: {
            fontWeight: 'bold',
          }
        }}
        listeners={{
          tabPress: (e) => {
            // ALWAYS prevent default
            e.preventDefault();
            
            // If already on home page, do absolutely nothing
            if (isCurrentlyOnHomePage) {
              return;
            }
            
            // Navigate to home page from other pages
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            if (isAuthenticated) {
              router.replace('/(tabs)/(home)/dashboard');
            } else {
              router.replace('/(tabs)/(home)');
            }
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color }) => <Settings color={color} strokeWidth={2.5} />,
          headerShown: false,
          headerTitleStyle: {
            fontWeight: 'bold',
          }
        }}
        listeners={{
          tabPress: (e) => {
            // Add haptic feedback
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          },
        }}
      />
    </Tabs>
    </View>
  );
});
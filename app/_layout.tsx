import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useLayoutEffect } from "react";
import { BackHandler, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { CustomersProvider, useCustomers } from "@/contexts/CustomersContext";
import { TransactionEntriesProvider, useTransactionEntries } from "@/contexts/TransactionEntriesContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { testFirebaseConnectionDetailed } from "@/lib/firebase";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import NameInputModal from "@/components/NameInputModal";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on network errors for iOS to prevent crashes
        if (Platform.OS === 'ios' && failureCount > 2) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function RootLayoutNav() {
  const { isAuthenticated, showNameInput, handleNameSet, setShowNameInput } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  // IMMEDIATE: Force consistent dark background for all calculator/karobar routes
  const isCalculatorOrKarobar = pathname.includes('/calculator') || pathname.includes('/karobar');
  const forceDarkBackground = Platform.OS === 'android' && isCalculatorOrKarobar;

  // Calculator and karobar pages now have dark backgrounds to prevent white flash

  // Check if tab bar should be hidden - more aggressive detection for immediate response
  const shouldHideTabBar = React.useMemo(() => {
    // Immediate detection for calculator and karobar to prevent flash
    if (pathname.includes('/calculator') || pathname.includes('/karobar')) {
      return true;
    }
    
    return pathname.includes('/add-receive-entry') ||
           pathname.includes('/add-give-entry') ||
           pathname.includes('/edit-receive-entry') ||
           pathname.includes('/edit-give-entry') ||
           pathname.includes('/add-customer') ||
           pathname.includes('/customer-form') ||
           pathname.includes('/customer-detail');
  }, [pathname]);

  // Define safe area colors - ultra-conservative to prevent white flash
  const safeAreaColors = React.useMemo(() => {
    if (Platform.OS !== 'android') {
      return {
        backgroundColor: 'transparent',
        borderTopColor: 'transparent'
      };
    }

    // IMMEDIATE: Use the pre-calculated force flag for instant response
    if (forceDarkBackground) {
      return {
        backgroundColor: '#0F172A',
        borderTopColor: 'transparent'
      };
    }

    // Only use light background on exact dashboard or settings page in light mode
    const isExactDashboard = pathname === '/(tabs)/(home)/dashboard';
    const isExactSettings = pathname === '/(tabs)/settings';
    const isTabBarVisible = !shouldHideTabBar;
    
    const shouldUseLightBackground = !isDark && isTabBarVisible && (isExactDashboard || isExactSettings);

    return {
      backgroundColor: shouldUseLightBackground ? '#F8F9FA' : '#0F172A',
      borderTopColor: shouldUseLightBackground ? 'rgba(0,0,0,0.08)' : 'transparent'
    };
  }, [isDark, shouldHideTabBar, pathname, forceDarkBackground]);

  // Navigation flow control - optimized for smooth transitions
  useEffect(() => {
    if (isAuthenticated) {
      // After login flow - redirect to dashboard and prevent access to auth screens
      if (pathname.startsWith('/auth/')) {
        router.replace('/(tabs)/(home)/dashboard');
      }
    } else {
      // Before login flow - redirect to home and prevent access to private screens
      if (pathname.startsWith('/(tabs)/(home)/dashboard') || 
          pathname.startsWith('/(tabs)/(home)/customer') || 
          pathname.startsWith('/(tabs)/(home)/add-')) {
        // Immediate navigation for smooth sign out transition
        router.replace('/(tabs)/(home)');
      }
    }
  }, [isAuthenticated, pathname, router]);

  // Handle hardware back button behavior
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pathname === '/auth/sign-in' || pathname === '/(tabs)/(home)') {
        // Exit app from login screen or home screen
        return false; // Let system handle (exit app)
      }
      

      
      if (isAuthenticated) {
        // After login flow - prevent going back to auth screens
        if (pathname.startsWith('/(tabs)/(home)/dashboard')) {
          // From dashboard, exit app
          return false;
        }
        // For other authenticated screens, allow normal back navigation
        return false;
      } else {
        // Before login flow - normal back behavior
        return false;
      }
    });

    return () => backHandler.remove();
  }, [pathname, isAuthenticated, router]);

  return (
    <>
      <Stack 
        initialRouteName="(tabs)"
        screenOptions={{ 
          headerBackTitle: "Back",
          gestureEnabled: true,
          animation: Platform.OS === 'android' ? 'none' : (forceDarkBackground ? 'none' : 'slide_from_right'), // No animation for calculator
          animationDuration: Platform.OS === 'android' ? 200 : (forceDarkBackground ? 0 : 300),
          animationTypeForReplace: 'push', // Keep consistent
          gestureDirection: 'horizontal',
        // CRITICAL: Use theme background to match destination pages and prevent flash
        contentStyle: { 
          backgroundColor: theme.colors.background,
          paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom,
          // Make 3 buttons area solid gray in light mode (no faded design)
          ...(Platform.OS === 'android' && !isDark && {
            backgroundColor: '#E8E8E8', // Solid gray background
          }),
          // Make iOS bottom safe area white in light mode, except for Home and Settings pages
          ...(Platform.OS === 'ios' && !isDark && {
            backgroundColor: !shouldHideTabBar ? '#3B82F6' : '#FFFFFF', // Blue when tab bar is visible (Home/Settings), white when hidden (Calculator/etc)
          }),
          // Remove any shadows or borders for clean design
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
        },
        cardStyle: { backgroundColor: theme.colors.background },
        sceneContainerStyle: { backgroundColor: theme.colors.background },
        // CRITICAL: Disable complex animations - use simple fade for Android
        ...(Platform.OS === 'android' && {
          cardStyleInterpolator: ({ current, next, layouts }) => {
            return {
              cardStyle: {
                backgroundColor: theme.colors.background,
                opacity: 1, // Always opaque
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 0], // No slide animation
                    }),
                  },
                ],
              },
              overlayStyle: {
                backgroundColor: theme.colors.background,
                opacity: 1,
              },
            };
          },
        }),
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="auth/sign-in" 
          options={{ 
            headerShown: false, 
            headerBackVisible: false,
            gestureEnabled: true, // Enable gesture for both platforms (same as Home → Calculator approach)
            gestureDirection: 'horizontal',
            animation: Platform.OS === 'android' ? 'none' : 'slide_from_right', // No animation on Android
            animationDuration: Platform.OS === 'android' ? 0 : 300,
            animationTypeForReplace: 'push',
            // CRITICAL: White background for light theme sign-in page
            contentStyle: { backgroundColor: '#FFFFFF' },
            cardStyle: { backgroundColor: '#FFFFFF' },
          }} 
        />


        <Stack.Screen name="privacy-policy" options={{ presentation: 'modal' }} />
        <Stack.Screen name="terms-of-service" options={{ presentation: 'modal' }} />
        <Stack.Screen name="about" options={{ presentation: 'modal' }} />
      </Stack>
      
      {/* Name Input Modal */}
      <NameInputModal
        visible={showNameInput}
        onClose={() => setShowNameInput(false)}
        onNameSet={handleNameSet}
      />
    </>
  );
}

// Component to sync auth user with other contexts
function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser } = useAuth();

  React.useEffect(() => {
    console.log('UserSyncProvider: firebaseUser changed:', firebaseUser?.uid);
    
    // We'll handle the context syncing in a different way
    // to avoid the hook dependency issue
  }, [firebaseUser]);

  return <>{children}</>;
}

// Component to sync contexts after providers are available
function ContextSyncProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser } = useAuth();
  const customersContext = useCustomers();
  const transactionEntriesContext = useTransactionEntries();

  React.useEffect(() => {
    console.log('ContextSyncProvider: firebaseUser changed:', firebaseUser?.uid);
    
    // Sync the firebase user to all contexts
    try {
      if (customersContext && typeof customersContext.setFirebaseUser === 'function') {
        console.log('ContextSyncProvider: Syncing to customersContext');
        customersContext.setFirebaseUser(firebaseUser);
      } else {
        console.log('ContextSyncProvider: customersContext.setFirebaseUser not available');
      }
      
      if (transactionEntriesContext && typeof transactionEntriesContext.setFirebaseUser === 'function') {
        console.log('ContextSyncProvider: Syncing to transactionEntriesContext');
        transactionEntriesContext.setFirebaseUser(firebaseUser);
      } else {
        console.log('ContextSyncProvider: transactionEntriesContext.setFirebaseUser not available');
      }
    } catch (error) {
      console.error('Error syncing firebase user to contexts:', error);
    }
  }, [firebaseUser, customersContext, transactionEntriesContext]);

  return <>{children}</>;
}

export default function RootLayout() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // iOS-specific initialization delay to prevent crashes
        if (Platform.OS === 'ios') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Test Firebase connection in background without blocking
        testFirebaseConnectionDetailed().then((connectionResult: any) => {
          if (!connectionResult.success) {
            console.warn('Firebase connection test failed:', connectionResult.error);
            console.warn('App may have limited functionality');
          } else {
            console.log('Firebase connection test successful');
          }
        }).catch((error) => {
          console.warn('Firebase connection test failed:', error);
          console.warn('App will continue with limited functionality');
        });
        
        // Hide native splash immediately and load app directly
        SplashScreen.hideAsync();
        
      } catch (error) {
        console.error('Error during app initialization:', error);
        SplashScreen.hideAsync();
      }
    };

    initializeApp();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar 
          style="auto" 
          translucent={false}
          hidden={false}
        />
                        <ThemeProvider>
                  <LanguageProvider>
                    <NetworkProvider>
                      <AuthProvider>
                        <UserProfileProvider>
                          <CustomersProvider>
                            <TransactionEntriesProvider>
                              <ContextSyncProvider>
                                <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0F172A' }}>
                                  <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
                                    <RootLayoutNav />
                                  </View>
                                </GestureHandlerRootView>
                              </ContextSyncProvider>
                            </TransactionEntriesProvider>
                          </CustomersProvider>
                        </UserProfileProvider>
                      </AuthProvider>
                    </NetworkProvider>
                  </LanguageProvider>
                </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
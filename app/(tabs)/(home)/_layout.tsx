import { Stack } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function HomeLayout() {
  const { isAuthenticated } = useAuth();
  
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      headerTitle: 'Home',
      title: 'Home', // Force all screens to have 'Home' as title
      gestureEnabled: Platform.OS === 'ios', // Disable gestures on Android to prevent conflicts
      gestureDirection: 'horizontal',
      animation: Platform.OS === 'android' ? 'none' : 'slide_from_right', // No animation on Android
      animationDuration: Platform.OS === 'android' ? 250 : 300, // Slower to reduce flashing
      animationTypeForReplace: 'push', // Keep consistent - no more pop
      // CRITICAL: Android background colors to prevent white flash on back navigation
      contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
      cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
      // CRITICAL: Complete Android cardStyleInterpolator for proper back navigation
      ...(Platform.OS === 'android' && {
        cardStyleInterpolator: ({ current, next, layouts }) => {
          return {
            cardStyle: {
              backgroundColor: '#0F172A',
              opacity: 1, // Always opaque - no fade effects
            },
          };
        },
      }),
    }}>
      <Stack.Screen name="index" options={{ 
        headerShown: false, 
        headerTitle: 'Home', 
        title: 'Home',
        gestureEnabled: false, // Always disable gestures on main home page - it's the root
        contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
        cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' }
      }} />
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          headerShown: false, 
          headerTitle: 'Home', 
          title: 'Home',
          gestureEnabled: false, // Disable swipe gestures on dashboard - it's the root screen
          contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
          cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' }
        }} 
      />

    </Stack>
  );
}
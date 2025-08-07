import { Stack } from "expo-router";
import React from "react";
import { Platform } from "react-native";

export default function CalculatorLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      gestureEnabled: Platform.OS === 'ios', // Disable gestures on Android
      gestureDirection: 'horizontal',
      animation: 'none', // Force no animation for all platforms to prevent flash
      animationDuration: 0, // Instant transitions
      animationTypeForReplace: 'push', // Consistent across platforms
      // CRITICAL: Force dark background for all platforms to eliminate white flash
      contentStyle: { backgroundColor: '#0F172A' },
      cardStyle: { backgroundColor: '#0F172A' },
      // CRITICAL: Custom Android interpolator to show calculator content during back animation
      ...(Platform.OS === 'android' && {
        cardStyleInterpolator: ({ current }) => {
          return {
            cardStyle: {
              backgroundColor: '#0F172A',
              opacity: 1, // Always opaque - no fade effects
            },
          };
        },
      }),
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
          // CRITICAL: Android background to prevent white flash 
          contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
          cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
          // No animation on Android for consistency
          animation: Platform.OS === 'android' ? 'none' : 'slide_from_right',
          animationDuration: Platform.OS === 'android' ? 200 : 300,
          // CRITICAL: Simple background animation to prevent white flash
          ...(Platform.OS === 'android' && {
            cardStyleInterpolator: ({ current }) => {
              return {
                cardStyle: {
                  backgroundColor: '#0F172A',
                  opacity: 1, // Always opaque
                },
              };
            },
          }),
        }} 
      />
      <Stack.Screen name="results" options={{ 
        headerShown: false,
        gestureEnabled: Platform.OS === 'ios', // Disable gestures on Android
        gestureDirection: 'horizontal',
        // CRITICAL: Android background to prevent white flash 
        contentStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
        cardStyle: { backgroundColor: Platform.OS === 'android' ? '#0F172A' : 'transparent' },
        // No animation on Android for consistency
        animation: Platform.OS === 'android' ? 'none' : 'slide_from_right',
        animationDuration: Platform.OS === 'android' ? 200 : 300, // Faster Android transitions
        animationTypeForReplace: 'push', // Consistent across platforms
        // CRITICAL: Simple background animation to prevent white flash
        ...(Platform.OS === 'android' && {
          cardStyleInterpolator: ({ current }) => {
            return {
              cardStyle: {
                backgroundColor: '#0F172A',
                opacity: 1, // Always opaque
              },
            };
          },
        }),
      }} />
    </Stack>
  );
}
import React, { useState, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    overlay: string;
    inputBackground: string;
    tabIconDefault: string;
    tabIconSelected: string;
    gradient: {
      primary: readonly [string, string];
      secondary: readonly [string, string];
      card: readonly [string, string];
    };
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#d4656e',
    secondary: '#6c163e',
    accent: '#574D79',
    background: '#FFFFFF',
    surface: 'rgba(255, 255, 255, 0.95)',
    card: 'rgba(255, 255, 255, 0.9)',
    text: '#1a1a1a',
    textSecondary: '#4a4a4a',
    border: 'rgba(59, 130, 246, 0.3)',
    error: '#E53E3E',
    success: '#38A169',
    warning: '#D69E2E',
    overlay: 'rgba(2, 7, 28, 0.5)',
    inputBackground: 'rgba(255, 255, 255, 0.95)',
    tabIconDefault: '#8A8A8A',
    tabIconSelected: '#d4656e',
    gradient: {
      primary: ['#d4656e', '#6c163e'] as const,
      secondary: ['#574D79', '#02071c'] as const,
      card: ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)'] as const,
    },
  },
};

const darkTheme: Theme = {
  colors: {
    primary: '#d4656e',
    secondary: '#6c163e',
    accent: '#574D79',
    background: '#0F172A',
    surface: '#1E293B',
    card: '#334155',
    text: '#FFFFFF',
    textSecondary: '#E2E8F0',
    border: 'rgba(59, 130, 246, 0.4)',
    error: '#FC8181',
    success: '#68D391',
    warning: '#F6E05E',
    overlay: 'rgba(2, 7, 28, 0.8)',
    inputBackground: '#334155',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#d4656e',
    gradient: {
      primary: ['#d4656e', '#6c163e'] as const,
      secondary: ['#574D79', '#02071c'] as const,
      card: ['#1E293B', '#334155'] as const,
    },
  },
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  isLoading: boolean;
}

export const [ThemeProvider, useTheme] = createContextHook((): ThemeContextType => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light'); // Default to light mode
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const savedThemeMode = await AsyncStorage.getItem('app_theme_mode');
      
      if (savedThemeMode && ['light', 'dark', 'system'].includes(savedThemeMode)) {
        setThemeModeState(savedThemeMode as ThemeMode);
      } else {
        // Set default to light mode if no saved theme
        setThemeModeState('light');
        await AsyncStorage.setItem('app_theme_mode', 'light');
      }
    } catch (error) {
      console.error('Error loading theme mode:', error);
      // Fallback to light mode on error
      setThemeModeState('light');
    } finally {
      setIsLoading(false);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('app_theme_mode', mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme mode:', error);
    }
  };

  // Memoize expensive calculations to prevent re-computation on every render
  const isDark = React.useMemo(() => {
    return themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');
  }, [themeMode, systemColorScheme]);

  const theme = React.useMemo(() => {
    return isDark ? darkTheme : lightTheme;
  }, [isDark]);

  // Memoize the return value to prevent unnecessary re-renders
  const value = React.useMemo(() => ({
    theme,
    themeMode,
    setThemeMode,
    isDark,
    isLoading
  }), [theme, themeMode, setThemeMode, isDark, isLoading]);

  return value;
});
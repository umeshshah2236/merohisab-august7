import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect } from 'react';

interface UserProfileContextType {
  fullName: string | null;
  firstName: string | null;
  isFirstLaunch: boolean;
  isLoading: boolean;
  setUserName: (name: string) => Promise<void>;
  skipNameEntry: () => Promise<void>;
}

export const [UserProfileProvider, useUserProfile] = createContextHook((): UserProfileContextType => {
  const [fullName, setFullName] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const savedName = await AsyncStorage.getItem('user_full_name');
      const hasSeenNamePrompt = await AsyncStorage.getItem('has_seen_name_prompt');
      
      if (savedName) {
        setFullName(savedName);
        setFirstName(extractFirstName(savedName));
      }
      
      // Always set isFirstLaunch to false to disable the name input modal
      setIsFirstLaunch(false);
    } catch (error) {
      console.log('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const extractFirstName = (name: string): string => {
    const trimmedName = name.trim();
    if (!trimmedName) return '';
    
    const words = trimmedName.split(/\s+/);
    return words[0];
  };

  const setUserName = async (name: string) => {
    try {
      const trimmedName = name.trim();
      await AsyncStorage.setItem('user_full_name', trimmedName);
      await AsyncStorage.setItem('has_seen_name_prompt', 'true');
      
      setFullName(trimmedName);
      setFirstName(extractFirstName(trimmedName));
      setIsFirstLaunch(false);
    } catch (error) {
      console.log('Error saving user name:', error);
    }
  };

  const skipNameEntry = async () => {
    try {
      await AsyncStorage.setItem('has_seen_name_prompt', 'true');
      setIsFirstLaunch(false);
    } catch (error) {
      console.log('Error skipping name entry:', error);
    }
  };

  return {
    fullName,
    firstName,
    isFirstLaunch,
    isLoading,
    setUserName,
    skipNameEntry
  };
});
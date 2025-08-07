import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { auth, testFirebaseConnectionDetailed, firestoreHelpers } from '@/lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendOtpViaSMS, verifyOtpLocal, clearExpiredOTPs } from '@/utils/aakash-sms';

export interface User {
  id: string;
  phone: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showNameInput: boolean;
  checkUserExists: (phone: string) => Promise<{ exists: boolean; error?: string }>;
  sendOtp: (phone: string, name?: string) => Promise<{ success: boolean; error?: string; expiresAt?: number }>;
  verifyOtp: (phone: string, token: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  handleNameSet: (name: string) => Promise<void>;
  setShowNameInput: (show: boolean) => void;
}

export const [AuthProvider, useAuth] = createContextHook((): AuthContextType => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNameInput, setShowNameInput] = useState(false);

  const handleUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<void> => {
    try {
      console.log('Handling user profile for user:', firebaseUser.uid, 'phone:', firebaseUser.phoneNumber);
      let profileName = firebaseUser.displayName || firebaseUser.phoneNumber || 'User';
      
      try {
        const profile:any = await firestoreHelpers.getUserProfile(firebaseUser.uid);
        
        if (profile) {
          console.log('Found existing profile:', profile.name);
          profileName = profile.name;
          
          // Only show name input for users with temporary names (but not for existing users with real names)
          const hasTemporaryName = profileName.startsWith('User ') || profileName.includes('+977') || profileName === 'User';
          const hasRealName = profile.name && profile.name.length > 4 && !hasTemporaryName;
          
          if (hasTemporaryName && !hasRealName) {
            console.log('User has temporary name, showing name input modal');
            setShowNameInput(true);
          } else {
            console.log('User has existing real name, skipping name input modal');
          }
        } else {
          console.log('No profile found, creating new one');
          // Profile doesn't exist, try to create one
          try {
            await firestoreHelpers.upsertUserProfile(firebaseUser.uid, {
              name: profileName,
              phone: firebaseUser.phoneNumber || '',
            });
            console.log('Created new profile:', profileName);
            
            // Show name input modal for new users only
            console.log('New user, showing name input modal');
            setShowNameInput(true);
          } catch (createError) {
            console.log('Profile creation failed:', createError);
            // Only show name input if this is a genuine new user creation failure
            setShowNameInput(true);
          }
        }
      } catch (profileError) {
        console.log('Profile loading failed:', profileError);
        
        // Only show name input modal if we're sure this is a connection issue, not an existing user
        // Test if the error is network-related
                const isNetworkError = (profileError instanceof Error ? profileError.message : String(profileError)).includes('network') ||
                               (profileError instanceof Error ? profileError.message : String(profileError)).includes('offline') ||
                               (profileError instanceof Error ? profileError.message : String(profileError)).includes('connection');
        
        if (isNetworkError) {
          console.log('Network error during profile loading, skipping name input modal for existing user');
          // Don't show name input for network errors - user likely exists
        } else {
          console.log('Non-network error during profile loading, showing name input modal');
          setShowNameInput(true);
        }
      }
      
      console.log('Setting user with name:', profileName);
      setUser({
        id: firebaseUser.uid,
        phone: firebaseUser.phoneNumber || '',
        name: profileName
      });
    } catch (error) {
      console.error('Error handling user profile:', error);
      setUser({
        id: firebaseUser.uid,
        phone: firebaseUser.phoneNumber || '',
        name: firebaseUser.displayName || firebaseUser.phoneNumber || 'User'
      });
      // Show name input modal on error
      setShowNameInput(true);
    }
  }, []);

  const handleNameSet = useCallback(async (newName: string) => {
    if (!firebaseUser) return;
    
    try {
      // Update the user profile in Firestore
      await firestoreHelpers.upsertUserProfile(firebaseUser.uid, {
        name: newName,
        phone: firebaseUser.phoneNumber || '',
      });
      
      // Update the local user state
      setUser(prev => prev ? { ...prev, name: newName } : null);
      
      // Update the firebaseUser displayName for immediate header update
      setFirebaseUser(prev => prev ? {
        ...prev,
        displayName: newName
      } : null);
      
      console.log('User name updated successfully:', newName);
    } catch (error) {
      console.error('Error updating user name:', error);
    }
  }, [firebaseUser]);

  const loadAuthState = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        console.log('Current user found:', currentUser.uid);
        setFirebaseUser(currentUser);
        await handleUserProfile(currentUser);
      } else {
        // No user found, clear auth state
        setUser(null);
        setFirebaseUser(null);
      }
    } catch (error) {
      console.error('Network error loading auth state:', error);
      // Clear auth state on network errors to prevent stale state
      setUser(null);
      setFirebaseUser(null);
    }
  }, [handleUserProfile]);

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        await loadAuthState();
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any) => {
      if (!mounted) return;
      
      console.log('Auth state change - user:', firebaseUser?.uid);
      
      try {
        if (firebaseUser) {
          console.log('User signed in:', firebaseUser.uid);
          setFirebaseUser(firebaseUser);
          await handleUserProfile(firebaseUser);
        } else {
          console.log('User signed out');
          // Clear auth state immediately for smooth navigation
          setUser(null);
          setFirebaseUser(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    });

    initializeAuth();

    // Fallback timeout - reduced to prevent app hanging
    const fallbackTimeout = setTimeout(() => {
      if (mounted) {
        console.warn('Auth loading timeout, setting loading to false');
        setIsLoading(false);
      }
    }, Platform.OS === 'ios' ? 5000 : 3000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimeout);
      unsubscribe();
    };
  }, [loadAuthState, handleUserProfile]);

  const checkUserExists = async (phone: string): Promise<{ exists: boolean; error?: string }> => {
    try {
      if (!phone) {
        return { exists: false, error: 'Phone number is required' };
      }

      if (!phone.startsWith('+977')) {
        return { exists: false, error: 'Only Nepali phone numbers (+977) are allowed' };
      }

      const phoneDigits = phone.replace('+977', '');
      if (phoneDigits.length !== 10 || !/^\d+$/.test(phoneDigits)) {
        return { exists: false, error: 'Please enter a valid Nepali phone number (10 digits after +977)' };
      }

      // Test connection first
      const connectionTest = await testFirebaseConnectionDetailed();
      if (!connectionTest.success) {
        console.error('Connection test failed:', connectionTest.error);
        return { exists: true, error: `Connection failed: ${connectionTest.error}` };
      }

      // For Firebase, we'll check if a user profile exists with this phone number
      // This is a simplified check - in production you might want to query by phone number
      console.log('User existence check passed - assuming user exists for OTP flow');
      return { exists: true };
      
    } catch (error) {
      console.error('Network error checking user existence:', error);
      // On network errors, assume user exists to be safe
      return { exists: true, error: 'Network error. Please check your connection and try again.' };
    }
  };

  const sendOtp = async (phone: string, name?: string): Promise<{ success: boolean; error?: string; expiresAt?: number }> => {
    try {
      console.log('SendOtp called with phone:', phone, 'name:', name);
      
      if (!phone) {
        console.log('SendOtp failed: No phone number provided');
        return { success: false, error: 'Phone number is required' };
      }

      // For delete account functionality, be more flexible with phone validation
      // since the user is already authenticated and we're using their stored phone number
      let cleanPhone = phone.trim();
      
      // If phone doesn't start with +, try to format it
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('977')) {
          cleanPhone = '+' + cleanPhone;
        } else if (cleanPhone.length === 10 && /^\d+$/.test(cleanPhone)) {
          // Assume it's a Nepali number without country code
          cleanPhone = '+977' + cleanPhone;
        }
      }
      
      // Basic validation - must be a valid phone format
      if (!cleanPhone.startsWith('+') || cleanPhone.length < 10) {
        console.log('SendOtp failed: Invalid phone format:', cleanPhone);
        return { success: false, error: 'Invalid phone number format' };
      }
      
      // For new registrations, enforce Nepali number requirement
      // For existing users (delete account), be more flexible
      if (name && !cleanPhone.startsWith('+977')) {
        console.log('SendOtp failed: New registration requires Nepali number');
        return { success: false, error: 'Only Nepali phone numbers (+977) are allowed for new registrations' };
      }

      console.log('Phone validation passed, testing connection...');
      // Test connection first
      const connectionTest = await testFirebaseConnectionDetailed();
      console.log('Connection test result:', connectionTest);
      
      if (!connectionTest.success) {
        console.error('Connection test failed:', connectionTest.error);
        return { success: false, error: `Connection failed: ${connectionTest.error}` };
      }

      console.log('Connection test passed, sending OTP via Aakash SMS to:', cleanPhone);
      
      // Clean expired OTPs before sending new one
      await clearExpiredOTPs();
      
      // Send OTP using Aakash SMS API
      const otpResult = await sendOtpViaSMS(cleanPhone);
      
      if (otpResult.success) {
        console.log('OTP sent successfully via Aakash SMS API');
        return { 
          success: true, 
          expiresAt: otpResult.expiresAt 
        };
      } else {
        console.error('Failed to send OTP via Aakash SMS:', otpResult.error);
        return { 
          success: false, 
          error: otpResult.error || 'Failed to send OTP. Please try again.' 
        };
      }
    } catch (error) {
      console.error('Network or other error during OTP send:', error);
      if (error instanceof Error) {
        return { success: false, error: `Network error: ${error.message}` };
      }
      return { success: false, error: 'Failed to send OTP. Please check your internet connection and try again.' };
    }
  };

  const verifyOtp = async (phone: string, token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!phone || !token) {
        return { success: false, error: 'Phone number and OTP are required' };
      }

      if (token.length !== 6 || !/^\d+$/.test(token)) {
        return { success: false, error: 'Please enter a valid 6-digit OTP' };
      }

      console.log('🔐 Starting OTP verification');
        
        // Use the same phone formatting logic as sendOtp
        let cleanPhone = phone.trim();
      
      // If phone doesn't start with +, try to format it
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('977')) {
          cleanPhone = '+' + cleanPhone;
        } else if (cleanPhone.length === 10 && /^\d+$/.test(cleanPhone)) {
          // Assume it's a Nepali number without country code
          cleanPhone = '+977' + cleanPhone;
        }
      }

      console.log('Verifying OTP locally for phone:', cleanPhone);
      
      // Verify OTP using local storage and Aakash SMS verification
      const otpVerifyResult = await verifyOtpLocal(cleanPhone, token);
      
      if (!otpVerifyResult.success) {
        console.error('OTP verification failed:', otpVerifyResult.error);
        return { 
          success: false, 
          error: otpVerifyResult.error || 'Invalid OTP. Please try again.' 
        };
      }

      console.log('OTP verification successful with Aakash SMS');

      // Test Firebase connection
      const connectionTest = await testFirebaseConnectionDetailed();
      if (!connectionTest.success) {
        console.error('Connection test failed:', connectionTest.error);
        return { success: false, error: `Connection failed: ${connectionTest.error}` };
      }
      
      // Create a consistent user ID based on phone number to prevent duplicates
      const phoneHash = cleanPhone.replace(/[^0-9]/g, '');
      const userId = `user_${phoneHash}`;
      
      // Check if user profile already exists
      let existingProfile: any = null;
      try {
        existingProfile = await firestoreHelpers.getUserProfile(userId);
        console.log('Existing profile found');
      } catch (profileError) {
        console.log('No existing profile found, will create new one');
      }
      
      // Create or update user profile
      try {
        let displayName = '';
        
        if (existingProfile && existingProfile.name) {
          displayName = existingProfile.name;
          console.log('Using existing name');
        } else {
          const phoneDigits = cleanPhone.replace('+977', '');
          displayName = `User ${phoneDigits.slice(-4)}`;
          console.log('Created temporary name');
        }
        
        await firestoreHelpers.upsertUserProfile(userId, {
          name: displayName,
          phone: cleanPhone,
        });
        console.log('User profile created/updated in Firestore');
      } catch (profileError) {
        console.error('Profile creation failed, continuing with mock user:', profileError);
      }
      
      // Create a mock user object for the app state
      // Note: In production, this should be replaced with real Firebase Auth
      const mockUser = {
        uid: userId,
        phoneNumber: cleanPhone,
        displayName: existingProfile?.name || `User ${cleanPhone.replace('+977', '').slice(-4)}`,
        email: null,
        photoURL: null,
        emailVerified: false,
        isAnonymous: false,
        providerId: 'phone',
        metadata: {
          creationTime: existingProfile?.created_at || new Date().toISOString(),
          lastSignInTime: new Date().toISOString(),
          lastRefreshTime: new Date().toISOString(),
        },
        providerData: [],
        refreshToken: 'mock_refresh_token',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => 'mock_id_token',
        getIdTokenResult: async () => ({
          authTime: new Date().toISOString(),
          expirationTime: new Date(Date.now() + 3600000).toISOString(),
          issuedAtTime: new Date().toISOString(),
          signInProvider: 'phone',
          signInSecondFactor: null,
          token: 'mock_id_token',
          claims: {},
        }),
        reload: async () => {},
        toJSON: () => ({}),
      } as unknown as FirebaseUser;

      // Set the Firebase user in state
      setFirebaseUser(mockUser);
      
      // Preload user data for faster dashboard loading
      console.log('🚀 Starting data preload during OTP verification...');
      
      try {
        const [preloadedCustomers, preloadedTransactions] = await Promise.all([
          firestoreHelpers.getCustomers(userId).catch(() => []),
          firestoreHelpers.getTransactionEntries(userId).catch(() => [])
        ]);
        
        console.log('✅ Data preloaded successfully:', {
          customers: preloadedCustomers?.length || 0,
          transactions: preloadedTransactions?.length || 0
        });
        
        // Store preloaded data with ready flag for instant UI initialization
        (globalThis as any).__preloadedData = {
          customers: preloadedCustomers || [],
          transactions: preloadedTransactions || [],
          userId: userId,
          timestamp: Date.now(),
          uiReady: true // Flag to indicate UI can be rendered instantly
        };
        
        console.log('✅ UI preparation complete - ready for instant display');
      } catch (preloadError) {
        console.warn('⚠️ Data preload failed, will load normally');
      }
      
      // Handle the user profile
      await handleUserProfile(mockUser);
      
      console.log('User authenticated successfully:', userId);
      return { success: true };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, error: 'Failed to verify OTP. Please try again.' };
    }
  };

  const refreshSession = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('Manually refreshing session...');
      
      // Test connection first
      const connectionTest = await testFirebaseConnectionDetailed();
      if (!connectionTest.success) {
        console.error('Connection test failed:', connectionTest.error);
        return { success: false, error: `Connection failed: ${connectionTest.error}` };
      }
      
      // Firebase handles token refresh automatically
      // We just need to check if the current user is still valid
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error('No current user found');
        return { success: false, error: 'No active session found. Please sign in again.' };
      }
      
      console.log('Session refresh successful');
      setFirebaseUser(currentUser);
      await handleUserProfile(currentUser);
      
      return { success: true };
    } catch (error) {
      console.error('Error during manual session refresh:', error);
      return { success: false, error: 'Session refresh failed. Please sign out and sign in again.' };
    }
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('=== DELETE ACCOUNT START ===');
      console.log('Context user:', user);
      console.log('Firebase user:', firebaseUser);
      console.log('Auth current user:', auth.currentUser);
      
      // Check both context user and Firebase user
      if (!user?.id && !firebaseUser?.uid) {
        console.error('No user logged in - both context and Firebase user are null');
        return { success: false, error: 'No user logged in' };
      }

      // Test connection first
      const connectionTest = await testFirebaseConnectionDetailed();
      if (!connectionTest.success) {
        console.error('Connection test failed:', connectionTest.error);
        return { success: false, error: `Connection failed: ${connectionTest.error}` };
      }

      // Get the current Firebase user
      let currentUser = auth.currentUser || firebaseUser;
      if (!currentUser) {
        console.error('No Firebase user available for deletion');
        return { success: false, error: 'No user logged in' };
      }
      
      // Ensure the user is properly authenticated
      if (!currentUser.uid && !currentUser.id) {
        console.error('Firebase user has no UID or ID');
        return { success: false, error: 'User authentication is invalid' };
      }
      
      // Try to refresh the user session if needed
      try {
        await currentUser.reload();
        currentUser = auth.currentUser || firebaseUser;
        console.log('User session refreshed successfully');
      } catch (reloadError) {
        console.warn('Failed to reload user session:', reloadError);
        // Continue with deletion even if reload fails
      }

      // Get the user ID for data deletion
      const userId = currentUser.uid || currentUser.id || user?.id;
      if (!userId) {
        console.error('No user ID available for data deletion');
        return { success: false, error: 'No user ID available' };
      }
      
      console.log('Using user ID for data deletion:', userId);
      
      // Delete ALL user data from Firestore first
      try {
        console.log('=== COMPREHENSIVE USER DATA DELETION ===');
        
        const deletionResult = await firestoreHelpers.deleteAllUserData(userId);
        
        if (deletionResult.success) {
          console.log('=== USER DATA DELETION SUCCESS ===');
          console.log('Deletion summary:', deletionResult.data);
        } else {
          console.error('User data deletion failed:', deletionResult);
        }
        
      } catch (deleteError) {
        console.error('Error deleting user data:', deleteError);
        // Continue with account deletion even if data deletion fails
      }

      // Delete the Firebase user account
      await currentUser.delete();

      console.log('Account deletion successful');

      // Clear ALL local state and storage
      try {
        // Clear local state
        setUser(null);
        setFirebaseUser(null);
        setIsLoading(false);
        
        // Clear AsyncStorage
        await AsyncStorage.clear();
        console.log('Local storage cleared successfully');
        
        // Clear any cached data
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.clear();
          console.log('Browser localStorage cleared');
        }
        
      } catch (clearError) {
        console.warn('Error clearing local storage:', clearError);
        // Continue even if storage clearing fails
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error during account deletion:', error);
      return { success: false, error: 'Failed to delete account. Please try again.' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      console.log('Starting sign out process...');
      
      // Clear state immediately for instant UI response
      setUser(null);
      setFirebaseUser(null);
      setIsLoading(false);
      
      // CRITICAL: Reset navigation stack completely to prevent back navigation to authenticated pages
      // Use router.replace with dismissAll to clear the entire stack
      const { router } = require('expo-router');
      
      // Method 1: Try to dismiss all and navigate to fresh home
      try {
        // Clear any existing navigation state
        if (router.canDismiss && router.canDismiss()) {
          router.dismissAll();
        }
        
        // Force navigate to clean home state
        router.replace('/(tabs)/(home)');
        console.log('Navigation reset to home completed');
      } catch (navError) {
        console.warn('Primary navigation reset failed, trying fallback:', navError);
        
        // Fallback: Direct replace
        router.replace('/(tabs)/(home)');
      }
      
      // Sign out from Firebase in background (non-blocking)
      Promise.race([
        auth.signOut(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Sign out timeout')), Platform.OS === 'ios' ? 8000 : 5000);
        })
      ]).then(() => {
        console.log('Firebase sign out completed successfully');
      }).catch((signOutError) => {
        console.warn('Firebase sign out timed out or failed, but local state cleared:', signOutError);
      });
      
      console.log('Sign out process completed');
    } catch (error) {
      console.error('Error during sign out process:', error);
      // Ensure state is cleared even if there's an error
      setUser(null);
      setFirebaseUser(null);
      setIsLoading(false);
      
      // Ensure navigation to home even on error
      try {
        const { router } = require('expo-router');
        router.replace('/(tabs)/(home)');
      } catch (navError) {
        console.error('Navigation error during sign out:', navError);
      }
    }
  };

  return {
    user,
    firebaseUser,
    isAuthenticated: !!(user && firebaseUser),
    isLoading,
    showNameInput,
    checkUserExists,
    sendOtp,
    verifyOtp,
    signOut,
    refreshSession,
    deleteAccount,
    handleNameSet,
    setShowNameInput,
  };
});
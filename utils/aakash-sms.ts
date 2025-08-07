import AsyncStorage from '@react-native-async-storage/async-storage';

// Aakash SMS API configuration
const AAKASH_SMS_CONFIG = {
  AUTH_TOKEN: '186364c699d9a1b3e4378f8e718565457b165a7d2714f8db1753677287a80b61',
  BASE_URL: 'https://sms.aakashsms.com/sms/v3/send',
  OTP_EXPIRY_MINUTES: 10, // 10 minutes
};

// Generate a 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP with expiry timestamp in AsyncStorage
const storeOTP = async (phone: string, otp: string, expiresAt: number): Promise<void> => {
  const otpData = {
    otp,
    expiresAt,
    phone,
    createdAt: Date.now(),
  };
  await AsyncStorage.setItem(`otp_${phone}`, JSON.stringify(otpData));
};

// Get stored OTP data
const getStoredOTP = async (phone: string): Promise<{ otp: string; expiresAt: number; createdAt: number } | null> => {
  try {
    const otpDataString = await AsyncStorage.getItem(`otp_${phone}`);
    if (!otpDataString) return null;
    
    const otpData = JSON.parse(otpDataString);
    return otpData;
  } catch (error) {
    console.error('Error getting stored OTP:', error);
    return null;
  }
};

// Clear stored OTP
const clearStoredOTP = async (phone: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`otp_${phone}`);
  } catch (error) {
    console.error('Error clearing stored OTP:', error);
  }
};

// Send OTP via Aakash SMS API
export const sendOtpViaSMS = async (phoneNumber: string): Promise<{ success: boolean; error?: string; expiresAt?: number }> => {
  try {
    console.log('Sending OTP via Aakash SMS API to:', phoneNumber);

    // Validate phone number format
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return { success: false, error: 'Invalid phone number' };
    }

    // Clean and format phone number for Aakash SMS
    let cleanPhone = phoneNumber.trim();
    
    // Remove +977 prefix for Aakash SMS API (expects 10-digit number)
    if (cleanPhone.startsWith('+977')) {
      cleanPhone = cleanPhone.substring(4);
    } else if (cleanPhone.startsWith('977')) {
      cleanPhone = cleanPhone.substring(3);
    }

    // Validate final phone number format (should be 10 digits)
    if (!/^\d{10}$/.test(cleanPhone)) {
      return { success: false, error: 'Phone number must be a valid 10-digit Nepali number' };
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (AAKASH_SMS_CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Create SMS message
    const message = `Your OTP for Mero Hisab is ${otp}.`;

    // Prepare API request
    const apiUrl = new URL(AAKASH_SMS_CONFIG.BASE_URL);
    apiUrl.searchParams.append('auth_token', AAKASH_SMS_CONFIG.AUTH_TOKEN);
    apiUrl.searchParams.append('to', cleanPhone);
    apiUrl.searchParams.append('text', message);

    console.log('SMS API URL:', apiUrl.toString().replace(AAKASH_SMS_CONFIG.AUTH_TOKEN, 'TOKEN_HIDDEN'));
    console.log('Sending to phone:', cleanPhone);
    console.log('OTP generated:', otp);

    // Send SMS request
    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('SMS API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SMS API error response:', errorText);
      return { 
        success: false, 
        error: `Failed to send SMS: ${response.status} ${response.statusText}` 
      };
    }

    const responseData = await response.text();
    console.log('SMS API response:', responseData);

    // Store OTP locally for verification
    await storeOTP(phoneNumber, otp, expiresAt);

    console.log('OTP sent successfully via Aakash SMS API');
    return { 
      success: true, 
      expiresAt 
    };

  } catch (error) {
    console.error('Error sending OTP via Aakash SMS:', error);
    
    if (error instanceof Error) {
      // Network or other specific errors
      if (error.message.includes('Network') || error.message.includes('fetch')) {
        return { success: false, error: 'Network error. Please check your internet connection and try again.' };
      }
      return { success: false, error: `SMS service error: ${error.message}` };
    }
    
    return { success: false, error: 'Failed to send OTP. Please try again.' };
  }
};

// Verify OTP against stored value
export const verifyOtpLocal = async (phoneNumber: string, enteredOtp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('Verifying OTP locally for phone:', phoneNumber);
    console.log('Entered OTP:', enteredOtp);

    // Validate input
    if (!phoneNumber || !enteredOtp) {
      return { success: false, error: 'Phone number and OTP are required' };
    }

    if (enteredOtp.length !== 6 || !/^\d{6}$/.test(enteredOtp)) {
      return { success: false, error: 'Please enter a valid 6-digit OTP' };
    }

    // Get stored OTP data
    const storedOtpData = await getStoredOTP(phoneNumber);
    
    if (!storedOtpData) {
      return { success: false, error: 'No OTP found. Please request a new code.' };
    }

    // Check if OTP has expired
    const now = Date.now();
    if (now > storedOtpData.expiresAt) {
      console.log('OTP expired:', {
        now,
        expiresAt: storedOtpData.expiresAt,
        expired: now > storedOtpData.expiresAt
      });
      
      // Clear expired OTP
      await clearStoredOTP(phoneNumber);
      return { success: false, error: 'OTP has expired. Please request a new code.' };
    }

    // Verify OTP
    if (enteredOtp === storedOtpData.otp) {
      console.log('OTP verification successful');
      
      // Clear OTP after successful verification
      await clearStoredOTP(phoneNumber);
      return { success: true };
    } else {
      console.log('OTP verification failed - incorrect code');
      return { success: false, error: 'Invalid OTP. Please enter the correct code.' };
    }

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, error: 'Failed to verify OTP. Please try again.' };
  }
};

// Clear expired OTPs (cleanup utility)
export const clearExpiredOTPs = async (): Promise<void> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const otpKeys = allKeys.filter(key => key.startsWith('otp_'));
    
    const now = Date.now();
    
    for (const key of otpKeys) {
      try {
        const otpDataString = await AsyncStorage.getItem(key);
        if (otpDataString) {
          const otpData = JSON.parse(otpDataString);
          if (now > otpData.expiresAt) {
            await AsyncStorage.removeItem(key);
            console.log('Cleared expired OTP for key:', key);
          }
        }
      } catch (error) {
        // If we can't parse the data, remove it
        await AsyncStorage.removeItem(key);
        console.log('Cleared invalid OTP data for key:', key);
      }
    }
  } catch (error) {
    console.error('Error clearing expired OTPs:', error);
  }
};
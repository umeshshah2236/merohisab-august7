import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface SuccessPopupProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function SuccessPopup({
  visible,
  title = 'सफल',
  message,
  onClose,
  duration = 2500,
}: SuccessPopupProps) {
  const { theme, isDark } = useTheme();
  const languageContext = useLanguage();
  const t = languageContext?.t || ((key: string) => key);
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      bounceAnim.setValue(0);
      
      // Animate in with bounce effect
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 150,
            friction: 6,
          }),
        ]),
        Animated.spring(bounceAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 4,
        }),
      ]).start();

      // Auto close
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.popup,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
              backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
              borderColor: theme.colors.primary,
            },
          ]}
        >
          {/* Success Icon with Animation */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.primary,
                transform: [{ scale: bounceAnim }],
              },
            ]}
          >
            <CheckCircle2 size={32} color="#ffffff" strokeWidth={2.5} />
          </Animated.View>
          
          {/* Title */}
          <Text style={[
            styles.title,
            { color: isDark ? '#ffffff' : '#1a1a1a' }
          ]}>
            {title}
          </Text>
          
          {/* Message */}
          <Text style={[
            styles.message,
            { color: isDark ? '#cccccc' : '#666666' }
          ]}>
            {message}
          </Text>
          
          {/* OK Button */}
          <TouchableOpacity
            style={[
              styles.okButton,
              { backgroundColor: theme.colors.primary }
            ]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={styles.okButtonText}>ठीक छ</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  popup: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 2,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  okButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
    minWidth: 100,
  },
  okButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { firestoreHelpers } from '@/lib/firebase';

interface NameInputModalProps {
  visible: boolean;
  onClose: () => void;
  onNameSet: (name: string) => void;
}

export default function NameInputModal({ visible, onClose, onNameSet }: NameInputModalProps) {
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { firebaseUser } = useAuth();

  const handleSaveName = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (!firebaseUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsLoading(true);
    try {
      // Update the user profile in Firestore
      await firestoreHelpers.upsertUserProfile(firebaseUser.uid, {
        name: fullName.trim(),
        phone: firebaseUser.phoneNumber || '',
      });

      console.log('User name updated successfully:', fullName.trim());
      onNameSet(fullName.trim());
      onClose();
    } catch (error) {
      console.error('Error updating user name:', error);
      Alert.alert('Error', 'Failed to save name. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        // Prevent closing by back button - name is mandatory
        Alert.alert('Required', 'Please enter your name to continue');
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.modalView}>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.subtitle}>
            Please enter your full name to personalize your experience
          </Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            autoFocus={true}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={50}
          />
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton, isLoading && styles.disabledButton]}
            onPress={handleSaveName}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
    lineHeight: 22,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 25,
    backgroundColor: '#f9f9f9',
  },
  button: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
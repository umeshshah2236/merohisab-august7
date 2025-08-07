import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Save, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useTransactionEntries, TransactionEntry } from '@/contexts/TransactionEntriesContext';
import TextInputWithDoneBar from './TextInputWithDoneBar';

interface EditTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  transaction: TransactionEntry | null;
  onTransactionUpdated: () => void;
  onTransactionDeleted: () => void;
}

export default function EditTransactionModal({
  visible,
  onClose,
  transaction,
  onTransactionUpdated,
  onTransactionDeleted,
}: EditTransactionModalProps) {
  const { theme } = useTheme();
  const { updateTransactionEntry, deleteTransactionEntry, loading } = useTransactionEntries();

  const [amount, setAmount] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'given' | 'received'>('given');
  const [description, setDescription] = useState<string>('');

  useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setTransactionType(transaction.transaction_type);
      setDescription(transaction.description || '');
    }
  }, [transaction]);

  const handleSave = async () => {
    if (!transaction) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }

    try {
      await updateTransactionEntry(
        transaction.id,
        numAmount,
        transactionType,
        description.trim() || undefined
      );
      
      console.log('Transaction updated successfully, triggering refresh...');
      // Trigger refresh immediately
      onTransactionUpdated();
      onClose();
      
      Alert.alert('Success', 'Transaction updated successfully');
    } catch (error) {
      console.error('Error updating transaction:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update transaction');
    }
  };

  const handleDelete = () => {
    if (!transaction) return;

    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransactionEntry(transaction.id);
              
              console.log('Transaction deleted successfully, triggering refresh...');
              // Trigger refresh immediately
              onTransactionDeleted();
              onClose();
              
              Alert.alert('Success', 'Transaction deleted successfully');
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete transaction');
            }
          }
        }
      ]
    );
  };

  const formatAmount = (text: string) => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    return numericValue;
  };

  if (!transaction) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Edit Transaction
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Customer Info */}
          <View style={[styles.customerInfo, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.customerName, { color: theme.colors.text }]}>
              {transaction.customer_name}
            </Text>
            <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
              {new Date(transaction.transaction_date).toLocaleDateString()}
            </Text>
          </View>

          {/* Transaction Type */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Transaction Type
            </Text>
            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  transactionType === 'given' && styles.typeButtonActive,
                  { borderColor: theme.colors.border }
                ]}
                onPress={() => setTransactionType('given')}
              >
                <Text style={[
                  styles.typeButtonText,
                  { color: transactionType === 'given' ? '#EF4444' : theme.colors.textSecondary }
                ]}>
                  You Gave
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  transactionType === 'received' && styles.typeButtonActive,
                  { borderColor: theme.colors.border }
                ]}
                onPress={() => setTransactionType('received')}
              >
                <Text style={[
                  styles.typeButtonText,
                  { color: transactionType === 'received' ? '#10B981' : theme.colors.textSecondary }
                ]}>
                  You Got
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Amount
            </Text>
            <View style={[styles.amountContainer, { borderColor: theme.colors.border }]}>
              <Text style={[styles.currencySymbol, { color: theme.colors.text }]}>रु</Text>
              <TextInputWithDoneBar
                style={[styles.amountInput, { color: theme.colors.text }]}
                value={amount}
                onChangeText={(text) => setAmount(formatAmount(text))}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Description (Optional)
            </Text>
            <TextInputWithDoneBar
              style={[
                styles.descriptionInput,
                { 
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background
                }
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a note about this transaction..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actionButtons, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.deleteButton]}
            onPress={handleDelete}
            disabled={loading}
          >
            <Trash2 size={20} color="white" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton]}
            onPress={handleSave}
            disabled={loading}
          >
            <Save size={20} color="white" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  customerInfo: {
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 24,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: '#3B82F6',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  descriptionInput: {
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
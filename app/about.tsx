import React from 'react';
import { StyleSheet, Text, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Calculator } from 'lucide-react-native';

export default function AboutScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t('aboutApp'),
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
        }} 
      />
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
            <Calculator size={48} color={theme.colors.primary} />
          </View>
          <Text style={[styles.appName, { color: theme.colors.text }]}>{t('appTitle')}</Text>
          <Text style={[styles.appSubtitle, { color: theme.colors.textSecondary }]}>{t('appSubtitle')}</Text>
        </View>
        
        <View style={[styles.contentCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.content, { color: theme.colors.text }]}>{t('aboutContent')}</Text>
        </View>

        {/* Company Information */}
        <View style={[styles.companyInfo, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.companyTitle, { color: theme.colors.text }]}>Developed By</Text>
          <Text style={[styles.companyName, { color: theme.colors.primary }]}>Cloud Orion International Pvt Ltd</Text>
          <View style={styles.companyDetails}>
            <Text style={[styles.companyDetail, { color: theme.colors.textSecondary }]}>VAT Number: 622312413</Text>
            <Text style={[styles.companyDetail, { color: theme.colors.textSecondary }]}>
              Address: Hattigauda Marga, Old Baneshwor Height,{'\n'}Kathmandu, Nepal
            </Text>
            <Text style={[styles.companyDetail, { color: theme.colors.textSecondary }]}>Phone: +977 9851197715</Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  contentCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  content: {
    fontSize: 14,
    lineHeight: 22,
  },
  companyInfo: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  companyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  companyDetails: {
    alignItems: 'center',
  },
  companyDetail: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 18,
  },
});
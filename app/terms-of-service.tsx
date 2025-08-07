import React from 'react';
import { StyleSheet, Text, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function TermsOfServiceScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t('termsOfServiceTitle'),
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
        <Text style={[styles.content, { backgroundColor: theme.colors.surface, color: theme.colors.text }]}>
          Terms of Service{"\n"}
          Legal terms and conditions for using MERO HISAB{"\n\n"}
          
          Effective Date: January 30, 2025{"\n"}
          Last Updated: January 30, 2025{"\n\n"}
          
          Service Provider{"\n"}
          Company: Cloud Orion International Pvt. Ltd.{"\n"}
          Address: Hadigaun 05, Kathmandu, Nepal{"\n"}
          Contact: +977 9851197715{"\n"}
          Email: contact@merohisab.net{"\n\n"}
          
          1. Acceptance of Terms{"\n"}
          By downloading, installing, or using the MERO HISAB mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.{"\n\n"}
          
          2. Description of Service{"\n"}
          MERO HISAB is a financial calculator application designed specifically for Nepali businessmen. The App provides the following features:{"\n\n"}
          
          Core Features{"\n"}
          Gramin Interest Calculator: Calculate compound interest with Bikram Sambat (BS) dates according to the Nepali calendar system{"\n"}
          Repayment Interest Calculator: Track loans given or taken with automatic calculations and repayment schedules{"\n"}
          LenDen Management: Manage lending and borrowing transactions with comprehensive tracking{"\n"}
          Financial Data Storage: Secure storage of your financial calculations and history{"\n"}
          Phone-based Authentication: Account creation and access through phone number verification{"\n\n"}
          
          3. Eligibility and Age Requirements{"\n"}
          To use MERO HISAB, you must:{"\n\n"}
          
          Be at least 18 years of age{"\n"}
          Have legal capacity to enter into binding agreements{"\n"}
          Provide a valid phone number for account verification{"\n"}
          Comply with all applicable laws and regulations in Nepal{"\n\n"}
          
          4. Account Registration and Security{"\n"}
          Phone-Only Registration{"\n"}
          MERO HISAB uses phone-based registration exclusively. You agree to:{"\n\n"}
          
          Provide accurate and current phone number information{"\n"}
          Maintain the security of your account credentials{"\n"}
          Notify us immediately of any unauthorized access{"\n"}
          Accept responsibility for all activities under your account{"\n"}
          Use only one account per phone number{"\n\n"}
          
          5. Intended Use and Limitations{"\n"}
          Business Financial Management{"\n"}
          The App is intended for:{"\n\n"}
          
          Personal business financial calculations and tracking{"\n"}
          Managing loan transactions (given or taken){"\n"}
          Calculating interest according to Nepali financial practices{"\n"}
          Organizing and tracking LenDen (lending/borrowing) activities{"\n\n"}
          
          Tool, Not Financial Advice{"\n"}
          Important Disclaimer{"\n"}
          MERO HISAB is a calculation tool only and does NOT provide financial advice.{"\n\n"}
          
          We provide no guarantee for the accuracy of calculations{"\n"}
          Results may not be suitable for all financial decisions{"\n"}
          Always verify calculations independently{"\n"}
          Consult qualified financial professionals for important decisions{"\n\n"}
          
          6. Prohibited Activities{"\n"}
          You agree NOT to:{"\n\n"}
          
          Abuse or Misuse: Use the App in ways that could damage, disable, or impair the service{"\n"}
          Reverse Engineering: Attempt to extract source code, decompile, or reverse engineer the App{"\n"}
          Illegal Activities: Use the App for any illegal financial activities or money laundering{"\n"}
          Unauthorized Access: Access or attempt to access other users' accounts or data{"\n"}
          Commercial Redistribution: Resell, redistribute, or commercially exploit the App{"\n"}
          Data Scraping: Use automated systems to extract data from the App{"\n"}
          False Information: Provide false or misleading information during registration{"\n\n"}
          
          7. Data and Privacy{"\n"}
          Your privacy is important to us. Please review our Privacy Policy for detailed information about:{"\n\n"}
          
          What data we collect and how we use it{"\n"}
          How we protect your financial information{"\n"}
          Your rights regarding your personal data{"\n"}
          How to request data deletion{"\n\n"}
          
          8. App Updates and Changes{"\n"}
          We reserve the right to update and modify the App. Changes may include:{"\n\n"}
          
          New Features: Additional calculation methods and financial tools{"\n"}
          Interface Improvements: Enhanced user experience and design updates{"\n"}
          Bug Fixes: Corrections to calculation errors and performance issues{"\n"}
          Security Updates: Enhanced protection for your financial data{"\n"}
          Terms Updates: Modifications to these Terms of Service{"\n\n"}
          
          We will notify users of significant changes through the App or our website. Continued use constitutes acceptance of updated terms.{"\n\n"}
          
          9. Intellectual Property{"\n"}
          All intellectual property rights in the App belong to Cloud Orion International Pvt. Ltd., including:{"\n\n"}
          
          Software code and algorithms{"\n"}
          User interface design and graphics{"\n"}
          Calculation methodologies and formulas{"\n"}
          Trademarks and branding elements{"\n"}
          Documentation and help materials{"\n\n"}
          
          10. Limitation of Liability{"\n"}
          Important Legal Notice{"\n"}
          Cloud Orion International Pvt. Ltd. shall NOT be liable for:{"\n\n"}
          
          Financial losses resulting from calculation errors{"\n"}
          Business decisions made based on App results{"\n"}
          Direct, indirect, or consequential damages{"\n"}
          Loss of profits, data, or business opportunities{"\n"}
          Third-party claims arising from your use of the App{"\n\n"}
          
          Users assume full responsibility for their financial decisions and agree to use the App at their own risk.{"\n\n"}
          
          11. Service Availability{"\n"}
          While we strive to provide continuous service, we do not guarantee uninterrupted access to the App. Service may be temporarily unavailable due to maintenance, updates, or technical issues. We are not liable for any inconvenience caused by service interruptions.{"\n\n"}
          
          12. Account Termination{"\n"}
          User-Initiated Termination{"\n"}
          You may terminate your account at any time by:{"\n\n"}
          
          Using our Data Deletion request form{"\n"}
          Contacting our support team directly{"\n"}
          Uninstalling the App (data may remain on servers){"\n\n"}
          
          Company-Initiated Termination{"\n"}
          We may terminate accounts for:{"\n\n"}
          
          Violation of these Terms of Service{"\n"}
          Suspected fraudulent or illegal activity{"\n"}
          Abuse of the service or other users{"\n"}
          Extended periods of inactivity{"\n\n"}
          
          13. Governing Law{"\n"}
          These Terms are governed by the laws of Nepal. Any disputes will be resolved in the competent courts of Kathmandu, Nepal. By using the App, you consent to the jurisdiction of these courts.{"\n\n"}
          
          14. Contact Information{"\n"}
          For questions about these Terms:{"\n"}
          Cloud Orion International Pvt. Ltd.{"\n"}
          Hadigaun 05, Kathmandu, Nepal{"\n"}
          Phone: +977 9851197715{"\n"}
          Email: contact@merohisab.net{"\n\n"}
          
          15. Severability{"\n"}
          If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue to be valid and enforceable to the fullest extent permitted by law.{"\n\n"}
          
          16. Entire Agreement{"\n"}
          These Terms, together with our Privacy Policy, constitute the entire agreement between you and Cloud Orion International Pvt. Ltd. regarding your use of MERO HISAB.{"\n\n"}
          
          Acknowledgment{"\n"}
          By using MERO HISAB, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. You also acknowledge that you have read our Privacy Policy and understand how we collect, use, and protect your information.
        </Text>
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
  content: {
    fontSize: 14,
    lineHeight: 22,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
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
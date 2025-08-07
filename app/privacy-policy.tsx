import React from 'react';
import { StyleSheet, Text, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function PrivacyPolicyScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t('privacyPolicyTitle'),
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
          Privacy Policy{"\n"}
          How MERO HISAB protects and handles your personal information{"\n\n"}
          
          Effective Date: January 30, 2025{"\n"}
          Last Updated: January 30, 2025{"\n\n"}
          
          Developer Information{"\n"}
          Developer: Cloud Orion International Pvt. Ltd.{"\n"}
          Address: Hadigaun 05, Kathmandu, Nepal{"\n"}
          Contact: +977 9851197715{"\n"}
          Privacy Contact: support@merohisab.com{"\n\n"}
          
          For privacy-related inquiries or to submit privacy requests, please contact us using the information above.{"\n\n"}
          
          1. Information We Collect{"\n"}
          MERO HISAB is a financial calculator application designed for Nepali businessmen. We collect the following types of information:{"\n\n"}
          
          Personal Information{"\n"}
          Name: Your full name as provided during account setup{"\n"}
          Phone Number: Used for account verification and login (phone signup only){"\n"}
          Contact Information: Additional contact details you provide{"\n\n"}
          
          Financial Data{"\n"}
          Calculation Entries: Financial calculations you input into the app{"\n"}
          Interest Calculations: Compound interest calculations with BS dates{"\n"}
          Loan Records: Loan tracking data including repayment schedules{"\n"}
          LenDen Transactions: Lending and borrowing transaction records{"\n"}
          Saved Calculations: Your calculation history for future reference{"\n\n"}
          
          Technical Data{"\n"}
          Device Information: Device type, operating system, app version{"\n"}
          Usage Data: App usage patterns to improve functionality{"\n"}
          Authentication Data: Secure tokens for maintaining your session{"\n\n"}
          
          2. How We Use Your Information{"\n"}
          We use your information exclusively for the following purposes:{"\n\n"}
          
          Provide Financial Calculations: Process and store your financial calculations{"\n"}
          Account Management: Verify your identity and maintain your account{"\n"}
          Data Synchronization: Save your calculation history across sessions{"\n"}
          App Improvement: Analyze usage patterns to enhance functionality{"\n"}
          Customer Support: Respond to your inquiries and provide assistance{"\n"}
          Legal Compliance: Meet regulatory requirements and legal obligations{"\n\n"}
          
          3. Data Sharing and Disclosure{"\n"}
          We are committed to protecting your privacy. Your personal and financial data is handled as follows:{"\n\n"}
          
          No Third-Party Sharing{"\n"}
          We never sell your personal or financial information{"\n"}
          We do not share your data with third parties for marketing purposes{"\n"}
          We do not monetize your personal information{"\n\n"}
          
          Limited Disclosure Exceptions{"\n"}
          We may only disclose your information in these specific circumstances:{"\n\n"}
          
          Legal Compliance: When required by valid governmental requests or applicable law{"\n"}
          Service Providers: To trusted service providers who assist in app operations (bound by strict confidentiality){"\n"}
          Business Transfers: In case of merger or acquisition with legally adequate notice to users{"\n"}
          User Consent: When you explicitly authorize such sharing{"\n\n"}
          
          4. Data Security{"\n"}
          We implement industry-standard security measures to protect your information:{"\n\n"}
          
          Encryption: All data transmission uses modern cryptography (HTTPS){"\n"}
          Secure Storage: Financial data is encrypted and stored securely{"\n"}
          Access Controls: Strict access limitations to your personal data{"\n"}
          Regular Security Reviews: Ongoing security assessments and updates{"\n"}
          Authentication: Secure phone-based authentication system{"\n\n"}
          
          5. Data Retention and Deletion{"\n"}
          We retain your information as follows:{"\n\n"}
          
          Active Accounts: Data is retained while your account remains active{"\n"}
          Calculation History: Stored to provide ongoing service functionality{"\n"}
          Legal Requirements: Some data may be retained for regulatory compliance{"\n"}
          Account Deletion: Upon request, we will delete your account and associated data within 30 days{"\n\n"}
          
          6. Your Rights and Choices{"\n"}
          You have the following rights regarding your personal information:{"\n\n"}
          
          Access: Request information about what data we have collected{"\n"}
          Correction: Modify or correct your personal information{"\n"}
          Deletion: Request complete deletion of your account and data{"\n"}
          Portability: Request a copy of your data in a readable format{"\n"}
          Withdrawal: Stop using the app at any time{"\n\n"}
          
          To exercise these rights, please use our Data Deletion page or contact us directly.{"\n\n"}
          
          7. Children's Privacy{"\n"}
          MERO HISAB is intended for users aged 18 and above. We do not knowingly collect personal information from children under 18. If we discover that we have collected information from a child under 18, we will promptly delete such information.{"\n\n"}
          
          8. International Data Transfers{"\n"}
          Your data is primarily stored and processed in Nepal. If we need to transfer data internationally for service provision, we will ensure appropriate safeguards are in place and comply with applicable data protection laws.{"\n\n"}
          
          9. Changes to This Privacy Policy{"\n"}
          We may update this privacy policy from time to time. We will notify you of any material changes by:{"\n\n"}
          
          Updating the "Last Updated" date at the top of this policy{"\n"}
          Providing in-app notifications for significant changes{"\n"}
          Continuing to use the app constitutes acceptance of the updated policy{"\n\n"}
          
          10. Compliance and Legal Framework{"\n"}
          This privacy policy complies with:{"\n\n"}
          
          Google Play Store privacy policy requirements{"\n"}
          Nepal's data protection regulations{"\n"}
          International privacy law best practices{"\n"}
          Mobile app privacy standards{"\n\n"}
          
          11. Contact Information{"\n"}
          For privacy-related questions, concerns, or requests:{"\n\n"}
          
          Cloud Orion International Pvt. Ltd.{"\n"}
          Hadigaun 05, Kathmandu, Nepal{"\n"}
          Phone: +977 9851197715{"\n"}
          Email: support@merohisab.com{"\n\n"}
          
          Response Time: We will respond to privacy inquiries within 30 days.{"\n\n"}
          
          12. Acknowledgment{"\n"}
          By using MERO HISAB, you acknowledge that you have read, understood, and agree to this Privacy Policy. If you do not agree with any part of this policy, please do not use our application.
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
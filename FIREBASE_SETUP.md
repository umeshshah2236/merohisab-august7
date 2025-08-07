# Firebase Setup Instructions

## 1. Create a Firebase Project

1. Go to [firebase.google.com](https://firebase.google.com) and create a new account or sign in
2. Click "Create a project" or "Add project"
3. Enter project name (e.g., "mero-hisab")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## 2. Get Your Project Credentials

1. Go to your project dashboard
2. Click on the gear icon (⚙️) next to "Project Overview" to open Project settings
3. Scroll down to "Your apps" section
4. Click "Add app" and choose "Web" (</>) 
5. Register your app with a nickname (e.g., "mero-hisab-web")
6. Copy the Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## 3. Set Up Environment Variables

1. Create a `.env` file in your project root
2. Add your Firebase credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## 4. Set Up Authentication

1. In your Firebase dashboard, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Phone" authentication
5. Configure phone authentication settings as needed

## 5. Set Up Firestore Database

1. In your Firebase dashboard, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Choose a location close to your users
5. Click "Done"

## 6. Set Up Firestore Security Rules

1. In Firestore Database, go to "Rules" tab
2. Replace the default rules with:

**For Production (Secure):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read and write their own data
    match /profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /customers/{customerId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.user_id;
    }
    
    match /loans/{loanId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.user_id;
    }
    
    match /transaction_entries/{entryId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.user_id;
    }
  }
}
```

**For Development (Less Secure - Use Only for Testing):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow all operations for development
    // WARNING: This is NOT secure for production!
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Important:** Use the development rules only for testing. Switch to production rules before deploying your app.

## 7. Test the Setup

1. Start your Expo development server: `npm start` or `bun start`
2. Try signing up with a new account
3. Check your Firebase dashboard under "Authentication" > "Users" to see if the user was created
4. Check the "Firestore Database" to see if data is being stored

## Database Collections Overview

### Collections:

1. **profiles**: User profile information
   - `id` (document ID = user UID)
   - `name`: User's display name
   - `phone`: User's phone number
   - `created_at`: Timestamp
   - `updated_at`: Timestamp

2. **customers**: Customer information
   - `id`: Auto-generated document ID
   - `user_id`: Reference to user who owns this customer
   - `name`: Customer name
   - `phone`: Customer phone number
   - `customer_type`: 'customer' or 'supplier'
   - `created_at`: Timestamp
   - `updated_at`: Timestamp

3. **loans**: Loan records
   - `id`: Auto-generated document ID
   - `user_id`: Reference to user who owns this loan
   - `person_name`: Name of person who took/gave loan
   - `loan_amount`: Amount of the loan
   - `interest_rate`: Interest rate
   - `loan_date`: Date of the loan
   - `customer_id`: Reference to customer (optional)
   - `is_document_submitted`: Boolean
   - `notes`: Additional notes
   - `purpose`: Purpose of the loan
   - `transaction_type`: 'given' or 'received'
   - `created_at`: Timestamp
   - `updated_at`: Timestamp

4. **transaction_entries**: Transaction records
   - `id`: Auto-generated document ID
   - `user_id`: Reference to user who owns this transaction
   - `customer_id`: Reference to customer
   - `customer_name`: Customer name
   - `amount`: Transaction amount
   - `transaction_type`: 'given' or 'received'
   - `description`: Transaction description
   - `transaction_date`: Date of transaction
   - `balance_after`: Balance after this transaction
   - `created_at`: Timestamp
   - `updated_at`: Timestamp

## Security Notes

- The security rules ensure users can only access their own data
- All collections are protected by user authentication
- Data is automatically filtered by user_id in queries
- Phone authentication is used for user registration and login

## Troubleshooting

1. **Authentication Issues**: Make sure phone authentication is enabled in Firebase console
2. **Database Access Issues**: Check that Firestore security rules are properly configured
3. **Environment Variables**: Ensure all Firebase config variables are set in your `.env` file
4. **Network Issues**: Firebase handles offline/online synchronization automatically

## Next Steps

1. Test the authentication flow
2. Test creating and reading customer data
3. Test loan and transaction functionality
4. Configure production security rules before deploying
5. Set up Firebase Analytics if needed 
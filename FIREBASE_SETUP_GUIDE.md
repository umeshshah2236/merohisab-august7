# Firebase Setup Guide for Mero Hisab

## 🔧 **Step 1: Install Firebase CLI**

First, install the Firebase CLI globally:

```bash
npm install -g firebase-tools
```

## 🔐 **Step 2: Login to Firebase**

```bash
firebase login
```

## 📁 **Step 3: Initialize Firebase in Your Project**

```bash
firebase init firestore
```

When prompted:
- Select your Firebase project (mero-hisab-f776b)
- Use existing project
- Accept the default file locations

## 🛡️ **Step 4: Deploy Security Rules**

The security rules are already created in `firestore.rules`. Deploy them:

```bash
firebase deploy --only firestore:rules
```

## 📊 **Step 5: Deploy Indexes**

Deploy the Firestore indexes for better performance:

```bash
firebase deploy --only firestore:indexes
```

## 🔍 **Step 6: Verify Rules in Firebase Console**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project (mero-hisab-f776b)
3. Go to **Firestore Database** → **Rules**
4. Verify the rules are deployed correctly

## 📋 **Security Rules Explanation**

The rules ensure:

### **User Profiles (`/profiles/{userId}`)**
- Users can only read/write their own profile
- `request.auth.uid == userId`

### **Customers (`/customers/{customerId}`)**
- Users can only access customers they created
- `resource.data.user_id == request.auth.uid`

### **Transactions (`/transaction_entries/{transactionId}`)**
- Users can only access their own transactions
- `resource.data.user_id == request.auth.uid`

### **Loans (`/loans/{loanId}`)**
- Users can only access their own loans
- `resource.data.user_id == request.auth.uid`

## 🧪 **Testing the Rules**

### **Test User Authentication**
```javascript
// This should work for authenticated users
const user = auth.currentUser;
if (user) {
  // User can read/write their own data
}
```

### **Test Data Isolation**
- User A cannot see User B's data
- Each user's data is completely isolated
- No cross-user data access

## 🚨 **Common Issues & Solutions**

### **Issue: "Missing or insufficient permissions"**
**Solution:** Deploy the security rules
```bash
firebase deploy --only firestore:rules
```

### **Issue: "Index not found"**
**Solution:** Deploy the indexes
```bash
firebase deploy --only firestore:indexes
```

### **Issue: "User not authenticated"**
**Solution:** Ensure user is signed in before accessing data

### **Issue: "Data not saving"**
**Solution:** Check that user_id is set correctly in all documents

## 📱 **App Testing**

After deploying rules:

1. **Sign in** with your phone number
2. **Enter your name** (Umesh)
3. **Add a customer** - should save successfully
4. **Add transactions** - should save successfully
5. **Check dashboard** - should display data
6. **Edit/delete** - should work properly

## 🔄 **Deployment Commands**

### **Deploy Everything**
```bash
firebase deploy
```

### **Deploy Only Rules**
```bash
firebase deploy --only firestore:rules
```

### **Deploy Only Indexes**
```bash
firebase deploy --only firestore:indexes
```

### **View Deployment Status**
```bash
firebase projects:list
```

## 📊 **Monitoring**

### **Firebase Console Monitoring**
1. Go to Firebase Console
2. **Firestore Database** → **Usage**
3. Monitor read/write operations
4. Check for permission errors

### **App Logs**
Check console logs for:
- Authentication status
- Data save attempts
- Permission errors
- Network connectivity

## ✅ **Verification Checklist**

- [ ] Firebase CLI installed
- [ ] Logged into Firebase
- [ ] Project initialized
- [ ] Security rules deployed
- [ ] Indexes deployed
- [ ] User can sign in
- [ ] User can save profile
- [ ] User can add customers
- [ ] User can add transactions
- [ ] User can edit/delete data
- [ ] Data isolation working
- [ ] No permission errors

## 🆘 **Troubleshooting**

### **If data still not saving:**
1. Check Firebase Console → Authentication → Users
2. Verify user is authenticated
3. Check Firestore → Data for any saved documents
4. Look for permission errors in console logs

### **If rules deployment fails:**
1. Verify Firebase CLI is installed
2. Check you're logged in: `firebase login`
3. Verify project selection: `firebase use mero-hisab-f776b`
4. Try deploying again

### **If indexes are missing:**
1. Wait for indexes to build (can take several minutes)
2. Check Firebase Console → Firestore → Indexes
3. Verify indexes are being built

## 📞 **Support**

If you encounter issues:
1. Check Firebase Console for errors
2. Review app console logs
3. Verify network connectivity
4. Test with a simple document first 
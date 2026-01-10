# Firebase Data Not Showing - Troubleshooting Guide

## Quick Checks

### 1. Browser Console Check (F12)
1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for errors:
   - `❌ Error fetching stats:` - Shows exact error
   - `✅ Total documents fetched: X` - Shows how many documents were found
   - `permission-denied` - Security rules issue
   - `unavailable` - Network/Firestore connection issue

### 2. Check Firestore Security Rules

Go to Firebase Console → Firestore Database → Rules

**Current rules should be:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Or for admin-only access:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.profile.role == 'admin';
    }
    
    match /users/{userId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
  }
}
```

### 3. Check Authentication Status

1. Make sure you're logged in as admin
2. Check if admin user exists in Firebase Authentication
3. Check if admin user has `profile.role = "admin"` in Firestore

### 4. Check Firestore Data

1. Firebase Console → Firestore Database → Data
2. Check if `users` collection exists
3. Check if documents have proper structure:
   ```json
   {
     "name": "User Name",
     "email": "user@example.com",
     "profile": {
       "profession": "...",
       "role": "admin" (only for admin)
     },
     "surveys": { ... },
     "stats": { ... }
   }
   ```

### 5. Network Issues

- Check internet connection
- Check if Firebase services are accessible
- Try refreshing the page

## Common Errors & Solutions

### Error: "Permission denied"
**Solution:** Update Firestore security rules (see above)

### Error: "No users found"
**Solution:** 
- Check if `users` collection has documents
- Check if admin users are being filtered out (they should be)

### Error: "Firestore is unavailable"
**Solution:**
- Check internet connection
- Check Firebase project status
- Try again after a few seconds

## Debug Steps

1. **Open Browser Console (F12)**
2. **Check Console Logs:**
   - Look for `✅ Total documents fetched: X`
   - If X = 0, no data in Firestore
   - If error, check error code and message

3. **Check Network Tab:**
   - Look for failed requests to Firebase
   - Check response status codes

4. **Verify Firebase Config:**
   - Check `src/firebase/config.js`
   - Make sure all credentials are correct

5. **Test Firestore Connection:**
   - Try accessing Firestore directly in Firebase Console
   - Check if you can read documents manually

## Still Not Working?

1. Check browser console for exact error
2. Verify you're logged in as admin
3. Check Firestore security rules are published
4. Verify data exists in Firestore
5. Try logging out and logging back in

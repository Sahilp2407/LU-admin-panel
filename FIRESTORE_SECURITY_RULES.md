# Firestore Security Rules Setup

## Problem
अगर data नहीं आ रहा है, तो सबसे common issue **Firestore Security Rules** है।

## Solution: Security Rules Update करें

1. **Firebase Console** खोलें: https://console.firebase.google.com/
2. अपनी project select करें: **letsupgradewp**
3. Left sidebar में **Firestore Database** → **Rules** tab click करें
4. नीचे दिए गए rules paste करें:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.profile.role == 'admin';
    }
    
    // Users collection - only admins can read
    match /users/{userId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
  }
}
```

5. **Publish** button click करें

## Alternative: Temporary Rules for Testing

अगर आप testing कर रहे हैं और सभी authenticated users को access देना चाहते हैं (temporarily):

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

⚠️ **Warning**: ये rules production के लिए secure नहीं हैं। सिर्फ testing के लिए use करें।

## Check करें

1. Browser console (F12) खोलें
2. Page refresh करें
3. Console में errors check करें
4. अगर "Permission denied" error आ रहा है, तो security rules update करें

## Common Errors

- **Permission denied**: Security rules issue - rules update करें
- **No data**: `users` collection में data नहीं है
- **Network error**: Internet connection check करें

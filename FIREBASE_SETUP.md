# Firebase Setup Guide

## Step 1: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click on the **⚙️ Settings icon** → **Project settings**
4. Scroll down to **Your apps** section
5. If you don't have a web app, click **</> Add app** and register your app
6. Copy the `firebaseConfig` object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

## Step 2: Update the Config File

Open `src/firebase/config.js` and replace the placeholder values with your actual Firebase config values.

## Step 3: Enable Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Click **Save**

## Step 4: Create Admin User

1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Enter email: `admin@example.com` (or your preferred email)
4. Enter password: (choose a strong password - **remember this!**)
5. Click **Add user**
6. **Copy the User UID** (you'll need it for the next step)

## Step 5: Set Admin Role in Firestore

1. Go to **Firestore Database** → **Start collection**
2. Collection ID: `users`
3. Document ID: **Paste the User UID from Step 4**
4. Add these fields:

```
Field: name
Type: string
Value: Admin User

Field: email
Type: string
Value: admin@example.com (or your email)

Field: createdAt
Type: timestamp
Value: [Click and select current timestamp]

Field: profile (Type: map)
  └─ role (Type: string, Value: admin)
```

5. Click **Save**

## Step 6: Test Login

1. Go back to your app at `http://localhost:5173`
2. Enter the email and password you created in Step 4
3. You should now be able to log in!

---

**Important Notes:**
- The password is whatever you set in Step 4
- Make sure `profile.role = "admin"` in Firestore
- The User UID in Firestore must match the Authentication UID

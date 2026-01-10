# LU Admin Dashboard

A production-ready Admin Dashboard for a web app using Firebase, React, and Tailwind CSS.

## Features

- 🔐 Firebase Authentication with admin role protection
- 📊 Real-time dashboard with statistics and charts
- 👥 Users table with live updates
- 📋 Detailed user profiles with survey responses
- 🎨 Modern UI with Tailwind CSS
- 📈 Chart.js visualizations

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Firebase Auth
- Firebase Firestore
- Chart.js
- React Router

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:**
   - Open `src/firebase/config.js`
   - Replace the placeholder values with your Firebase project configuration:
     ```javascript
     const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_AUTH_DOMAIN",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_STORAGE_BUCKET",
       messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
       appId: "YOUR_APP_ID"
     };
     ```

3. **Set up Firestore Security Rules:**
   Make sure your Firestore rules allow authenticated admin users to read the users collection:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.profile.role == 'admin';
       }
     }
   }
   ```

4. **Create an admin user:**
   - Create a user in Firebase Authentication
   - In Firestore, create a document at `users/{uid}` with:
     ```json
     {
       "name": "Admin User",
       "email": "admin@example.com",
       "createdAt": "timestamp",
       "profile": {
         "role": "admin"
       }
     }
     ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Build for production:**
   ```bash
   npm run build
   ```

## Project Structure

```
src/
├── components/
│   ├── Layout.jsx          # Main layout with navigation
│   └── ProtectedRoute.jsx  # Admin route protection
├── firebase/
│   └── config.js           # Firebase configuration
├── pages/
│   ├── Dashboard.jsx       # Overview dashboard with stats
│   ├── Login.jsx           # Login page
│   ├── UserDetail.jsx      # Individual user detail page
│   └── Users.jsx           # Users table
├── utils/
│   └── auth.js             # Authentication utilities
├── App.jsx                 # Main app component with routing
├── main.jsx                # Entry point
└── index.css               # Global styles
```

## Pages

### 1. Admin Overview Dashboard (`/dashboard`)
- Total users count
- Count of Freshers vs Working Professionals
- Average session rating
- Count of users with outcome_survey = "Role switch"
- Interactive charts using Chart.js

### 2. Users Table (`/users`)
- Real-time table of all users
- Columns: Name, Email, Profession, Rating, Total Points
- View Details button to navigate to user detail page
- Uses Firestore `onSnapshot` for live updates

### 3. User Detail Page (`/users/:userId`)
- **Section A:** User Profile (Name, Email, Profession, Organization, Department, CTC)
- **Section B:** Survey Questions & Answers (formatted clearly)
- **Section C:** Learning Progress (completed sections with check icons)
- **Section D:** Performance Stats (Total Correct, Total Incorrect, Total Points)

## Security

- All routes are protected by `ProtectedRoute` component
- Admin role is validated using Firestore: `users/{uid}.profile.role === "admin"`
- Non-admin users are redirected to `/login`
- Authentication state is checked on every route change

## License

MIT

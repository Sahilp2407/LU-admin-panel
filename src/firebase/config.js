import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfrz3pR8aGjEtC8bKtRKTbNgk8ZWHylFA",
  authDomain: "letsupgradewp.firebaseapp.com",
  databaseURL: "https://letsupgradewp-default-rtdb.firebaseio.com",
  projectId: "letsupgradewp",
  storageBucket: "letsupgradewp.firebasestorage.app",
  messagingSenderId: "129607189848",
  appId: "1:129607189848:web:cd339e76e41ac61624912d",
  measurementId: "G-MJ03FJ5XPJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;

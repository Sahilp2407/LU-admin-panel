import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

/**
 * Check if the current user is an admin
 * @returns {Promise<{isAdmin: boolean, user: object|null}>}
 */
export const checkAdminStatus = async () => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        resolve({ isAdmin: false, user: null });
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const profile = userData.profile || {};
          const isAdmin = profile.role === 'admin';
          resolve({ isAdmin, user: { ...user, ...userData } });
        } else {
          resolve({ isAdmin: false, user: null });
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        resolve({ isAdmin: false, user: null });
      }
    });
  });
};

/**
 * Get current authenticated user
 * @returns {Promise<object|null>}
 */
export const getCurrentUser = () => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      resolve(user);
    });
  });
};

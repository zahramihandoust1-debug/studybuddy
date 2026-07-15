import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBS5u3P4_CdWRp1kJDlWF-QtgfEeyBgztE",
  authDomain: "studybuddy-393f1.firebaseapp.com",
  projectId: "studybuddy-393f1",
  storageBucket: "studybuddy-393f1.firebasestorage.app",
  messagingSenderId: "184613795055",
  appId: "1:184613795055:web:7b9f6853d913fb047b171a",
  measurementId: "G-Q9EJ71TV0E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'eur3');
export { analytics };

export default app;

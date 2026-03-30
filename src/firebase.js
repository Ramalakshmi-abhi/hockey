// Firebase configuration
// TODO: Replace with your Firebase project credentials from https://console.firebase.google.com/
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCPiWJT4GNlU1fTWWUhlpBoWLGU43zuZ-Q",
  authDomain: "hockey-1e16e.firebaseapp.com",
  projectId: "hockey-1e16e",
  databaseURL: "https://hockey-1e16e-default-rtdb.asia-southeast1.firebasedatabase.app",
  storageBucket: "hockey-1e16e.firebasestorage.app",
  messagingSenderId: "136690624613",
  appId: "1:136690624613:web:619f237b82367a0dbb3e8c"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export default app;

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD6vdjWwLH_R8bZdr-QI_klLJohvcd80fg",
  authDomain: "velosdrop-otp-14512.firebaseapp.com",
  projectId: "velosdrop-otp-14512",
  storageBucket: "velosdrop-otp-14512.appspot.com",
  messagingSenderId: "625224054282",
  appId: "1:625224054282:web:fbda25ac35d397f1b0d1f3"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
auth.useDeviceLanguage();

export { auth };
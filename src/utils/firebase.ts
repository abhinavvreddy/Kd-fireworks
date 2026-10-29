import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyA5uaOVxxxFvrAELccywzA8GmlyxzeUZ30",
  authDomain: "kanakadurgafireworks-9ee1b.firebaseapp.com",
  projectId: "kanakadurgafireworks-9ee1b",
  storageBucket: "kanakadurgafireworks-9ee1b.firebasestorage.app",
  messagingSenderId: "477929636652",
  appId: "1:477929636652:web:9b26f9a124229489d3e289",
  measurementId: "G-CPYBW3LM63"
};

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

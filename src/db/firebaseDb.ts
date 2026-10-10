import { initializeApp } from 'firebase/app';
import { initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence verbose offline/connection notices from Firestore logger
try {
  setLogLevel('silent');
} catch {
  // Ignore in case setLogLevel is not supported in environment
}

// Filter harmless transient Firestore connection notices from console.error
if (typeof window !== 'undefined' && window.console) {
  const originalConsoleError = window.console.error;
  window.console.error = (...args: any[]) => {
    const message = args.map((a) => (typeof a === 'string' ? a : (a?.message || ''))).join(' ');
    if (message.includes('Could not reach Cloud Firestore backend') || message.includes('Backend didn\'t respond within 10 seconds')) {
      // Benign warning: Firestore operates in offline local mode when backend is unreachable
      console.warn('Firestore: Đang hoạt động ở chế độ ngoại tuyến (Offline local storage mode)');
      return;
    }
    originalConsoleError.apply(window.console, args);
  };
}

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Initialize Firestore with custom database ID and robust long-polling
export const firestore = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    experimentalLongPollingOptions: {
      timeoutSeconds: 6,
    },
  },
  firebaseConfig.firestoreDatabaseId || '(default)'
);

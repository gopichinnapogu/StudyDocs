import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore using the configured database ID
export const db = initializeFirestore(
  app,
  {
    ignoreUndefinedProperties: true,
  },
  firebaseConfig.firestoreDatabaseId || '(default)'
);

export default app;

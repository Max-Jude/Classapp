import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import appletConfig from '../../firebase-applet-config.json';

function resolveEnv(envValue: string | undefined, fallback: string): string {
  if (!envValue) return fallback;
  const trimmed = envValue.trim();
  if (
    !trimmed ||
    trimmed.startsWith('YOUR_') ||
    trimmed.startsWith('your-') ||
    trimmed === '(default)'
  ) {
    return fallback;
  }
  return trimmed;
}

const firebaseConfig = {
  apiKey: resolveEnv(import.meta.env.VITE_FIREBASE_API_KEY, appletConfig.apiKey),
  authDomain: resolveEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, appletConfig.authDomain),
  projectId: resolveEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, appletConfig.projectId),
  storageBucket: resolveEnv(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    appletConfig.storageBucket
  ),
  messagingSenderId: resolveEnv(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appletConfig.messagingSenderId
  ),
  appId: resolveEnv(import.meta.env.VITE_FIREBASE_APP_ID, appletConfig.appId),
  firestoreDatabaseId: resolveEnv(
    import.meta.env.VITE_FIREBASE_DATABASE_ID,
    appletConfig.firestoreDatabaseId
  ),
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const BOOTSTRAPPED_TUTOR_EMAIL = 'gabrieljude757@gmail.com';
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Default public Firebase Web SDK configuration for ClassFlow.
 * Can be overridden at build time via VITE_FIREBASE_* environment variables
 * (e.g., in Cloudflare Workers / Pages or Netlify build settings).
 */
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA2rsn6VUL4VtBuMC44diIBaHOzmPwfiaY',
  authDomain: 'resolute-hold-d40ks.firebaseapp.com',
  projectId: 'resolute-hold-d40ks',
  storageBucket: 'resolute-hold-d40ks.firebasestorage.app',
  messagingSenderId: '857176816166',
  appId: '1:857176816166:web:2e3db6f0c30513312844e7',
  firestoreDatabaseId: 'ai-studio-classflow-ea43a33f-29b5-4f0a-8425-1c01b6bacbd9',
};

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
  apiKey: resolveEnv(import.meta.env.VITE_FIREBASE_API_KEY, DEFAULT_FIREBASE_CONFIG.apiKey),
  authDomain: resolveEnv(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    DEFAULT_FIREBASE_CONFIG.authDomain
  ),
  projectId: resolveEnv(
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    DEFAULT_FIREBASE_CONFIG.projectId
  ),
  storageBucket: resolveEnv(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    DEFAULT_FIREBASE_CONFIG.storageBucket
  ),
  messagingSenderId: resolveEnv(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    DEFAULT_FIREBASE_CONFIG.messagingSenderId
  ),
  appId: resolveEnv(import.meta.env.VITE_FIREBASE_APP_ID, DEFAULT_FIREBASE_CONFIG.appId),
  firestoreDatabaseId: resolveEnv(
    import.meta.env.VITE_FIREBASE_DATABASE_ID,
    DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId
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

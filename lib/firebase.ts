import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth, type Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Falla con un mensaje claro si falta configuración, en lugar de conectarse a medias.
const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);
if (missing.length > 0) {
  throw new Error(
    `Falta configuración de Firebase (${missing.join(', ')}). ` +
      'Revisa .env.development o las variables de entorno de EAS.'
  );
}

// En React Native, Metro carga la versión de Firebase Auth que incluye esta función,
// pero los tipos publicados de `firebase/auth` no la declaran.
const { getReactNativePersistence } = FirebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

let app: FirebaseApp;
let auth: Auth;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  // En el celular la sesión se guarda en AsyncStorage para no pedir login cada vez que se abre la app.
  auth =
    Platform.OS === 'web'
      ? getAuth(app)
      : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} else {
  // Recarga en caliente: Auth ya fue inicializado.
  app = getApp();
  auth = getAuth(app);
}

export const db = getFirestore(app);
export const firebaseProjectId = firebaseConfig.projectId as string;
export { auth };

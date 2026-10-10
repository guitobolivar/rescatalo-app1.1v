/**
 * Rescátalo Venezuela - Firebase Configuration & Initialization
 * Exporta `auth` y `db` para uso en autenticación y Firestore en toda la aplicación.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, Firestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';
import { normalizeRole } from './types';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey !== '' &&
  firebaseConfig.apiKey !== 'AIzaSyYourFirebaseApiKeyHere' &&
  !firebaseConfig.apiKey.includes('FallbackKey')
);

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  if (getApps().length > 0) {
    app = getApp();
  } else if (isFirebaseConfigured) {
    app = initializeApp(firebaseConfig);
  } else {
    // Inicialización de respaldo para desarrollo local seguro
    app = initializeApp({
      apiKey: firebaseConfig.apiKey || 'AIzaSyDemoFallbackKey000000000000000000',
      authDomain: firebaseConfig.authDomain || 'rescatalo-venezuela.firebaseapp.com',
      projectId: firebaseConfig.projectId || 'rescatalo-venezuela',
      storageBucket: firebaseConfig.storageBucket || 'rescatalo-venezuela.appspot.com',
      appId: firebaseConfig.appId || '1:123456789012:web:fallback',
    });
  }

  const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID;
  db = databaseId && databaseId !== '(default)'
    ? getFirestore(app, databaseId)
    : getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.warn('Firebase init warning:', e);
  app = getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, auth, db };

/**
 * Función central de registro en Firebase Authentication y Firestore
 */
export const registerWithFirebase = async ({
  name,
  email,
  password,
  role,
  cedula,
  phone,
  vehicle,
}: {
  name: string;
  email: string;
  password: string;
  role: string;
  cedula?: string;
  phone?: string;
  vehicle?: any;
}) => {
  if (!isFirebaseConfigured) {
    console.info(
      'ℹ️ [Firebase Auth] Claves de Firebase no configuradas aún en .env. El usuario se registrará en el sistema local y bus en tiempo real.'
    );
    return { success: true, simulated: true };
  }

  try {
    // 1. Crear el usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Guardar el perfil y rol ('client', 'driver', 'admin') en Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name,
      email,
      phone: phone || '',
      cedula: cedula || null,
      role: normalizeRole(role), // 'client', 'driver', 'admin'
      vehicle: vehicle || null,
      createdAt: new Date().toISOString(),
    });

    console.log('¡Usuario registrado con éxito en Firebase!', user.uid);
    return { success: true, uid: user.uid };
  } catch (error: any) {
    console.error('Error al registrar en Firebase:', error);
    let message = 'Error al registrar en Firebase.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'Este correo electrónico ya está registrado en Firebase.';
    } else if (error.code === 'auth/weak-password') {
      message = 'La contraseña debe tener al menos 6 caracteres.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'El formato del correo electrónico es inválido.';
    } else if (error.message) {
      message = error.message;
    }
    return { success: false, message, error };
  }
};

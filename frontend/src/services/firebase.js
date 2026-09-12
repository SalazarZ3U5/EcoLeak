import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';
import { FIREBASE_CONFIG, isFirebaseConfigured } from './authConfig';

let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.warn('Firebase initialization error:', err);
  }
}

/**
 * Save / sync user profile to Firestore `users` collection (non-blocking with timeout)
 */
export async function syncUserToFirestore(user, additionalData = {}) {
  if (!db || !user?.uid) return null;
  try {
    const userRef = doc(db, 'users', user.uid);
    const payload = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || additionalData.name || 'Operator',
      photoURL: user.photoURL || '',
      role: additionalData.role || 'Plant Manager',
      facilityName: additionalData.facilityName || 'Registered Industrial Plant',
      authMethod: additionalData.authMethod || 'firebase-google',
      lastLoginAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    };
    if (additionalData.createdAt) {
      payload.createdAt = additionalData.createdAt;
    }
    
    // 1-second timeout guard: never stall the UI if Firestore is unprovisioned
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1000));
    await Promise.race([setDoc(userRef, payload, { merge: true }), timeout]);
    return payload;
  } catch (err) {
    console.warn('Firestore sync note (background):', err.message || err);
    return null;
  }
}

/**
 * Fetch user profile from Firestore with strict timeout guard
 */
export async function getUserProfileFromFirestore(uid) {
  if (!db || !uid) return null;
  try {
    const userRef = doc(db, 'users', uid);
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 800));
    const snap = await Promise.race([getDoc(userRef), timeout]);
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.warn('Firestore read note:', err.message || err);
    return null;
  }
}

/**
 * Sign in with email and password via Firebase Auth
 */
export async function loginWithFirebaseEmail(email, password) {
  if (!auth) throw new Error('Firebase is not initialized. Please verify your credentials in .env.');
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Register a new user with email and password via Firebase Auth
 */
export async function registerWithFirebaseEmail(email, password, displayName = '') {
  if (!auth) throw new Error('Firebase is not initialized. Please verify your credentials in .env.');
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName && userCredential.user) {
    try {
      await updateProfile(userCredential.user, { displayName });
    } catch (e) {
      console.warn('Could not update profile display name:', e);
    }
  }
  return userCredential.user;
}

/**
 * Sign in with Google popup via Firebase Auth
 */
export async function loginWithFirebaseGoogle() {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Auth is not configured.');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out from Firebase Auth
 */
export async function logoutFirebase() {
  if (auth) {
    await fbSignOut(auth);
  }
}

export { app, auth, db, googleProvider };


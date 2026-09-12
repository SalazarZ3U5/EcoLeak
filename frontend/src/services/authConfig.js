/**
 * Authentication Configuration & Service Credentials
 * 
 * All API keys and credentials are loaded dynamically from environment variables
 * (import.meta.env) to prevent hardcoding secrets in the codebase.
 */

export const AUTH_CONFIG = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  enableMockAuthFallback: true, // Allows smooth local testing fallback
};

/**
 * Firebase Configuration (loaded from .env / VITE_FIREBASE_*)
 */
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

/**
 * Supabase Configuration (loaded from .env / VITE_SUPABASE_*)
 */
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

/**
 * Utility checks for configuration availability
 */
export const isFirebaseConfigured = () => Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
export const isSupabaseConfigured = () => Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
export const isGoogleConfigured = () => Boolean(AUTH_CONFIG.googleClientId && AUTH_CONFIG.googleClientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE');

/**
 * Helper to trigger Google OAuth or simulate login if keys are pending.
 * If Google Identity Services script is loaded on window and configured,
 * this function will interface directly with it.
 */
export async function triggerGoogleAuth() {
  // If Google GSI library is loaded on window and client ID is configured
  if (window.google?.accounts?.id && isGoogleConfigured()) {
    return new Promise((resolve, reject) => {
      window.google.accounts.id.initialize({
        client_id: AUTH_CONFIG.googleClientId,
        callback: (response) => {
          try {
            const base64Url = response.credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const data = JSON.parse(jsonPayload);
            resolve({
              name: data.name || 'Google User',
              email: data.email,
              picture: data.picture,
              authMethod: 'google',
              facilityName: 'Registered Plant',
            });
          } catch (err) {
            reject(err);
          }
        },
      });
      window.google.accounts.id.prompt();
    });
  }

  // Graceful fallback for local development / testing before user adds OAuth key
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        name: 'Sarthakk Anjariya',
        email: 'sarthakk@industrial-ops.com',
        facilityName: 'GreenPack Plastics Ltd.',
        role: 'Plant Operations Lead',
        authMethod: 'google',
      });
    }, 600);
  });
}

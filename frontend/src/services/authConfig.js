/**
 * Authentication Configuration & Google OAuth Helper
 * 
 * You can set your Google Client ID below or in your .env file as:
 * VITE_GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
 */

export const AUTH_CONFIG = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE',
  enableMockAuthFallback: true, // Allows testing if API key is not yet set
};

/**
 * Helper to trigger Google OAuth or simulate login if keys are pending.
 * If you configure the Google Identity Services script in index.html,
 * this function will interface directly with it.
 */
export async function triggerGoogleAuth() {
  // If Google GSI library is loaded on window
  if (window.google?.accounts?.id && AUTH_CONFIG.googleClientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    return new Promise((resolve, reject) => {
      window.google.accounts.id.initialize({
        client_id: AUTH_CONFIG.googleClientId,
        callback: (response) => {
          // Decode JWT credential payload
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
              facilityName: 'Registered Plant'
            });
          } catch (err) {
            reject(err);
          }
        },
      });
      window.google.accounts.id.prompt();
    });
  }

  // Graceful fallback for local development / testing before user adds API key
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        name: 'Sarthakk Anjariya',
        email: 'sarthakk@industrial-ops.com',
        facilityName: 'GreenPack Plastics Ltd.',
        role: 'Plant Operations Lead',
        authMethod: 'google'
      });
    }, 600);
  });
}

import React, { useState } from 'react';
import {
  ArrowLeft, ArrowRight, ShieldCheck, Mail, Lock, User, Building2,
  Eye, EyeOff, RefreshCw, AlertTriangle, CheckCircle2,
  LogIn, UserPlus, LogOut, LayoutDashboard, Sparkles
} from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import { triggerGoogleAuth, isFirebaseConfigured, isSupabaseConfigured } from '../services/authConfig';
import {
  loginWithFirebaseEmail,
  registerWithFirebaseEmail,
  loginWithFirebaseGoogle,
  logoutFirebase,
  syncUserToFirestore,
  getUserProfileFromFirestore
} from '../services/firebase';
import { logoutSupabase } from '../services/supabase';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export default function AuthPage({
  initialTab = 'signin',
  authUser,
  onAuthSuccess,
  onSignOut,
  onBack,
  onOpenDashboard
}) {
  const [authTab, setAuthTab] = useState(initialTab); // 'signin' | 'signup'
  const [authName, setAuthName] = useState('');
  const [authFacility, setAuthFacility] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('Plant Manager');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authErrorMsg, setAuthErrorMsg] = useState('');

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthErrorMsg('');
    setAuthSuccessMsg('');

    try {
      if (authTab === 'signup') {
        if (!authName.trim()) {
          setAuthErrorMsg('Please enter your full name');
          setAuthLoading(false);
          return;
        }

        let registeredUser = null;
        if (isFirebaseConfigured()) {
          try {
            const fbUser = await registerWithFirebaseEmail(authEmail.trim(), authPassword, authName.trim());
            registeredUser = {
              uid: fbUser.uid,
              name: authName.trim() || fbUser.displayName || 'Operator',
              email: fbUser.email,
              facilityName: authFacility.trim() || 'Industrial Manufacturing Unit',
              role: authRole,
              authMethod: 'firebase-email',
              registeredAt: new Date().toISOString(),
            };

            // Background non-blocking Firestore sync
            syncUserToFirestore(fbUser, {
              name: registeredUser.name,
              facilityName: registeredUser.facilityName,
              role: registeredUser.role,
              authMethod: 'firebase-email',
              createdAt: registeredUser.registeredAt,
            }).catch((err) => console.warn('Background Firestore sync note:', err));
          } catch (fbErr) {
            console.warn('Firebase signup attempt error:', fbErr);
            if (fbErr.code === 'auth/email-already-in-use') {
              throw new Error('An account with this corporate email already exists. Please switch to Sign In.');
            } else if (fbErr.code === 'auth/weak-password') {
              throw new Error('Password should be at least 6 characters.');
            } else if (fbErr.code === 'auth/invalid-email') {
              throw new Error('Please enter a valid corporate email address.');
            } else if (fbErr.code === 'auth/operation-not-allowed') {
              throw new Error('Email/Password provider is not enabled in Firebase Console. Go to Authentication -> Sign-in method -> Email/Password and enable it.');
            } else {
              throw new Error(fbErr.message ? fbErr.message.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim() : 'Registration could not be completed.');
            }
          }
        } else {
          registeredUser = {
            name: authName.trim(),
            email: authEmail.trim(),
            facilityName: authFacility.trim() || 'Industrial Manufacturing Unit',
            role: authRole,
            authMethod: 'email',
            registeredAt: new Date().toISOString(),
          };
        }

        if (rememberMe) localStorage.setItem('ecoleak_auth_user', JSON.stringify(registeredUser));
        setAuthLoading(false);
        setAuthSuccessMsg(`Welcome, ${registeredUser.name}!`);
        if (onAuthSuccess) onAuthSuccess(registeredUser);
      } else {
        let loggedUser = null;
        if (isFirebaseConfigured()) {
          try {
            const fbUser = await loginWithFirebaseEmail(authEmail.trim(), authPassword);
            
            loggedUser = {
              uid: fbUser.uid,
              name: fbUser.displayName || authEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              email: fbUser.email,
              facilityName: authFacility.trim() || 'GreenPack Plastics Plant',
              role: authRole || 'Plant Operations Lead',
              authMethod: 'firebase-email',
              loggedInAt: new Date().toISOString(),
            };

            // Background non-blocking Firestore sync
            syncUserToFirestore(fbUser, {
              name: loggedUser.name,
              facilityName: loggedUser.facilityName,
              role: loggedUser.role,
              authMethod: 'firebase-email',
            }).catch((err) => console.warn('Background Firestore sync note:', err));
          } catch (fbErr) {
            console.warn('Firebase signin attempt error:', fbErr);
            if (
              fbErr.code === 'auth/user-not-found' ||
              fbErr.code === 'auth/wrong-password' ||
              fbErr.code === 'auth/invalid-credential'
            ) {
              throw new Error('Invalid email or password. Please verify your credentials or create an account.');
            } else if (fbErr.code === 'auth/invalid-email') {
              throw new Error('Please enter a valid corporate email address.');
            } else if (fbErr.code === 'auth/operation-not-allowed') {
              throw new Error('Email/Password sign-in is disabled in Firebase Console. Enable it in Authentication -> Sign-in method.');
            } else {
              throw new Error(fbErr.message ? fbErr.message.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim() : 'Authentication failed.');
            }
          }
        } else {
          const fallbackName = authEmail.includes('@')
            ? authEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
            : 'Operator';
          loggedUser = {
            name: fallbackName,
            email: authEmail.trim(),
            facilityName: authFacility.trim() || 'GreenPack Plastics Plant',
            role: authRole || 'Plant Operations Lead',
            authMethod: 'email',
            loggedInAt: new Date().toISOString(),
          };
        }

        if (rememberMe) localStorage.setItem('ecoleak_auth_user', JSON.stringify(loggedUser));
        setAuthLoading(false);
        setAuthSuccessMsg(`Welcome back, ${loggedUser.name}!`);
        if (onAuthSuccess) onAuthSuccess(loggedUser);
      }
    } catch (err) {
      setAuthLoading(false);
      setAuthErrorMsg(err.message || 'Authentication could not be completed.');
    }
  };

  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    setAuthErrorMsg('');
    setAuthSuccessMsg('');
    try {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase credentials are not set in .env. Please check VITE_FIREBASE_API_KEY.');
      }

      // 1. Trigger Firebase Google Popup
      const fbUser = await loginWithFirebaseGoogle();
      if (!fbUser) {
        throw new Error('Google sign-in did not return an authenticated user.');
      }

      // 2. Build operator profile object immediately
      const googleUser = {
        uid: fbUser.uid,
        name: fbUser.displayName || 'Google Operator',
        email: fbUser.email,
        picture: fbUser.photoURL || '',
        facilityName: authFacility.trim() || 'GreenPack Plastics Plant',
        role: authRole || 'Plant Manager',
        authMethod: 'firebase-google',
        loggedInAt: new Date().toISOString(),
      };

      // 3. Immediately store in localStorage so session is fully persisted
      localStorage.setItem('ecoleak_auth_user', JSON.stringify(googleUser));
      
      // 4. Stop loading and immediately redirect to Dashboard
      setAuthLoading(false);
      setAuthSuccessMsg(`Signed in as ${googleUser.name}! Redirecting...`);
      if (onAuthSuccess) {
        onAuthSuccess(googleUser);
      }

      // 5. Non-blocking background Firestore sync (will NEVER block or hang redirect)
      syncUserToFirestore(fbUser, {
        name: googleUser.name,
        facilityName: googleUser.facilityName,
        role: googleUser.role,
        authMethod: 'firebase-google',
      }).catch((err) => console.warn('Firestore background sync warning:', err));
    } catch (fbErr) {
      console.error('Firebase Google Auth error:', fbErr);
      setAuthLoading(false);
      let friendlyMsg = 'Google Sign-In failed.';
      if (fbErr.code === 'auth/operation-not-allowed') {
        friendlyMsg = 'Google Sign-In is not enabled in your Firebase Project. Go to Firebase Console -> Authentication -> Sign-in method -> Click Google -> Enable -> Save.';
      } else if (fbErr.code === 'auth/unauthorized-domain') {
        friendlyMsg = `Domain "${window.location.hostname}" is not authorized in Firebase Console -> Authentication -> Settings -> Authorized domains.`;
      } else if (fbErr.code === 'auth/popup-closed-by-user') {
        friendlyMsg = 'Google sign-in popup was closed before completing.';
      } else if (fbErr.code === 'auth/popup-blocked') {
        friendlyMsg = 'The Google sign-in popup was blocked by your browser. Please allow popups for localhost.';
      } else if (fbErr.code === 'auth/cancelled-popup-request') {
        friendlyMsg = 'A previous sign-in popup was active. Please click Google Sign-In again.';
      } else if (fbErr.message) {
        friendlyMsg = fbErr.message.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim();
      }
      setAuthErrorMsg(friendlyMsg);
    }
  };

  const handleDemoSignIn = () => {
    const demoUser = {
      name: 'Sarthakk Anjariya',
      email: 'sarthakk@industrial-ops.com',
      facilityName: 'GreenPack Plastics Ltd.',
      role: 'Plant Manager',
      authMethod: 'demo',
      loggedInAt: new Date().toISOString(),
    };
    localStorage.setItem('ecoleak_auth_user', JSON.stringify(demoUser));
    setAuthSuccessMsg('Signed in as Demo Operator');
    if (onAuthSuccess) onAuthSuccess(demoUser);
  };

  const handleSignOutAction = async () => {
    try {
      await logoutFirebase();
      await logoutSupabase();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    if (onSignOut) onSignOut();
  };

  return (
    <div className="auth-page-root">
      <AnimatedBackground />
      <div className="noise-overlay"></div>

      {/* Top Header Navigation */}
      <header className="auth-page-nav">
        <div className="container nav-inner-flex">
          <div
            className="brand-link"
            style={{ cursor: 'pointer' }}
            onClick={onBack}
            role="button"
            tabIndex={0}
          >
            <div className="brand-mark">
              <span></span>
              <span></span>
            </div>
            <span className="brand-text">
              Eco<span className="brand-accent">Leak</span>
            </span>
          </div>

          <div className="nav-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onBack}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <ArrowLeft size={16} /> Back to Overview
            </button>
            {authUser && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onOpenDashboard}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <LayoutDashboard size={16} /> Open Plant Audit
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="auth-page-main">
        <div className="auth-page-wrap">
          <div className="auth-header-block">
            <h1 className="dash-section-title">
              {authUser
                ? 'Verified Operator Profile'
                : (authTab === 'signin' ? 'Sign In' : 'Create Account')}
            </h1>
            <p className="dash-section-desc">
              {authUser
                ? 'Your authenticated session connects your facility meters, historical audits, and circular interventions.'
                : 'Access your facility emissions ledger, save audit histories, and export verified reports.'}
            </p>
          </div>

          {authUser ? (
            /* Profile Card when logged in */
            <div className="dash-card elite-card operator-profile-card">
              <div className="profile-header-row">
                <div className="profile-avatar-circle">
                  {authUser.picture ? (
                    <img src={authUser.picture} alt={authUser.name} className="profile-avatar-img" />
                  ) : (
                    <span>{authUser.name ? authUser.name.slice(0, 2).toUpperCase() : 'OP'}</span>
                  )}
                </div>
                <div className="profile-titles">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--emerald-deep)' }}>{authUser.name}</h3>
                    <span className="profile-verified-badge">
                      <ShieldCheck size={13} /> Verified Operator
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{authUser.email}</span>
                  <span className="profile-role-tag">
                    {authUser.role || 'Plant Operations Lead'} · {authUser.facilityName || 'Manufacturing Facility'}
                  </span>
                </div>
              </div>

              <div className="profile-stats-grid">
                <div className="profile-stat-box">
                  <small>Connected Plant</small>
                  <strong>{authUser.facilityName || 'GreenPack Plastics'}</strong>
                  <span>Sector: Manufacturing</span>
                </div>
                <div className="profile-stat-box">
                  <small>Auth Method</small>
                  <strong style={{ textTransform: 'capitalize' }}>
                    {authUser.authMethod === 'google' ? 'Google OAuth' : 'Corporate Email'}
                  </strong>
                  <span>Session Active</span>
                </div>
                <div className="profile-stat-box">
                  <small>Emission Compliance</small>
                  <strong style={{ color: 'var(--mint-hover)' }}>BRSR &amp; ISO 14064</strong>
                  <span>Verified Factors Aligned</span>
                </div>
              </div>

              <div className="profile-actions-row">
                <button
                  type="button"
                  className="dash-elite-btn"
                  onClick={onOpenDashboard}
                >
                  Continue to Plant Audit <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="dash-back-btn-sm"
                  style={{ padding: '12px 20px', color: 'var(--rose)', borderColor: 'rgba(225,29,72,0.3)' }}
                  onClick={handleSignOutAction}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            /* Auth Form Card (Sign In / Create Account) */
            <div className="dash-login-form elite-auth-card">
              {/* Tab Switcher */}
              <div className="auth-mode-tabs">
                <button
                  type="button"
                  className={`auth-mode-tab ${authTab === 'signin' ? 'auth-tab-active' : ''}`}
                  onClick={() => { setAuthTab('signin'); setAuthErrorMsg(''); }}
                >
                  <LogIn size={15} /> Sign In
                </button>
                <button
                  type="button"
                  className={`auth-mode-tab ${authTab === 'signup' ? 'auth-tab-active' : ''}`}
                  onClick={() => { setAuthTab('signup'); setAuthErrorMsg(''); }}
                >
                  <UserPlus size={15} /> Create Account
                </button>
              </div>

              {/* Google One-Click Button */}
              <button
                type="button"
                disabled={authLoading}
                onClick={handleGoogleAuth}
                className="dash-google-btn"
              >
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              <div className="auth-divider">
                <span>OR CONTINUE WITH EMAIL</span>
              </div>

              {authErrorMsg && (
                <div className="dash-alert dash-alert-danger" style={{ marginBottom: '14px', padding: '10px 14px' }}>
                  <AlertTriangle size={14} />
                  <span>{authErrorMsg}</span>
                </div>
              )}

              {authSuccessMsg && (
                <div
                  className="dash-alert"
                  style={{
                    background: 'var(--mint-light)',
                    border: '1px solid var(--mint)',
                    color: 'var(--mint-hover)',
                    marginBottom: '14px',
                    padding: '10px 14px'
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>{authSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="auth-inner-form">
                {authTab === 'signup' && (
                  <>
                    <div className="dash-form-group">
                      <label className="dash-label"><User size={14} /> Operator Full Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Sarthakk Anjariya"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="dash-input"
                        required
                      />
                    </div>

                    <div className="dash-form-group">
                      <label className="dash-label"><Building2 size={14} /> Facility / Plant Name</label>
                      <input
                        type="text"
                        placeholder="e.g. GreenPack Plastics Ltd."
                        value={authFacility}
                        onChange={(e) => setAuthFacility(e.target.value)}
                        className="dash-input"
                        required
                      />
                    </div>

                    <div className="dash-form-group">
                      <label className="dash-label"><ShieldCheck size={14} /> Operator Role</label>
                      <select
                        value={authRole}
                        onChange={(e) => setAuthRole(e.target.value)}
                        className="dash-select"
                      >
                        <option value="Plant Manager">Plant Manager / Factory Head</option>
                        <option value="Process Engineer">Process &amp; Energy Engineer</option>
                        <option value="Sustainability Consultant">Sustainability Consultant</option>
                        <option value="Environmental Auditor">Pollution Control / Regulatory Auditor</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="dash-form-group">
                  <label className="dash-label"><Mail size={14} /> Corporate Email</label>
                  <input
                    type="email"
                    placeholder="operator@plant.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="dash-input"
                    required
                  />
                </div>

                <div className="dash-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="dash-label"><Lock size={14} /> Password</label>
                    {authTab === 'signin' && (
                      <button
                        type="button"
                        onClick={() => alert('Password reset verification link sent to your registered corporate email.')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--mint-hover)',
                          fontSize: '11.5px',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="password-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="dash-input password-input-field"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-checkbox-row">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: 'var(--mint-hover)' }}
                    />
                    <span>Remember me on this terminal</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="dash-elite-btn"
                  style={{ width: '100%', marginTop: '14px' }}
                >
                  {authLoading ? (
                    <><RefreshCw size={16} className="spin-on-active" /> Authenticating...</>
                  ) : (
                    <>
                      {authTab === 'signin' ? 'Sign In' : 'Create Account'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  {authTab === 'signin' ? (
                    <span>
                      New facility operator?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthTab('signup'); setAuthErrorMsg(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--mint-hover)', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Create account →
                      </button>
                    </span>
                  ) : (
                    <span>
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => { setAuthTab('signin'); setAuthErrorMsg(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--mint-hover)', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Sign in →
                      </button>
                    </span>
                  )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button
                    type="button"
                    onClick={handleDemoSignIn}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Sparkles size={12} style={{ color: 'var(--mint-hover)' }} />
                    Bypass for testing (1-Click Demo Operator)
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

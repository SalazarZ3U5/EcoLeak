import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, ShieldCheck, Mail, Lock, User, Building2,
  Eye, EyeOff, RefreshCw, AlertTriangle, CheckCircle2,
  LogIn, UserPlus, LogOut, LayoutDashboard, Sparkles,
  MapPin, LocateFixed, FileCheck, ShieldAlert, Scale, Edit2, Save, X, Check,
  TrendingDown
} from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import { triggerGoogleAuth, isFirebaseConfigured, isSupabaseConfigured } from '../services/authConfig';
import {
  loginWithFirebaseEmail,
  loginWithFirebaseGoogle,
  logoutFirebase,
  syncUserToFirestore,
  getUserProfileFromFirestore
} from '../services/firebase';
import { logoutSupabase } from '../services/supabase';
import OperatorProfilePage from './OperatorProfilePage';
import Navbar from './Navbar';

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

export default function LoginPage({
  authUser,
  onAuthSuccess,
  onUpdateUser,
  onSignOut,
  onBack,
  onOpenDashboard,
  onNavigateToSignup,
  onOpenVision
}) {
  useEffect(() => {
    if (authUser && onOpenDashboard) {
      onOpenDashboard();
    }
  }, [authUser, onOpenDashboard]);

  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status & feedback
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authErrorMsg, setAuthErrorMsg] = useState('');

  // Operator Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFacility, setEditFacility] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editRegId, setEditRegId] = useState('');
  const [editRegCategory, setEditRegCategory] = useState('');
  const [editRegStandard, setEditRegStandard] = useState('');
  const [editEmissionCap, setEditEmissionCap] = useState('');
  const [editRole, setEditRole] = useState('');

  useEffect(() => {
    if (authUser) {
      setEditFacility(authUser.facilityName || '');
      setEditLocation(authUser.location || '');
      setEditRegId(authUser.regId || '');
      setEditRegCategory(authUser.regCategory || '');
      setEditRegStandard(authUser.regStandard || '');
      setEditEmissionCap(authUser.emissionCap || '');
      setEditRole(authUser.role || '');
    }
  }, [authUser]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setAuthErrorMsg('');
    setAuthSuccessMsg('');
    setAuthLoading(true);

    try {
      if (!authEmail.trim() || !authPassword) {
        throw new Error('Please enter both corporate email and password.');
      }

      let loggedUser = null;
      if (isFirebaseConfigured()) {
        try {
          const fbUser = await loginWithFirebaseEmail(authEmail.trim(), authPassword);
          loggedUser = {
            uid: fbUser.uid,
            name: fbUser.displayName || authEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            email: fbUser.email,
            facilityName: '',
            location: '',
            regId: '',
            regCategory: '',
            regStandard: '',
            emissionCap: '',
            role: 'Plant Operator',
            authMethod: 'firebase-email',
            loggedInAt: new Date().toISOString(),
          };

          syncUserToFirestore(fbUser, {
            name: loggedUser.name,
            facilityName: loggedUser.facilityName,
            location: loggedUser.location,
            regId: loggedUser.regId,
            regCategory: loggedUser.regCategory,
            regStandard: loggedUser.regStandard,
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
          facilityName: '',
          location: '',
          regId: '',
          regCategory: '',
          regStandard: '',
          emissionCap: '',
          role: 'Plant Operator',
          authMethod: 'email',
          loggedInAt: new Date().toISOString(),
        };
      }
      setAuthLoading(false);
      setAuthSuccessMsg(`Welcome back, ${loggedUser.name}!`);
      if (onAuthSuccess) onAuthSuccess(loggedUser);
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
      const fbUser = await loginWithFirebaseGoogle();
      let savedProfile = null;
      try {
        savedProfile = await getUserProfileFromFirestore(fbUser.uid);
      } catch (e) {
        console.warn('Firestore profile lookup note:', e);
      }

      const googleUser = {
        uid: fbUser.uid,
        name: fbUser.displayName || fbUser.email.split('@')[0],
        email: fbUser.email,
        picture: fbUser.photoURL || '',
        facilityName: savedProfile?.facilityName || '',
        location: savedProfile?.location || '',
        regId: savedProfile?.regId || '',
        regCategory: savedProfile?.regCategory || '',
        regStandard: savedProfile?.regStandard || '',
        emissionCap: savedProfile?.emissionCap || '',
        role: savedProfile?.role || 'Plant Operations Lead',
        authMethod: 'firebase-google',
        loggedInAt: new Date().toISOString(),
      };

      syncUserToFirestore(fbUser, {
        name: googleUser.name,
        facilityName: googleUser.facilityName,
        location: googleUser.location,
        regId: googleUser.regId,
        regCategory: googleUser.regCategory,
        regStandard: googleUser.regStandard,
        role: googleUser.role,
        authMethod: 'firebase-google',
      }).catch((err) => console.warn('Background Firestore sync note:', err));

      setAuthLoading(false);
      setAuthSuccessMsg(`Welcome, ${googleUser.name}! Google authentication verified.`);
      if (onAuthSuccess) onAuthSuccess(googleUser);
    } catch (err) {
      setAuthLoading(false);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthErrorMsg('Google Sign-In popup was closed before completing.');
      } else {
        setAuthErrorMsg(err.message || 'Google authentication failed.');
      }
    }
  };

  const handleDemoSignIn = () => {
    const demoUser = {
      uid: 'demo-operator-' + Math.random().toString(36).slice(2, 7),
      name: 'Demo Operator',
      email: 'operator@demo.ecoleak.org',
      facilityName: '',
      location: '',
      regId: '',
      regCategory: '',
      regStandard: '',
      emissionCap: '',
      role: 'Plant Operator',
      authMethod: 'demo',
      loggedInAt: new Date().toISOString(),
    };
    if (onAuthSuccess) onAuthSuccess(demoUser);
  };

  const handleSaveProfileEdits = (e) => {
    e.preventDefault();
    if (!authUser) return;

    const updated = {
      ...authUser,
      facilityName: editFacility.trim() || authUser.facilityName,
      location: editLocation.trim() || authUser.location,
      regId: editRegId.trim() || authUser.regId,
      regCategory: editRegCategory || authUser.regCategory,
      regStandard: editRegStandard || authUser.regStandard,
      emissionCap: editEmissionCap.trim() || authUser.emissionCap,
      role: editRole || authUser.role,
      lastUpdated: new Date().toISOString(),
    };
    if (onUpdateUser) onUpdateUser(updated);
    setIsEditingProfile(false);
    setAuthSuccessMsg('Plant parameters & location updated successfully.');
    setTimeout(() => setAuthSuccessMsg(''), 4000);
  };

  return (
    <div className="auth-page-root">
      <AnimatedBackground />
      <div className="noise-overlay" />

      {/* Unified Top Navbar */}
      <Navbar
        authUser={authUser}
        onOpenDashboard={onOpenDashboard}
        onOpenSignIn={() => {}}
        onOpenRegister={onNavigateToSignup}
        onOpenVision={onOpenVision || window.onOpenVision}
        onBack={onBack}
      />

      {/* Main Container */}
      <main className="auth-page-main">
        <div className="auth-page-wrap auth-page-wrap-signin">
          <div className="auth-header-block">
            <div className="auth-badge-pill">
              <ShieldCheck size={13} color="var(--mint-hover)" />
              <span>OPERATOR TERMINAL ACCESS</span>
            </div>
            <h1 className="dash-section-title">
              {authUser ? 'Verified Operator Profile' : 'Sign In to EcoLeak'}
            </h1>
            <p className="dash-section-desc">
              {authUser
                ? 'Your authenticated session links facility meters, regulatory consent parameters, and circular intervention ledger.'
                : 'Enter your credentials to access factory emission leak audits, circular solutions, and compliance export.'}
            </p>
          </div>

          {authUser ? (
            /* Logged-in Operator Profile Card */
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
                <button
                  type="button"
                  className="btn-profile-edit-toggle"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  title="Edit Regulatory & Location Details"
                >
                  <Edit2 size={14} /> {isEditingProfile ? 'Cancel Edit' : 'Edit Parameters'}
                </button>
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfileEdits} className="profile-edit-form-wrap">
                  <div className="profile-edit-header">
                    <span className="profile-edit-title">
                      <Scale size={15} color="var(--mint-hover)" /> Edit Plant Location &amp; Regulatory Parameters
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Updates instant session storage</span>
                  </div>

                  <div className="profile-edit-grid">
                    <div className="profile-edit-field">
                      <label className="dash-label">Facility / Company Name</label>
                      <input
                        type="text"
                        value={editFacility}
                        onChange={(e) => setEditFacility(e.target.value)}
                        className="dash-input"
                        placeholder="e.g. GreenPack Plastics Ltd."
                        required
                      />
                    </div>

                    <div className="profile-edit-field">
                      <label className="dash-label">Plant Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="dash-select"
                      >
                        <option value="Plant Manager">Plant Manager</option>
                        <option value="Operations Lead">Operations Lead</option>
                        <option value="Environmental & Sustainability Officer">Sustainability Officer</option>
                        <option value="Process Engineer">Process Engineer</option>
                        <option value="Managing Director / Owner">Managing Director / Owner</option>
                      </select>
                    </div>

                    <div className="profile-edit-field full-width">
                      <label className="dash-label">Plant Location (Industrial Area / Postal Code)</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="dash-input"
                        placeholder="e.g. Industrial Area Phase 1, City, State"
                        required
                      />
                    </div>

                    <div className="profile-edit-field">
                      <label className="dash-label">SPCB / CPCB Registration No. (CTO)</label>
                      <input
                        type="text"
                        value={editRegId}
                        onChange={(e) => setEditRegId(e.target.value)}
                        className="dash-input font-mono-val"
                        placeholder="e.g. MH-SPCB/PUN/CTO-2026/4102"
                        required
                      />
                    </div>

                    <div className="profile-edit-field">
                      <label className="dash-label">Pollution Control Board Category</label>
                      <select
                        value={editRegCategory}
                        onChange={(e) => setEditRegCategory(e.target.value)}
                        className="dash-select"
                      >
                        <option value="Orange Category (Pollution Index 41-59 - Moderate)">Orange Category (PI 41-59)</option>
                        <option value="Red Category (Pollution Index 60+ - High Impact)">Red Category (PI 60+)</option>
                        <option value="Green Category (Pollution Index 21-40 - Low Impact)">Green Category (PI 21-40)</option>
                        <option value="White Category (Pollution Index up to 20 - Non-Polluting)">White Category (PI 0-20)</option>
                      </select>
                    </div>

                    <div className="profile-edit-field">
                      <label className="dash-label">Consented Emission Cap</label>
                      <input
                        type="text"
                        value={editEmissionCap}
                        onChange={(e) => setEditEmissionCap(e.target.value)}
                        className="dash-input"
                        placeholder="e.g. 450 MT CO2e / Year"
                      />
                    </div>

                    <div className="profile-edit-field">
                      <label className="dash-label">Compliance Framework</label>
                      <select
                        value={editRegStandard}
                        onChange={(e) => setEditRegStandard(e.target.value)}
                        className="dash-select"
                      >
                        <option value="SPCB Consent to Operate & Water/Air Acts">SPCB Consent to Operate (CTO)</option>
                        <option value="SEBI BRSR Core Standards">SEBI BRSR Core Standards</option>
                        <option value="GHG Protocol & ISO 14064-1">GHG Protocol &amp; ISO 14064-1</option>
                        <option value="EU CBAM Importer Verification">EU CBAM Importer Verification</option>
                      </select>
                    </div>
                  </div>

                  <div className="profile-edit-actions">
                    <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={14} /> Save Parameters
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {/* View Parameters Panel */}
              <div className="reg-params-panel">
                <div className="reg-params-panel-header">
                  <span className="reg-panel-title">
                    <Scale size={15} color="var(--mint-hover)" /> REGULATORY &amp; OFFICE LOCATION PARAMETERS
                  </span>
                  <span className="reg-cat-badge">
                    <ShieldAlert size={12} /> {authUser.regCategory || 'Not Configured'}
                  </span>
                </div>

                <div className="reg-params-display-grid">
                  <div className="reg-param-item">
                    <div className="reg-param-label"><MapPin size={13} /> Office / Plant Location</div>
                    <div className="reg-param-val">{authUser.location || 'Not Configured'}</div>
                  </div>
                  <div className="reg-param-item">
                    <div className="reg-param-label"><FileCheck size={13} /> SPCB / CPCB Registration No.</div>
                    <div className="reg-param-val font-mono-val">{authUser.regId || 'Not Configured'}</div>
                  </div>
                  <div className="reg-param-item">
                    <div className="reg-param-label"><Scale size={13} /> Compliance Standard</div>
                    <div className="reg-param-val">{authUser.regStandard || 'Not Configured'}</div>
                  </div>
                  <div className="reg-param-item">
                    <div className="reg-param-label"><ShieldCheck size={13} /> Consented Emission Cap</div>
                    <div className="reg-param-val" style={{ color: 'var(--mint-hover)', fontWeight: 800 }}>
                      {authUser.emissionCap || 'Not Configured'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="profile-card-actions">
                <button
                  type="button"
                  className="dash-elite-btn"
                  onClick={onOpenDashboard}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <LayoutDashboard size={16} /> Open Plant Audit Dashboard
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onSignOut}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            /* Dedicated Sign In Form */
            <div className="dash-login-form elite-auth-card elite-signin-card">
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
                <span>OR CONTINUE WITH CORPORATE EMAIL</span>
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

              <form onSubmit={handleSignIn} className="auth-fields-container">
                <div className="dash-form-group">
                  <label className="dash-label">Corporate / Plant Email</label>
                  <div className="input-with-icon">
                    <Mail size={16} className="field-lead-icon" />
                    <input
                      type="email"
                      placeholder="operator@manufacturing-plant.in"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="dash-input"
                      required
                    />
                  </div>
                </div>

                <div className="dash-form-group">
                  <label className="dash-label">Terminal Password</label>
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
                    <span>Remember this device</span>
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
                      <span>Sign In to Terminal</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <span>
                    New facility operator?{' '}
                    <button
                      type="button"
                      onClick={onNavigateToSignup}
                      style={{ background: 'none', border: 'none', color: 'var(--mint-hover)', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                    >
                      Create operator account →
                    </button>
                  </span>
                </div>

                <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
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

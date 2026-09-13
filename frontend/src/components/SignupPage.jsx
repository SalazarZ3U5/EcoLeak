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
  registerWithFirebaseEmail,
  loginWithFirebaseGoogle,
  logoutFirebase,
  syncUserToFirestore,
  getUserProfileFromFirestore
} from '../services/firebase';
import { logoutSupabase } from '../services/supabase';
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

export default function SignupPage({
  authUser,
  onAuthSuccess,
  onUpdateUser,
  onSignOut,
  onBack,
  onOpenDashboard,
  onNavigateToLogin,
  onOpenVision
}) {
  // Registration credentials
  const [authName, setAuthName] = useState('');
  const [authFacility, setAuthFacility] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('Plant Manager');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Regulatory Parameters
  const [authRegId, setAuthRegId] = useState('');
  const [authRegCategory, setAuthRegCategory] = useState('Orange Category (Pollution Index 41-59 - Moderate)');
  const [authRegStandard, setAuthRegStandard] = useState('SPCB Consent to Operate & Water/Air Acts');
  const [authEmissionCap, setAuthEmissionCap] = useState('450 MT CO2e / Year');

  // Plant Location (auto-detect or manual)
  const [authLocation, setAuthLocation] = useState('');
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [locationStatusMsg, setLocationStatusMsg] = useState('');
  const [locationError, setLocationError] = useState('');

  // Status & feedback
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');
  const [authErrorMsg, setAuthErrorMsg] = useState('');

  // Auto-detect browser geolocation
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationDetecting(true);
    setLocationError('');
    setLocationStatusMsg('Acquiring GPS coordinates for industrial zone mapping...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const industrialSub = addr.industrial || addr.suburb || addr.neighbourhood || addr.city_district || 'Industrial Area';
            const city = addr.city || addr.town || addr.state_district || 'Pune';
            const state = addr.state || 'Maharashtra';
            const postcode = addr.postcode ? ` ${addr.postcode}` : '';
            const detectedStr = `${industrialSub}, ${city}, ${state}${postcode} (Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)})`;

            setAuthLocation(detectedStr);
            setLocationSuccess(true);
            setLocationStatusMsg(`Location verified via GPS (${city}, ${state})`);
          } else {
            setAuthLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (GPS Verified)`);
            setLocationSuccess(true);
            setLocationStatusMsg('GPS Coordinates saved.');
          }
        } catch {
          setAuthLocation(`Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (GPS Acquired)`);
          setLocationSuccess(true);
          setLocationStatusMsg('GPS coordinates captured.');
        } finally {
          setLocationDetecting(false);
        }
      },
      (err) => {
        setLocationDetecting(false);
        setLocationSuccess(false);
        setLocationError(`Location detection skipped (${err.message}). You can type the industrial zone manually.`);
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setAuthErrorMsg('');
    setAuthSuccessMsg('');
    setAuthLoading(true);

    try {
      if (!authEmail.trim() || !authPassword) {
        throw new Error('Please enter corporate email and password.');
      }
      if (!authName.trim()) {
        throw new Error('Please enter the facility operator full name.');
      }
      if (authPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      let registeredUser = null;
      if (isFirebaseConfigured()) {
        try {
          const fbUser = await registerWithFirebaseEmail(authEmail.trim(), authPassword, authName.trim());
          registeredUser = {
            uid: fbUser.uid,
            name: authName.trim(),
            email: fbUser.email,
            facilityName: authFacility.trim() || '',
            location: authLocation.trim() || '',
            regId: authRegId.trim() || '',
            regCategory: authRegCategory || '',
            regStandard: authRegStandard || '',
            emissionCap: authEmissionCap.trim() || '',
            role: authRole || 'Plant Operator',
            authMethod: 'firebase-email',
            registeredAt: new Date().toISOString(),
          };

          syncUserToFirestore(fbUser, {
            name: registeredUser.name,
            facilityName: registeredUser.facilityName,
            location: registeredUser.location,
            regId: registeredUser.regId,
            regCategory: registeredUser.regCategory,
            regStandard: registeredUser.regStandard,
            role: registeredUser.role,
            authMethod: 'firebase-email',
          }).catch((err) => console.warn('Background Firestore sync note:', err));
        } catch (fbErr) {
          console.warn('Firebase signup error:', fbErr);
          if (fbErr.code === 'auth/email-already-in-use') {
            throw new Error('An account with this email already exists. Please switch to Sign In.');
          } else if (fbErr.code === 'auth/weak-password') {
            throw new Error('Password should be at least 6 characters.');
          } else {
            throw new Error(fbErr.message ? fbErr.message.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim() : 'Registration could not be completed.');
          }
        }
      } else {
        registeredUser = {
          name: authName.trim(),
          email: authEmail.trim(),
          facilityName: authFacility.trim() || '',
          location: authLocation.trim() || '',
          regId: authRegId.trim() || '',
          regCategory: authRegCategory || '',
          regStandard: authRegStandard || '',
          emissionCap: authEmissionCap.trim() || '',
          role: authRole || 'Plant Operator',
          authMethod: 'email',
          registeredAt: new Date().toISOString(),
        };
      }
      setAuthLoading(false);
      setAuthSuccessMsg(`Welcome, ${registeredUser.name}! Account registered with regulatory parameters.`);
      if (onAuthSuccess) onAuthSuccess(registeredUser);
    } catch (err) {
      setAuthLoading(false);
      setAuthErrorMsg(err.message || 'Registration could not be completed.');
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
        name: fbUser.displayName || authName.trim() || fbUser.email.split('@')[0],
        email: fbUser.email,
        picture: fbUser.photoURL || '',
        facilityName: savedProfile?.facilityName || authFacility.trim() || '',
        location: savedProfile?.location || authLocation.trim() || '',
        regId: savedProfile?.regId || authRegId.trim() || '',
        regCategory: savedProfile?.regCategory || authRegCategory || '',
        regStandard: savedProfile?.regStandard || authRegStandard || '',
        emissionCap: savedProfile?.emissionCap || authEmissionCap.trim() || '',
        role: savedProfile?.role || authRole || 'Plant Operations Lead',
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
      setAuthSuccessMsg(`Welcome, ${googleUser.name}! Account registered with Google.`);
      if (onAuthSuccess) onAuthSuccess(googleUser);
    } catch (err) {
      setAuthLoading(false);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthErrorMsg('Google Sign-In popup was closed before completing.');
      } else {
        setAuthErrorMsg(err.message || 'Google registration failed.');
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

  return (
    <div className="auth-page-root">
      <AnimatedBackground />
      <div className="noise-overlay" />

      {/* Unified Top Navbar */}
      <Navbar
        authUser={authUser}
        onOpenDashboard={onOpenDashboard}
        onOpenSignIn={onNavigateToLogin}
        onOpenRegister={() => {}}
        onOpenVision={onOpenVision || window.onOpenVision}
        onBack={onBack}
      />

      {/* Main Container */}
      <main className="auth-page-main">
        <div className="auth-page-wrap">
          <div className="auth-header-block">
            <div className="auth-badge-pill">
              <Building2 size={13} color="var(--mint-hover)" />
              <span>FACILITY ONBOARDING &amp; REGISTRATION</span>
            </div>
            <h1 className="dash-section-title">Create Operator Account</h1>
            <p className="dash-section-desc">
              Register your manufacturing facility, configure state pollution control board parameters, and configure baseline emission caps.
            </p>
          </div>

          {/* Dedicated Registration Form Card */}
          <div className="dash-login-form elite-auth-card">
            {/* Google One-Click Button */}
            <button
              type="button"
              disabled={authLoading}
              onClick={handleGoogleAuth}
              className="dash-google-btn"
            >
              <GoogleIcon />
              <span>Sign up with Google</span>
            </button>

            <div className="auth-divider">
              <span>OR REGISTER WITH FACILITY DETAILS</span>
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

            <form onSubmit={handleSignUp} className="auth-fields-container">
              {/* Section 1: Identity */}
              <div className="auth-section-divider">
                <User size={13} />
                <span>Operator &amp; Facility Identity</span>
              </div>

              <div className="dash-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="dash-form-group">
                  <label className="dash-label">Operator Full Name</label>
                  <div className="input-with-icon">
                    <User size={16} className="field-lead-icon" />
                    <input
                      type="text"
                      placeholder="e.g. Kavin Jindal"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="dash-input"
                      required
                    />
                  </div>
                </div>

                <div className="dash-form-group">
                  <label className="dash-label">Plant Role</label>
                  <select
                    value={authRole}
                    onChange={(e) => setAuthRole(e.target.value)}
                    className="dash-select"
                  >
                    <option value="Plant Manager">Plant Manager</option>
                    <option value="Operations Lead">Operations Lead</option>
                    <option value="Sustainability Officer">Sustainability Officer</option>
                    <option value="Process Engineer">Process Engineer</option>
                    <option value="Managing Director / Owner">Managing Director / Owner</option>
                  </select>
                </div>
              </div>

              <div className="dash-form-group">
                <label className="dash-label">Connected Plant / Company Name</label>
                <div className="input-with-icon">
                  <Building2 size={16} className="field-lead-icon" />
                  <input
                    type="text"
                    placeholder="e.g. GreenPack Plastics Ltd."
                    value={authFacility}
                    onChange={(e) => setAuthFacility(e.target.value)}
                    className="dash-input"
                    required
                  />
                </div>
              </div>

              {/* Section 2: Compliance & Location */}
              <div className="auth-section-divider">
                <Scale size={13} />
                <span>Location &amp; Regulatory Parameters</span>
              </div>

              <div className="dash-form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="dash-label" style={{ margin: 0 }}>Office / Plant Location</label>
                  <button
                    type="button"
                    onClick={handleAutoDetectLocation}
                    disabled={locationDetecting}
                    className="btn-gps-autodetect"
                    title="Auto-detect current GPS location for manufacturing facility"
                  >
                    <LocateFixed size={12} className={locationDetecting ? 'spin-on-active' : ''} />
                    <span>{locationDetecting ? 'Detecting GPS...' : 'Auto-Detect GPS'}</span>
                  </button>
                </div>
                <div className="input-with-icon">
                  <MapPin size={16} className="field-lead-icon" />
                  <input
                    type="text"
                    placeholder="e.g. Industrial Area Phase 1, City, State"
                    value={authLocation}
                    onChange={(e) => { setAuthLocation(e.target.value); setLocationSuccess(false); }}
                    className="dash-input"
                    required
                  />
                </div>
                {locationStatusMsg && (
                  <span className="location-success-msg">
                    <CheckCircle2 size={11} /> {locationStatusMsg}
                  </span>
                )}
                {locationError && (
                  <span className="location-err-msg">
                    <AlertTriangle size={11} /> {locationError}
                  </span>
                )}
              </div>

              <div className="dash-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="dash-form-group">
                  <label className="dash-label">SPCB / CPCB Registration (CTO No.)</label>
                  <div className="input-with-icon">
                    <FileCheck size={16} className="field-lead-icon" />
                    <input
                      type="text"
                      placeholder="e.g. MH-SPCB/PUN/CTO-2026/4102"
                      value={authRegId}
                      onChange={(e) => setAuthRegId(e.target.value)}
                      className="dash-input font-mono-val"
                      required
                    />
                  </div>
                </div>

                <div className="dash-form-group">
                  <label className="dash-label">Pollution Category</label>
                  <select
                    value={authRegCategory}
                    onChange={(e) => setAuthRegCategory(e.target.value)}
                    className="dash-select"
                  >
                    <option value="Orange Category (Pollution Index 41-59 - Moderate)">Orange Category (PI 41-59 - Moderate)</option>
                    <option value="Red Category (Pollution Index 60+ - High Impact)">Red Category (PI 60+ - High Impact)</option>
                    <option value="Green Category (Pollution Index 21-40 - Low Impact)">Green Category (PI 21-40 - Low Impact)</option>
                    <option value="White Category (Pollution Index up to 20 - Non-Polluting)">White Category (PI 0-20 - Clean)</option>
                  </select>
                </div>
              </div>

              <div className="dash-form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="dash-form-group">
                  <label className="dash-label">Consented Emission Ceiling</label>
                  <input
                    type="text"
                    placeholder="e.g. 450 MT CO2e / Year"
                    value={authEmissionCap}
                    onChange={(e) => setAuthEmissionCap(e.target.value)}
                    className="dash-input"
                  />
                </div>

                <div className="dash-form-group">
                  <label className="dash-label">Compliance Framework</label>
                  <select
                    value={authRegStandard}
                    onChange={(e) => setAuthRegStandard(e.target.value)}
                    className="dash-select"
                  >
                    <option value="SPCB Consent to Operate & Water/Air Acts">SPCB Consent to Operate</option>
                    <option value="SEBI BRSR Core Standards">SEBI BRSR Core Standards</option>
                    <option value="GHG Protocol & ISO 14064-1">GHG Protocol &amp; ISO 14064</option>
                    <option value="EU CBAM Importer Verification">EU CBAM Importer Verification</option>
                  </select>
                </div>
              </div>

              {/* Section 3: Credentials */}
              <div className="auth-section-divider">
                <Lock size={13} />
                <span>Account Credentials</span>
              </div>

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
                <label className="dash-label">Terminal Password (Min. 6 Characters)</label>
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
                  <><RefreshCw size={16} className="spin-on-active" /> Creating Account...</>
                ) : (
                  <>
                    <span>Create Operator Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={onNavigateToLogin}
                    style={{ background: 'none', border: 'none', color: 'var(--mint-hover)', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}
                  >
                    Sign in to your account →
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
        </div>
      </main>
    </div>
  );
}

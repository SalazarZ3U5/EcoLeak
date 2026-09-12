import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, ShieldCheck, Mail, Lock, User, Building2,
  Eye, EyeOff, RefreshCw, AlertTriangle, CheckCircle2,
  LogIn, UserPlus, LogOut, LayoutDashboard, Sparkles,
  MapPin, LocateFixed, FileCheck, ShieldAlert, Scale, Edit2, Save, X, Check,
  TrendingDown
} from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import EcoLeakLogo from './EcoLeakLogo';
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
  onUpdateUser,
  onSignOut,
  onBack,
  onOpenDashboard
}) {
  const [authTab, setAuthTab] = useState(initialTab); // 'signin' | 'signup'

  // User credentials state
  const [authName, setAuthName] = useState('');
  const [authFacility, setAuthFacility] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authRole, setAuthRole] = useState('Plant Manager');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Regulatory Parameters (reg params)
  const [authRegId, setAuthRegId] = useState('');
  const [authRegCategory, setAuthRegCategory] = useState('Orange Category (Pollution Index 41-59 - Moderate)');
  const [authRegStandard, setAuthRegStandard] = useState('SPCB Consent to Operate & Water/Air Acts');
  const [authEmissionCap, setAuthEmissionCap] = useState('450 MT CO2e / Year');

  // Office / Plant Location (auto-detect or manual)
  const [authLocation, setAuthLocation] = useState('');
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [locationStatusMsg, setLocationStatusMsg] = useState('');
  const [locationError, setLocationError] = useState('');

  // General auth notification state
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
  const [editLocationDetecting, setEditLocationDetecting] = useState(false);

  // Initialize edit fields when authUser is available
  useEffect(() => {
    if (authUser) {
      setEditFacility(authUser.facilityName || '');
      setEditLocation(authUser.location || '');
      setEditRegId(authUser.regId || '');
      setEditRegCategory(authUser.regCategory || '');
      setEditRegStandard(authUser.regStandard || '');
      setEditEmissionCap(authUser.emissionCap || '');
      setEditRole(authUser.role || 'Plant Operator');
    }
  }, [authUser]);

  // ── Auto-Detect Geolocation with Reverse Geocoding ──────────────────────────
  const handleDetectLocation = (target = 'auth') => {
    if (!navigator.geolocation) {
      const errMsg = 'Geolocation is not supported by your browser. Please enter your plant location manually.';
      if (target === 'auth') setLocationError(errMsg);
      else alert(errMsg);
      return;
    }

    if (target === 'auth') {
      setLocationDetecting(true);
      setLocationError('');
      setLocationStatusMsg('Acquiring GPS coordinates with browser permissions...');
    } else {
      setEditLocationDetecting(true);
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        if (target === 'auth') {
          setLocationStatusMsg('Resolving reverse geocoding address...');
        }

        try {
          // Timeout guard: Abort reverse geocoding request if server takes longer than 4s
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            {
              headers: { 'Accept-Language': 'en' },
              signal: controller.signal
            }
          );
          clearTimeout(timer);

          if (response.ok) {
            const data = await response.json();
            const addr = data.address || {};
            const locality = addr.industrial || addr.suburb || addr.neighbourhood || addr.city_district || addr.town || addr.village || addr.city || '';
            const city = addr.city || addr.county || addr.state_district || '';
            const state = addr.state || '';
            const postcode = addr.postcode ? ` - ${addr.postcode}` : '';
            const country = addr.country || '';

            const parts = [locality, city, state, country].filter(Boolean);
            const resolvedAddress = parts.length > 0 ? parts.join(', ') + postcode : (data.display_name || '');

            if (resolvedAddress) {
              if (target === 'auth') {
                setAuthLocation(resolvedAddress);
                setLocationSuccess(true);
                setLocationStatusMsg(`GPS Verified: ${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E`);
                setLocationDetecting(false);
              } else {
                setEditLocation(resolvedAddress);
                setEditLocationDetecting(false);
              }
              return;
            }
          }
        } catch (fetchErr) {
          console.warn('Reverse geocode note (fallback to coordinates):', fetchErr);
        }

        // Clean coordinate fallback if reverse geocoding was blocked or slow
        const coordString = `Plant Coordinates: ${latitude.toFixed(4)}°N, ${longitude.toFixed(4)}°E (GPS Detected)`;
        if (target === 'auth') {
          setAuthLocation(coordString);
          setLocationSuccess(true);
          setLocationStatusMsg(`Coordinates acquired (${latitude.toFixed(3)}°N, ${longitude.toFixed(3)}°E)`);
          setLocationDetecting(false);
        } else {
          setEditLocation(coordString);
          setEditLocationDetecting(false);
        }
      },
      (geoErr) => {
        if (target === 'auth') setLocationDetecting(false);
        else setEditLocationDetecting(false);

        let msg = 'Could not acquire GPS coordinates.';
        if (geoErr.code === 1) {
          msg = 'Location permission was denied. You can enter your plant address manually.';
        } else if (geoErr.code === 2) {
          msg = 'Location position unavailable. Please enter address manually.';
        } else if (geoErr.code === 3) {
          msg = 'Location request timed out. Please enter address manually.';
        }
        if (target === 'auth') setLocationError(msg);
        else alert(msg);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  };

  // ── Email/Password Authentication ──────────────────────────────────────────
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthErrorMsg('');
    setAuthSuccessMsg('');

    try {
      if (authTab === 'signup') {
        if (!authName.trim()) {
          setAuthErrorMsg('Please enter your full name.');
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
              location: authLocation.trim() || '',
              regId: authRegId.trim() || '',
              regCategory: authRegCategory,
              regStandard: authRegStandard,
              emissionCap: authEmissionCap.trim() || '',
              role: authRole,
              authMethod: 'firebase-email',
              registeredAt: new Date().toISOString(),
            };

            // Non-blocking background Firestore synchronization
            syncUserToFirestore(fbUser, {
              name: registeredUser.name,
              facilityName: registeredUser.facilityName,
              location: registeredUser.location,
              regId: registeredUser.regId,
              regCategory: registeredUser.regCategory,
              regStandard: registeredUser.regStandard,
              emissionCap: registeredUser.emissionCap,
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
            location: authLocation.trim() || '',
            regId: authRegId.trim() || '',
            regCategory: authRegCategory,
            regStandard: authRegStandard,
            emissionCap: authEmissionCap.trim() || '',
            role: authRole,
            authMethod: 'email',
            registeredAt: new Date().toISOString(),
          };
        }

        if (rememberMe) localStorage.setItem('ecoleak_auth_user', JSON.stringify(registeredUser));
        setAuthLoading(false);
        setAuthSuccessMsg(`Welcome, ${registeredUser.name}! Account registered with regulatory parameters.`);
        if (onAuthSuccess) onAuthSuccess(registeredUser);
      } else {
        // Sign In Flow
        let loggedUser = null;
        if (isFirebaseConfigured()) {
          try {
            const fbUser = await loginWithFirebaseEmail(authEmail.trim(), authPassword);
            
            loggedUser = {
              uid: fbUser.uid,
              name: fbUser.displayName || authEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              email: fbUser.email,
              facilityName: authFacility.trim() || '',
              location: authLocation.trim() || '',
              regId: authRegId.trim() || '',
              regCategory: authRegCategory || '',
              regStandard: authRegStandard || '',
              emissionCap: authEmissionCap.trim() || '',
              role: authRole || 'Plant Operator',
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
            facilityName: authFacility.trim() || '',
            location: authLocation.trim() || '',
            regId: authRegId.trim() || '',
            regCategory: authRegCategory || '',
            regStandard: authRegStandard || '',
            emissionCap: authEmissionCap.trim() || '',
            role: authRole || 'Plant Operator',
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

  // ── Google One-Click Auth ──────────────────────────────────────────────────
  const handleGoogleAuth = async () => {
    setAuthLoading(true);
    setAuthErrorMsg('');
    setAuthSuccessMsg('');
    try {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase credentials are not set in .env. Please check VITE_FIREBASE_API_KEY.');
      }

      const fbUser = await loginWithFirebaseGoogle();
      if (!fbUser) {
        throw new Error('Google sign-in did not return an authenticated user.');
      }

      const googleUser = {
        uid: fbUser.uid,
        name: fbUser.displayName || 'Google Operator',
        email: fbUser.email,
        picture: fbUser.photoURL || '',
        facilityName: authFacility.trim() || '',
        location: authLocation.trim() || '',
        regId: authRegId.trim() || '',
        regCategory: authRegCategory || '',
        regStandard: authRegStandard || '',
        emissionCap: authEmissionCap.trim() || '',
        role: authRole || 'Plant Operator',
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

      if (rememberMe) localStorage.setItem('ecoleak_auth_user', JSON.stringify(googleUser));
      setAuthLoading(false);
      setAuthSuccessMsg(`Welcome, ${googleUser.name}! Account authenticated.`);
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

  // ── 1-Click Demo Operator Bypass ───────────────────────────────────────────
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
    localStorage.setItem('ecoleak_auth_user', JSON.stringify(demoUser));
    setAuthSuccessMsg('Signed in as Demo Operator with Regulatory Parameters');
    if (onAuthSuccess) onAuthSuccess(demoUser);
  };

  // ── Save Edited Operator Parameters ────────────────────────────────────────
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
      updatedAt: new Date().toISOString(),
    };

    if (onUpdateUser) {
      onUpdateUser(updated);
    } else {
      localStorage.setItem('ecoleak_auth_user', JSON.stringify(updated));
    }
    setIsEditingProfile(false);
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

  // Helper function for category color class
  const getCategoryColorClass = (catStr = '') => {
    const s = catStr.toLowerCase();
    if (s.includes('red')) return 'badge-red-cat';
    if (s.includes('orange')) return 'badge-orange-cat';
    if (s.includes('green')) return 'badge-green-cat';
    return 'badge-white-cat';
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
            <EcoLeakLogo size={32} />
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
                : (authTab === 'signin' ? 'Sign In' : 'Create Operator Account')}
            </h1>
            <p className="dash-section-desc">
              {authUser
                ? 'Your authenticated session links facility meters, regulatory consent parameters, and circular intervention ledger.'
                : 'Connect your industrial facility, configure regulatory parameters, and pinpoint emission leaks.'}
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
                    {authUser.role || 'Operator'} · {authUser.facilityName || 'Facility Pending'}
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

              {/* Inline Profile Editor Form */}
              {isEditingProfile ? (
                <form onSubmit={handleSaveProfileEdits} className="profile-edit-form-wrap">
                  <div className="profile-edit-header">
                    <span className="profile-edit-title">
                      <Scale size={15} color="var(--mint-hover)" /> Edit Plant Location &amp; Regulatory Parameters
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Updates instant session storage</span>
                  </div>

                  <div className="profile-edit-grid">
                    <div className="dash-form-group">
                      <label className="dash-label"><Building2 size={13} /> Facility Name</label>
                      <input
                        type="text"
                        value={editFacility}
                        onChange={(e) => setEditFacility(e.target.value)}
                        className="dash-input"
                        required
                      />
                    </div>

                    <div className="dash-form-group">
                      <label className="dash-label"><ShieldCheck size={13} /> Operator Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="dash-select"
                      >
                        <option value="Plant Manager">Plant Manager / Factory Head</option>
                        <option value="Process Engineer">Process &amp; Energy Engineer</option>
                        <option value="Sustainability Consultant">Sustainability Consultant</option>
                        <option value="Environmental Auditor">Pollution Control / Regulatory Auditor</option>
                      </select>
                    </div>

                    <div className="dash-form-group" style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="dash-label" style={{ margin: 0 }}><MapPin size={13} /> Office / Plant Location</label>
                        <button
                          type="button"
                          className="btn-gps-detect-inline"
                          disabled={editLocationDetecting}
                          onClick={() => handleDetectLocation('edit')}
                        >
                          <LocateFixed size={12} className={editLocationDetecting ? 'spin-on-active' : ''} />
                          {editLocationDetecting ? 'Detecting GPS...' : 'Auto-Detect with GPS'}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="e.g. Industrial Area Phase 1, City, State"
                        className="dash-input"
                        required
                      />
                    </div>

                    <div className="dash-form-group">
                      <label className="dash-label"><FileCheck size={13} /> SPCB / CPCB Consent No.</label>
                      <input
                        type="text"
                        value={editRegId}
                        onChange={(e) => setEditRegId(e.target.value)}
                        placeholder="e.g. MH-PCB/RO-PUN/CTO-2026/0894"
                        className="dash-input"
                        required
                      />
                    </div>

                    <div className="dash-form-group">
                      <label className="dash-label"><ShieldAlert size={13} /> Compliance Category</label>
                      <select
                        value={editRegCategory}
                        onChange={(e) => setEditRegCategory(e.target.value)}
                        className="dash-select"
                      >
                        <option value="Orange Category (Pollution Index 41-59 - Moderate)">Orange Category (PI 41-59 - Moderate)</option>
                        <option value="Red Category (Pollution Index >= 60 - Heavy)">Red Category (PI &gt;= 60 - Heavy Emissions)</option>
                        <option value="Green Category (Pollution Index 21-40 - Low)">Green Category (PI 21-40 - Low Emissions)</option>
                        <option value="White Category (Pollution Index <= 20 - Exempt)">White Category (PI &lt;= 20 - Non-Polluting)</option>
                      </select>
                    </div>

                    <div className="dash-form-group">
                      <label className="dash-label"><Scale size={13} /> Regulatory Framework</label>
                      <select
                        value={editRegStandard}
                        onChange={(e) => setEditRegStandard(e.target.value)}
                        className="dash-select"
                      >
                        <option value="SPCB Consent to Operate & Water/Air Acts">SPCB Consent to Operate (CTO)</option>
                        <option value="BRSR Core (SEBI Mandated Decarbonization)">BRSR Core (SEBI Mandated)</option>
                        <option value="ISO 14064-1 & GHG Protocol Corporate">ISO 14064-1 &amp; GHG Protocol</option>
                        <option value="Energy Conservation Act & BEE PAT Scheme">Energy Conservation Act (BEE PAT)</option>
                      </select>
                    </div>

                    <div className="dash-form-group">
                      <label className="dash-label"><TrendingDown size={13} /> Consented Emission Cap</label>
                      <input
                        type="text"
                        value={editEmissionCap}
                        onChange={(e) => setEditEmissionCap(e.target.value)}
                        placeholder="e.g. 450 MT CO2e / Year"
                        className="dash-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                    <button type="submit" className="dash-elite-btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Save size={14} /> Save Parameters
                    </button>
                    <button
                      type="button"
                      className="dash-back-btn-sm"
                      onClick={() => setIsEditingProfile(false)}
                      style={{ padding: '8px 14px' }}
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              {/* Regulatory Parameters & Plant Location Panel */}
              <div className="profile-reg-params-panel">
                <div className="reg-panel-title-row">
                  <span className="reg-panel-title">
                    <Scale size={15} color="var(--mint-hover)" /> REGULATORY &amp; OFFICE LOCATION PARAMETERS
                  </span>
                  <span className={`reg-cat-badge ${getCategoryColorClass(authUser.regCategory)}`}>
                    <ShieldAlert size={12} /> {authUser.regCategory || 'Uncategorized'}
                  </span>
                </div>

                <div className="reg-params-display-grid">
                  <div className="reg-param-item">
                    <div className="reg-param-label"><MapPin size={13} /> Office / Plant Location</div>
                    <div className="reg-param-val">
                      {authUser.location || 'Not configured'}
                    </div>
                    <div className="reg-param-sub">
                      <span className="location-verified-pill"><Check size={11} /> Auto-Detect / GPS Compatible</span>
                    </div>
                  </div>

                  <div className="reg-param-item">
                    <div className="reg-param-label"><FileCheck size={13} /> SPCB / CPCB Registration No.</div>
                    <div className="reg-param-val font-mono-val">
                      {authUser.regId || 'Not registered'}
                    </div>
                    <div className="reg-param-sub">Consent to Operate (CTO) Validated</div>
                  </div>

                  <div className="reg-param-item">
                    <div className="reg-param-label"><Scale size={13} /> Compliance Standard</div>
                    <div className="reg-param-val">
                      {authUser.regStandard || 'Not specified'}
                    </div>
                    <div className="reg-param-sub">BRSR Core &amp; ISO 14064 Aligned</div>
                  </div>

                  <div className="reg-param-item">
                    <div className="reg-param-label"><ShieldCheck size={13} /> Consented Emission Cap</div>
                    <div className="reg-param-val" style={{ color: 'var(--mint-hover)', fontWeight: 800 }}>
                      {authUser.emissionCap || 'Not configured'}
                    </div>
                    <div className="reg-param-sub">Pollution Control Board Ceiling</div>
                  </div>
                </div>
              </div>

              {/* Standard Profile Stats */}
              <div className="profile-stats-grid">
                <div className="profile-stat-box">
                  <small>Connected Plant</small>
                  <strong>{authUser.facilityName || 'Not configured'}</strong>
                  <span>Sector: Manufacturing</span>
                </div>
                <div className="profile-stat-box">
                  <small>Auth Method</small>
                  <strong style={{ textTransform: 'capitalize' }}>
                    {authUser.authMethod === 'firebase-google' ? 'Google OAuth' : (authUser.authMethod === 'demo' ? '1-Click Demo' : 'Corporate Email')}
                  </strong>
                  <span>Session Active</span>
                </div>
                <div className="profile-stat-box">
                  <small>Decarbonization Engine</small>
                  <strong style={{ color: 'var(--mint-hover)' }}>Circular Ready</strong>
                  <span>BRSR &amp; ISO 14064 Verified</span>
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
                    <div className="form-subheading-badge">
                      <User size={13} /> 1. OPERATOR &amp; FACILITY CREDENTIALS
                    </div>

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

                    {/* Office / Plant Location with Auto-Detect & Manual Entry */}
                    <div className="form-subheading-badge" style={{ marginTop: '16px' }}>
                      <MapPin size={13} /> 2. OFFICE / PLANT LOCATION (GPS OR MANUAL)
                    </div>

                    <div className="dash-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label className="dash-label" style={{ margin: 0 }}>
                          <MapPin size={14} /> Office / Plant Location
                        </label>
                        <button
                          type="button"
                          className="btn-gps-detect-inline"
                          disabled={locationDetecting}
                          onClick={() => handleDetectLocation('auth')}
                          title="Click to automatically detect facility coordinates using browser GPS permissions"
                        >
                          <LocateFixed size={13} className={locationDetecting ? 'spin-on-active' : ''} />
                          {locationDetecting ? 'Detecting GPS...' : 'Auto-Detect GPS'}
                        </button>
                      </div>

                      <div className="location-input-wrap">
                        <input
                          type="text"
                          placeholder="e.g. Industrial Area Phase 1, City, State"
                          value={authLocation}
                          onChange={(e) => {
                            setAuthLocation(e.target.value);
                            setLocationError('');
                          }}
                          className="dash-input"
                          required
                        />
                      </div>

                      {locationStatusMsg && (
                        <div className="location-feedback-pill pill-success">
                          <CheckCircle2 size={12} />
                          <span>{locationStatusMsg}</span>
                        </div>
                      )}

                      {locationError && (
                        <div className="location-feedback-pill pill-warning">
                          <AlertTriangle size={12} />
                          <span>{locationError}</span>
                        </div>
                      )}
                      <span className="input-hint-note">
                        Supports auto-detection with browser permissions or exact manual entry for industrial premises.
                      </span>
                    </div>

                    {/* Regulatory Parameters (reg params) */}
                    <div className="form-subheading-badge" style={{ marginTop: '16px' }}>
                      <Scale size={13} /> 3. REGULATORY COMPLIANCE PARAMETERS (REG PARAMS)
                    </div>

                    <div className="dash-form-group">
                      <label className="dash-label">
                        <FileCheck size={14} /> SPCB / CPCB Consent or Factory Reg No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MH-PCB/RO-PUN/CTO-2026/0894 or UDYAM-MH-12-0045892"
                        value={authRegId}
                        onChange={(e) => setAuthRegId(e.target.value)}
                        className="dash-input"
                        required
                      />
                      <span className="input-hint-note">
                        SPCB Consent to Operate (CTO) No., Factory License, or MSME Udyam ID.
                      </span>
                    </div>

                    <div className="reg-params-two-col">
                      <div className="dash-form-group">
                        <label className="dash-label">
                          <ShieldAlert size={14} /> Compliance Category
                        </label>
                        <select
                          value={authRegCategory}
                          onChange={(e) => setAuthRegCategory(e.target.value)}
                          className="dash-select"
                        >
                          <option value="Orange Category (Pollution Index 41-59 - Moderate)">
                            Orange Category (PI 41-59 - Moderate)
                          </option>
                          <option value="Red Category (Pollution Index >= 60 - Heavy)">
                            Red Category (PI &gt;= 60 - Heavy Impact)
                          </option>
                          <option value="Green Category (Pollution Index 21-40 - Low)">
                            Green Category (PI 21-40 - Low Impact)
                          </option>
                          <option value="White Category (Pollution Index <= 20 - Exempt)">
                            White Category (PI &lt;= 20 - Clean/Exempt)
                          </option>
                        </select>
                      </div>

                      <div className="dash-form-group">
                        <label className="dash-label">
                          <Scale size={14} /> Compliance Framework
                        </label>
                        <select
                          value={authRegStandard}
                          onChange={(e) => setAuthRegStandard(e.target.value)}
                          className="dash-select"
                        >
                          <option value="SPCB Consent to Operate & Water/Air Acts">
                            SPCB Consent to Operate (CTO)
                          </option>
                          <option value="BRSR Core (SEBI Mandated Decarbonization)">
                            BRSR Core (SEBI Mandated)
                          </option>
                          <option value="ISO 14064-1 & GHG Protocol Corporate">
                            ISO 14064-1 &amp; GHG Protocol
                          </option>
                          <option value="Energy Conservation Act & BEE PAT Scheme">
                            Energy Conservation Act (BEE PAT)
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className="dash-form-group">
                      <label className="dash-label">
                        <TrendingDown size={14} /> Consented Emission Cap (Annual Baseline)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 450 MT CO2e / Year"
                        value={authEmissionCap}
                        onChange={(e) => setAuthEmissionCap(e.target.value)}
                        className="dash-input"
                      />
                    </div>
                  </>
                )}

                <div className="dash-form-group" style={{ marginTop: authTab === 'signup' ? '16px' : '0' }}>
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
                      {authTab === 'signin' ? 'Sign In' : 'Create Operator Account'}
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
                    Bypass for testing (1-Click Demo Operator with Reg Params &amp; Location)
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

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, logoutFirebase } from './services/firebase';
import { logoutSupabase } from './services/supabase';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Ticker from './components/Ticker';
import SimpleHowItWorks from './components/SimpleHowItWorks';
import SimpleCalculator from './components/SimpleCalculator';
import ImpactROI from './components/ImpactROI';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import VisionPage from './components/VisionPage';
import MultilingualShowcase from './components/MultilingualShowcase';
import { assignAvatarToUser } from './services/avatarService';
import { syncProfileToSupabase, fetchOperatorProfile } from './services/api';
import { supabase } from './services/supabase';

// Parse initial view and section from URL pathname and hash
const parseLocationRoute = () => {
  const path = (window.location.pathname || '/').toLowerCase();
  const hash = (window.location.hash || '').toLowerCase().replace('#', '');
  const route = hash || path;

  if (route.includes('vision') || route.includes('manifesto')) {
    return { view: 'vision', section: 'overview' };
  }
  if (route.includes('copilot') || route.includes('ecobot') || route.includes('chat')) {
    return { view: 'dashboard', section: 'copilot' };
  }
  if (route.includes('plant') || route.includes('facility')) {
    return { view: 'dashboard', section: 'plant' };
  }
  if (route.includes('operator') || route.includes('profile')) {
    return { view: 'dashboard', section: 'profile' };
  }
  if (route.includes('login') || route.includes('signin')) {
    return { view: 'login', section: 'overview' };
  }
  if (route.includes('signup') || route.includes('register')) {
    return { view: 'signup', section: 'overview' };
  }
  if (route.includes('dashboard') || route.includes('app')) {
    let sec = 'input';
    if (route.includes('copilot') || route.includes('ecobot') || route.includes('chat')) sec = 'copilot';
    else if (route.includes('plant')) sec = 'plant';
    else if (route.includes('leaks')) sec = 'leaks';
    else if (route.includes('circular') || route.includes('solutions')) sec = 'circular';
    else if (route.includes('report')) sec = 'report';
    else if (route.includes('input') || route.includes('audit')) sec = 'input';
    return { view: 'dashboard', section: sec };
  }
  return { view: 'landing', section: 'overview' };
};

// Sync browser URL bar with active view and section
const syncBrowserUrl = (v, s) => {
  let targetUrl = '/';
  if (v === 'vision') targetUrl = '/vision';
  else if (v === 'login') targetUrl = '/login';
  else if (v === 'signup') targetUrl = '/signup';
  else if (v === 'dashboard') {
    if (s === 'profile') targetUrl = '/operator';
    else if (s === 'plant') targetUrl = '/plant';
    else if (s === 'copilot' || s === 'ecobot' || s === 'chat') targetUrl = '/copilot';
    else if (s === 'overview') targetUrl = '/dashboard';
    else targetUrl = `/dashboard/${s}`;
  }

  try {
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ view: v, section: s }, '', targetUrl);
    }
  } catch {
    try {
      window.location.hash = targetUrl.replace('/', '');
    } catch {}
  }
};

export default function App() {
  const [authUser, setAuthUser] = useState(null);

  const initialRoute = parseLocationRoute();
  const [view, setView] = useState(() => {
    // If user is accessing /operator or /dashboard while unauthenticated, show login with intent
    if (!authUser && initialRoute.view === 'dashboard') {
      return 'login';
    }
    return initialRoute.view;
  });
  const [dashSection, setDashSection] = useState(initialRoute.section);

  // Synchronize browser history (Back / Forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      const { view: v, section: s } = parseLocationRoute();
      setView(v);
      setDashSection(s);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load active Supabase session on startup directly from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadActiveSession() {
      if (supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          const sbUser = data?.session?.user;
          if (sbUser && isMounted) {
            const prof = await fetchOperatorProfile(sbUser.id);
            if (prof && isMounted) {
              const userObj = assignAvatarToUser({
                uid: sbUser.id,
                email: sbUser.email || prof.email,
                name: prof.full_name || prof.name || (sbUser.email ? sbUser.email.split('@')[0] : 'Operator'),
                role: prof.role || 'Plant Manager',
                facilityName: prof.facility_name || '',
                avatarId: prof.avatar_url || 'pfp-ops-director',
                plants: prof.plants || [],
              });
              setAuthUser(userObj);
            }
          }
        } catch (e) {
          console.debug('Supabase session load note:', e);
        }
      }
    }
    loadActiveSession();
    return () => { isMounted = false; };
  }, []);

  // Keep state synchronized with Firebase Auth in real time
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let remoteProf = null;
        try {
          remoteProf = await fetchOperatorProfile(fbUser.uid);
        } catch (e) {
          console.debug('Firebase auth profile load note:', e);
        }

        setAuthUser((prev) => {
          const raw = {
            uid: fbUser.uid,
            name: fbUser.displayName || remoteProf?.full_name || prev?.name || (fbUser.email ? fbUser.email.split('@')[0] : 'Operator'),
            email: fbUser.email || remoteProf?.email || prev?.email || '',
            plants: remoteProf?.plants || prev?.plants || [],
            facilityName: remoteProf?.facility_name || prev?.facilityName || '',
            industryType: prev?.industryType || '',
            capacity: prev?.capacity || '',
            location: prev?.location || '',
            regId: prev?.regId || '',
            regCategory: prev?.regCategory || '',
            regStandard: prev?.regStandard || '',
            emissionCap: prev?.emissionCap || '',
            regionalOffice: prev?.regionalOffice || '',
            role: remoteProf?.role || prev?.role || 'Plant Operator',
            department: prev?.department || '',
            phone: prev?.phone || '',
            notes: prev?.notes || '',
            authMethod: prev?.authMethod || 'firebase-google',
          };
          const updated = assignAvatarToUser(raw);
          syncProfileToSupabase(updated).catch((e) => console.debug('Supabase profile sync note:', e));
          return updated;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const openDashboard = (section = 'overview') => {
    if (!authUser) {
      setView('login');
      syncBrowserUrl('login', 'overview');
      return;
    }
    setDashSection(section);
    setView('dashboard');
    syncBrowserUrl('dashboard', section);
  };

  const openOperatorProfile = () => {
    if (!authUser) {
      setView('login');
      setDashSection('profile');
      syncBrowserUrl('login', 'overview');
      return;
    }
    setDashSection('profile');
    setView('dashboard');
    syncBrowserUrl('dashboard', 'profile');
  };

  const openLogin = () => {
    setView('login');
    syncBrowserUrl('login', 'overview');
  };

  const openSignup = () => {
    setView('signup');
    syncBrowserUrl('signup', 'overview');
  };

  const openLanding = () => {
    setView('landing');
    syncBrowserUrl('landing', 'overview');
  };

  const handleSectionChange = useCallback((newSection) => {
    setDashSection(newSection);
    syncBrowserUrl('dashboard', newSection);
  }, []);

  const handleAuthSuccess = (user) => {
    const updated = assignAvatarToUser(user);
    setAuthUser(updated);
    syncProfileToSupabase(updated).catch((e) => console.debug('Supabase profile sync note:', e));
    // If user arrived intending to view the operator profile, route them there directly, else default to 'input'
    const targetSec = dashSection === 'profile' ? 'profile' : (dashSection && dashSection !== 'overview' ? dashSection : 'input');
    setDashSection(targetSec);
    setView('dashboard');
    syncBrowserUrl('dashboard', targetSec);
  };

  const handleUpdateUser = (updatedUser) => {
    const updated = assignAvatarToUser(updatedUser);
    setAuthUser(updated);
    syncProfileToSupabase(updated).catch((e) => console.debug('Supabase profile sync note:', e));
  };

  const handleSignOut = async () => {
    setAuthUser(null);
    try {
      await logoutFirebase();
      await logoutSupabase();
    } catch (e) {
      console.warn('Sign out cleanup note:', e);
    }
    openLanding();
  };

  const handleOpenEcoBot = () => {
    if (!authUser) {
      openLogin();
      return;
    }
    openDashboard('copilot');
  };

  const openVision = () => {
    setView('vision');
    syncBrowserUrl('vision', 'overview');
  };

  useEffect(() => {
    window.onOpenVision = openVision;
    return () => {
      delete window.onOpenVision;
    };
  }, []);

  return (
    <>
      {/* ── Vision Manifesto Page (Has Identical Navbar) ── */}
      {view === 'vision' && (
        <VisionPage 
          onBack={openLanding} 
          onOpenApp={() => openDashboard('input')} 
          authUser={authUser}
          onOpenSignIn={openLogin}
          onOpenSignUp={openSignup}
        />
      )}

      {/* ── Operator Profile Page (STRICTLY NO NAVBAR) ── */}
      {view === 'profile' && (
        <OperatorProfilePage
          authUser={authUser}
          user={authUser}
          onUpdateUser={handleUpdateUser}
          onSignOut={handleSignOut}
          onBack={() => openDashboard('overview')}
        />
      )}

      {/* ── Login Authentication Page ── */}
      {view === 'login' && (
        <LoginPage
          authUser={authUser}
          onAuthSuccess={handleAuthSuccess}
          onUpdateUser={handleUpdateUser}
          onSignOut={handleSignOut}
          onBack={openLanding}
          onOpenDashboard={() => openDashboard('overview')}
          onNavigateToSignup={openSignup}
          onOpenVision={openVision}
        />
      )}

      {/* ── Signup Authentication Page ── */}
      {view === 'signup' && (
        <SignupPage
          authUser={authUser}
          onAuthSuccess={handleAuthSuccess}
          onBack={openLanding}
          onNavigateToLogin={openLogin}
          onOpenDashboard={() => openDashboard('overview')}
          onOpenVision={openVision}
        />
      )}

      {/* ── Integrated Dashboard (STRICTLY NO NAVBAR) ── */}
      {view === 'dashboard' && (
        !authUser ? (
          <LoginPage
            authUser={null}
            onAuthSuccess={handleAuthSuccess}
            onSignOut={handleSignOut}
            onBack={openLanding}
            onOpenDashboard={() => openDashboard('overview')}
            onNavigateToSignup={openSignup}
          />
        ) : (
          <Dashboard
            initialSection={dashSection}
            onBack={openLanding}
            authUser={authUser}
            onUpdateUser={handleUpdateUser}
            onSignOut={handleSignOut}
            onOpenAuth={openLogin}
            onOpenProfile={openOperatorProfile}
            onOpenEcoBot={handleOpenEcoBot}
            onSectionChange={handleSectionChange}
          />
        )
      )}

      {/* ── Landing Page (Has Navbar) ── */}
      {view === 'landing' && (
        <div className="app-root">
          <AnimatedBackground />
          <div className="noise-overlay"></div>

          <Navbar
            authUser={authUser}
            onOpenDashboard={() => openDashboard('overview')}
            onOpenSignIn={openLogin}
            onOpenRegister={openSignup}
            onOpenVision={openVision}
            onBack={openLanding}
          />

          <main>
            <Hero onOpenAssessment={() => openDashboard('input')} />
            <Ticker />
            <SimpleHowItWorks
              onOpenAssessment={() => openDashboard('input')}
              onOpenEcoBot={handleOpenEcoBot}
              authUser={authUser}
            />
            <MultilingualShowcase onOpenAssessment={() => openDashboard('input')} />
            <SimpleCalculator onOpenAssessment={openDashboard} />
            <ImpactROI onOpenAssessment={() => openDashboard('input')} />
          </main>

          <Footer onOpenVision={openVision} />
        </div>
      )}
    </>
  );
}

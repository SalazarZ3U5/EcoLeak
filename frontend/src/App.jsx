import React, { useState, useEffect } from 'react';
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
import AuthPage from './components/AuthPage';

export default function App() {
  // 'landing' | 'dashboard' | 'auth'
  const [view, setView] = useState('landing');
  const [dashSection, setDashSection] = useState('input');
  const [authInitialTab, setAuthInitialTab] = useState('signin');
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ecoleak_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Keep state synchronized with Firebase Auth in real time
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setAuthUser((prev) => {
          const updated = {
            uid: fbUser.uid,
            name: fbUser.displayName || prev?.name || (fbUser.email ? fbUser.email.split('@')[0] : 'Operator'),
            email: fbUser.email || prev?.email || '',
            picture: fbUser.photoURL || prev?.picture || '',
            facilityName: prev?.facilityName || 'GreenPack Plastics Plant',
            role: prev?.role || 'Plant Manager',
            authMethod: 'firebase-google',
          };
          localStorage.setItem('ecoleak_auth_user', JSON.stringify(updated));
          return updated;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const openDashboard = (section = 'input') => {
    if (!authUser) {
      setAuthInitialTab('signin');
      setView('auth');
      return;
    }
    setDashSection(section);
    setView('dashboard');
  };

  const openAuth = (tab = 'signin') => {
    setAuthInitialTab(tab);
    setView('auth');
  };

  const handleAuthSuccess = (user) => {
    setAuthUser(user);
    setView('dashboard');
  };

  const handleSignOut = async () => {
    localStorage.removeItem('ecoleak_auth_user');
    setAuthUser(null);
    try {
      await logoutFirebase();
      await logoutSupabase();
    } catch (e) {
      console.warn('Sign out cleanup note:', e);
    }
    // Instantly redirect away from the dashboard to the landing page
    setView('landing');
  };

  if (view === 'auth') {
    return (
      <AuthPage
        initialTab={authInitialTab}
        authUser={authUser}
        onAuthSuccess={handleAuthSuccess}
        onSignOut={handleSignOut}
        onBack={() => setView('landing')}
        onOpenDashboard={() => {
          if (!authUser) {
            setView('auth');
          } else {
            setView('dashboard');
          }
        }}
      />
    );
  }

  if (view === 'dashboard') {
    // Hard guard: dashboard is strictly prohibited for logged-out visitors
    if (!authUser) {
      return (
        <AuthPage
          initialTab="signin"
          authUser={null}
          onAuthSuccess={handleAuthSuccess}
          onSignOut={handleSignOut}
          onBack={() => setView('landing')}
          onOpenDashboard={() => setView('dashboard')}
        />
      );
    }
    return (
      <Dashboard
        initialSection={dashSection}
        onBack={() => setView('landing')}
        authUser={authUser}
        onSignOut={handleSignOut}
        onOpenAuth={() => openAuth('signin')}
      />
    );
  }

  return (
    <div className="app-root">
      <AnimatedBackground />
      <div className="noise-overlay"></div>

      <Navbar
        authUser={authUser}
        onOpenAssessment={() => openDashboard('input')}
        onOpenLogin={() => openAuth('signin')}
      />

      <main>
        <Hero onOpenAssessment={() => openDashboard('input')} />
        <Ticker />
        <SimpleHowItWorks onOpenAssessment={() => openDashboard('input')} />
        <SimpleCalculator onOpenAssessment={openDashboard} />
        <ImpactROI onOpenAssessment={() => openDashboard('input')} />
      </main>

      <Footer />
    </div>
  );
}


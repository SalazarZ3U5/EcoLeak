import React, { useState } from 'react';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Ticker from './components/Ticker';
import SimpleHowItWorks from './components/SimpleHowItWorks';
import SimpleCalculator from './components/SimpleCalculator';
import ImpactROI from './components/ImpactROI';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';

export default function App() {
  // 'landing' | 'dashboard'
  const [view, setView] = useState('landing');
  const [dashSection, setDashSection] = useState('audit');

  const openDashboard = (section = 'audit') => {
    setDashSection(section);
    setView('dashboard');
  };

  if (view === 'dashboard') {
    return (
      <Dashboard
        initialSection={dashSection}
        onBack={() => setView('landing')}
      />
    );
  }

  return (
    <div className="app-root">
      <AnimatedBackground />
      <div className="noise-overlay"></div>

      <Navbar
        onOpenAssessment={() => openDashboard('audit')}
        onOpenLogin={() => openDashboard('signin')}
      />

      <main>
        <Hero onOpenAssessment={() => openDashboard('audit')} />
        <Ticker />
        <SimpleHowItWorks onOpenAssessment={() => openDashboard('audit')} />
        <SimpleCalculator onOpenAssessment={openDashboard} />
        <ImpactROI onOpenAssessment={() => openDashboard('audit')} />
      </main>

      <Footer />
    </div>
  );
}

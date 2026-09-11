import React, { useState, useEffect } from 'react';
import AnimatedBackground from './components/AnimatedBackground';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Ticker from './components/Ticker';
import SimpleHowItWorks from './components/SimpleHowItWorks';
import SimpleCalculator from './components/SimpleCalculator';
import ImpactROI from './components/ImpactROI';
import AssessmentModal from './components/AssessmentModal';
import LoginModal from './components/LoginModal';
import Footer from './components/Footer';

export default function App() {
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [assessmentIndustry, setAssessmentIndustry] = useState('Plastic manufacturing');

  const handleOpenAssessment = (industry) => {
    if (industry && typeof industry === 'string') {
      setAssessmentIndustry(industry);
    }
    setIsAssessmentOpen(true);
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsAssessmentOpen(false);
        setIsLoginOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-root">
      {/* Subtle Animated Background */}
      <AnimatedBackground />
      <div className="noise-overlay"></div>

      <Navbar 
        onOpenAssessment={() => handleOpenAssessment()}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      <main>
        {/* 1. Clear Punchy Hero with Interactive Before/After Toggle */}
        <Hero 
          onOpenAssessment={() => handleOpenAssessment()}
        />

        <Ticker />

        {/* 2. 3-Step Simple Story */}
        <SimpleHowItWorks 
          onOpenAssessment={() => handleOpenAssessment()}
        />

        {/* 3. Interactive Instant Savings Calculator */}
        <SimpleCalculator 
          onOpenAssessment={handleOpenAssessment}
        />

        {/* 4. Commercial Impact & Final CTA */}
        <ImpactROI 
          onOpenAssessment={() => handleOpenAssessment()}
        />
      </main>

      <Footer />

      {/* Clean Modals */}
      <AssessmentModal 
        isOpen={isAssessmentOpen}
        onClose={() => setIsAssessmentOpen(false)}
        initialIndustry={assessmentIndustry}
      />

      <LoginModal 
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  );
}

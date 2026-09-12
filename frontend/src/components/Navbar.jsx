import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Sparkles, ShieldCheck } from 'lucide-react';

export default function Navbar({ onOpenAssessment, onOpenLogin, authUser }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header-nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="container nav-inner-flex">
        <a href="#top" className="brand-link" aria-label="EcoLeak Home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <div className="brand-mark">
            <span></span>
            <span></span>
          </div>
          <span className="brand-text">
            Eco<span className="brand-accent">Leak</span>
          </span>
        </a>

        <nav className="nav-links">
          <a href="#top" className="nav-item">Overview</a>
          <a href="#how" className="nav-item">How It Works</a>
          <a href="#calculator" className="nav-item">ROI Ledger</a>
          <a href="#impact" className="nav-item">Impact</a>
        </nav>

        <div className="nav-actions">
          <button 
            className="btn btn-ghost"
            onClick={onOpenLogin}
            id="nav-signin-btn"
          >
            {authUser ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="var(--mint)" />
                <span>{authUser.name ? authUser.name.split(' ')[0] : 'Operator'}</span>
              </span>
            ) : (
              'Sign In'
            )}
          </button>
          <button 
            className="btn btn-primary"
            onClick={onOpenAssessment}
            id="nav-assessment-btn"
          >
            Start Leak Audit <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Sparkles } from 'lucide-react';

export default function Navbar({ onOpenAssessment, onOpenLogin }) {
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
        <a href="#top" className="brand-link" aria-label="CarbonLoop Home">
          <div className="brand-mark">
            <span></span>
            <span></span>
          </div>
          <span className="brand-text">
            Carbon<span className="brand-accent">Loop</span>
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
          >
            Operator Sign In
          </button>
          <button 
            className="btn btn-primary"
            onClick={onOpenAssessment}
          >
            Start Free Assessment <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

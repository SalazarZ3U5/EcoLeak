import React, { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';

import EcoLeakLogo from './EcoLeakLogo';

export default function Navbar({
  onOpenDashboard,
  onOpenSignIn,
  onOpenRegister,
  onOpenVision,
  onBack,
  authUser,
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpen = () => {
    if (onOpenDashboard) onOpenDashboard();
  };

  const handleSignIn = () => {
    if (onOpenSignIn) onOpenSignIn();
    else if (onOpenDashboard) onOpenDashboard();
  };

  const handleRegister = () => {
    if (onOpenRegister) onOpenRegister();
    else if (onOpenDashboard) onOpenDashboard();
  };

  const handleBrandClick = (e) => {
    e.preventDefault();
    if (onBack) {
      onBack();
      return;
    }
    if (window.location.hash) {
      window.history.pushState(null, '', window.location.pathname);
    }
    const topElem = document.getElementById('top');
    if (topElem) {
      topElem.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const username = authUser?.name || (authUser?.email ? authUser.email.split('@')[0] : 'Operator');

  return (
    <header className={`header-nav ${scrolled ? 'nav-scrolled' : ''}`}>
      <div className="container nav-inner-flex">
        <a
          href="#top"
          className="brand-link"
          aria-label="EcoLeak Home"
          onClick={handleBrandClick}
          title="EcoLeak Home"
        >
          <EcoLeakLogo size={32} />
          <span className="brand-text">
            Eco<span className="brand-accent">Leak</span>
          </span>
        </a>

        <div className="nav-links">
          <a 
            href="#how" 
            className="nav-item"
            onClick={(e) => {
              if (onBack) {
                e.preventDefault();
                onBack();
                setTimeout(() => {
                  const el = document.getElementById('how');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
          >
            How It Works
          </a>
          <button 
            type="button" 
            className="nav-item" 
            onClick={() => {
              if (onOpenVision) onOpenVision();
              else if (window.onOpenVision) window.onOpenVision();
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Vision
          </button>
        </div>

        <div className="nav-actions">
          {authUser ? (
            <span className="navbar-welcome-msg">
              Welcome, <strong className="navbar-welcome-name">{username}</strong>
            </span>
          ) : (
            <div className="navbar-auth-links">
              <button
                type="button"
                className="nav-auth-btn"
                onClick={handleSignIn}
                id="nav-signin-btn"
              >
                Sign In
              </button>
              <span className="nav-auth-separator">/</span>
              <button
                type="button"
                className="nav-auth-btn"
                onClick={handleRegister}
                id="nav-register-btn"
              >
                Register
              </button>
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary nav-open-app-btn"
            onClick={handleOpen}
            id="nav-open-app-btn"
          >
            Open App <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

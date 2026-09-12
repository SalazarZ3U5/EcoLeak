import React, { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';

export default function Navbar({
  onOpenApp,
  onOpenAssessment,
  onOpenSignIn,
  onOpenSignUp,
  onOpenAuth,
  onBack,
  authUser
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpen = () => {
    if (onOpenApp) onOpenApp();
    else if (onOpenAssessment) onOpenAssessment();
  };

  const handleSignIn = () => {
    if (onOpenSignIn) onOpenSignIn();
    else if (onOpenAuth) onOpenAuth('login');
    else if (onOpenApp) onOpenApp();
  };

  const handleRegister = () => {
    if (onOpenSignUp) onOpenSignUp();
    else if (onOpenAuth) onOpenAuth('signup');
    else if (onOpenApp) onOpenApp();
  };

  const handleBrandClick = (e) => {
    e.preventDefault();
    if (onBack) {
      onBack();
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
          <div className="brand-mark">
            <span />
            <span />
          </div>
          <span className="brand-text">
            Eco<span className="brand-accent">Leak</span>
          </span>
        </a>

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

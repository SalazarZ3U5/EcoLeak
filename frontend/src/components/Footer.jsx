import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="brand-mark" style={{ width: '22px', height: '22px' }}>
              <span></span>
              <span></span>
            </div>
            <strong style={{ color: 'var(--text-main)', fontSize: '15px' }}>
              Carbon<span style={{ color: 'var(--mint)' }}>Loop</span> AI
            </strong>
            <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>— Find emissions. Close the loop. Save money.</span>
          </div>

          <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
            <a href="#top" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Overview</a>
            <a href="#how" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>How It Works</a>
            <a href="#calculator" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Calculator</a>
            <a href="#impact" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Impact</a>
          </div>

          <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
            © {new Date().getFullYear()} CarbonLoop AI. Built for factories & industrial SMEs.
          </div>
        </div>
      </div>
    </footer>
  );
}

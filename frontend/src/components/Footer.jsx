import React from 'react';
import { Sparkles } from 'lucide-react';
import EcoLeakLogo from './EcoLeakLogo';

export default function Footer({ onOpenVision }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <EcoLeakLogo size={24} />
            <strong style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
              Eco<span style={{ color: '#0f172a' }}>Leak</span>
            </strong>
            <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>— Find emissions. Close the loop. Save money.</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', alignItems: 'center' }}>
            <a href="#top" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Home</a>
            <a href="#how" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>How It Works</a>
            <a href="#multilingual" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Multilingual Docs</a>
            <a href="#calculator" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Calculator</a>
            <button
              type="button"
              onClick={onOpenVision}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', padding: 0 }}
            >
              Vision Manifesto
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '12px' }}>
            <span>© {new Date().getFullYear()} EcoLeak. Built for factories & industrial SMEs.</span>
            <span>•</span>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px',
              padding: '3px 10px', 
              borderRadius: '999px', 
              background: '#ffffff', 
              color: '#0f172a', 
              fontWeight: 700, 
              border: '1px solid var(--line)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)' 
            }}>
              <Sparkles size={12} color="#0f172a" />
              <span>Made for Hackout 2026</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

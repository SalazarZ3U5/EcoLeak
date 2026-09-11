import React, { useState } from 'react';
import { X, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    setLoggedIn(true);
    setTimeout(() => {
      setLoggedIn(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" style={{ width: 'min(420px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {!loggedIn ? (
          <div>
            <div className="modal-tag">
              OPERATOR CONSOLE
            </div>
            <h2>Sign In</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
              Access your facility's utility data and intervention ledger.
            </p>

            <form onSubmit={handleLogin} style={{ marginTop: '24px' }}>
              <div className="modal-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={15} color="var(--mint)" /> Corporate Email
                </label>
                <input 
                  type="email"
                  placeholder="operator@plant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="modal-input"
                  required
                />
              </div>

              <div className="modal-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={15} color="var(--mint)" /> Password
                </label>
                <input 
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="modal-input"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '8px' }}>
                Sign In to Console <ArrowRight size={16} />
              </button>
            </form>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <ShieldCheck size={48} color="var(--mint)" style={{ margin: '0 auto 16px' }} />
            <h3>Authenticated Successfully</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
              Opening facility ledger...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

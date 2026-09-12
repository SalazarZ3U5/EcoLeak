import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, LayoutDashboard, ShieldCheck, ShieldAlert, MapPin,
  FileCheck, Scale, Edit2, Save, X, Check, Copy, AlertTriangle,
  Building2, User, Mail, Sparkles, RefreshCw, LocateFixed,
  Layers, Zap, Flame, LogOut, CheckCircle2, Factory, TrendingDown,
  Clock, Hash, Shield, Database, ExternalLink, Cpu, Phone, Briefcase,
  Sliders, ArrowRight, CheckSquare, Award, ChevronDown, ChevronUp
} from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';
import { formatINR, formatCO2e, fetchUserAudits, syncProfileToSupabase } from '../services/api';
import { syncUserToFirestore } from '../services/firebase';
import { UserPfp } from '../services/avatarService';
import Navbar from './Navbar';
import JargonTooltip, { JargonIcon } from './JargonTooltip';

export default function OperatorProfilePage({
  authUser,
  onUpdateUser,
  onSignOut,
  onBack,
  onOpenDashboard,
  onNavigateSection,
  initialPage = 'operator',
  isEmbedded = false,
}) {
  // Navigation state: 'operator' | 'edit-operator' | 'plant' | 'edit-plant'
  const [currentPage, setCurrentPage] = useState(
    initialPage === 'plant' ? 'plant' : 'operator'
  );

  // Collapsible section cards state
  const [collapsedCards, setCollapsedCards] = useState({});
  const toggleCard = (id) => setCollapsedCards((prev) => ({ ...prev, [id]: !prev[id] }));

  // Sync initialPage prop if it changes externally
  useEffect(() => {
    if (initialPage === 'plant') {
      setCurrentPage('plant');
    } else if (initialPage === 'operator') {
      setCurrentPage('operator');
    }
  }, [initialPage]);

  // ── Operator Form State ──────────────────────────────────────────────────
  const [opName, setOpName] = useState('');
  const [opRole, setOpRole] = useState('');
  const [opEmail, setOpEmail] = useState('');
  const [opPhone, setOpPhone] = useState('');
  const [opDepartment, setOpDepartment] = useState('');
  const [opNotes, setOpNotes] = useState('');

  // ── Plant Form State ─────────────────────────────────────────────────────
  const [plantFacility, setPlantFacility] = useState('');
  const [plantIndustry, setPlantIndustry] = useState('');
  const [plantCapacity, setPlantCapacity] = useState('');
  const [plantLocation, setPlantLocation] = useState('');
  const [plantRegId, setPlantRegId] = useState('');
  const [plantRegCategory, setPlantRegCategory] = useState('');
  const [plantRegStandard, setPlantRegStandard] = useState('');
  const [plantEmissionCap, setPlantEmissionCap] = useState('');
  const [plantRegionalOffice, setPlantRegionalOffice] = useState('');

  // GPS Telemetry State
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState(false);
  const [locationStatusMsg, setLocationStatusMsg] = useState('');

  // Notification / Feedback State
  const [copiedRegId, setCopiedRegId] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Audit Ledger State
  const [audits, setAudits] = useState([]);
  const [loadingAudits, setLoadingAudits] = useState(true);

  // Populate state from authUser
  useEffect(() => {
    if (authUser) {
      setOpName(authUser.name || 'Industrial Operator');
      setOpRole(authUser.role || 'Plant Manager');
      setOpEmail(authUser.email || 'operator@ecoleak.org');
      setOpPhone(authUser.phone || '+91 98201 54892');
      setOpDepartment(authUser.department || 'Plant Operations & Environmental Compliance');
      setOpNotes(authUser.notes || 'ISO 14001:2015 & Central Pollution Control Board (CPCB) Certified Lead');

      setPlantFacility(authUser.facilityName || 'GreenPack Plastics Ltd.');
      setPlantIndustry(authUser.industryType || 'Plastic Processing & Extrusion');
      setPlantCapacity(authUser.capacity || '2,400 MT / Year');
      setPlantLocation(authUser.location || 'MIDC Bhosari Industrial Area, Pune, Maharashtra 411026');
      setPlantRegId(authUser.regId || 'MH-SPCB/PUN/CTO-2026/4102');
      setPlantRegCategory(authUser.regCategory || 'Orange Category (Pollution Index 41-59 - Moderate)');
      setPlantRegStandard(authUser.regStandard || 'SPCB Consent to Operate & Water/Air Acts');
      setPlantEmissionCap(authUser.emissionCap || '450 MT CO2e / Year');
      setPlantRegionalOffice(authUser.regionalOffice || 'MPCB Regional Office, Pune');
    }
  }, [authUser]);

  // Load audit records
  useEffect(() => {
    let isMounted = true;
    async function loadAudits() {
      try {
        const data = await fetchUserAudits();
        if (isMounted && data && data.length > 0) {
          setAudits(data);
        } else if (isMounted) {
          setAudits([
            {
              id: 'audit-benchmark-01',
              industry: 'Plastic Injection & Extrusion (Baseline Run)',
              total_co2e_kg: 194720,
              scope_1_kg: 1340,
              scope_2_kg: 16400,
              scope_3_kg: 176980,
              data_quality: 98.4,
              created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            },
            {
              id: 'audit-benchmark-02',
              industry: 'Polymer Compounding (60t HDPE Benchmark)',
              total_co2e_kg: 182400,
              scope_1_kg: 1200,
              scope_2_kg: 15100,
              scope_3_kg: 166100,
              data_quality: 96.0,
              created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
            }
          ]);
        }
      } catch {
        // graceful fallback
      } finally {
        if (isMounted) setLoadingAudits(false);
      }
    }
    loadAudits();
    return () => { isMounted = false; };
  }, []);

  const showFeedback = (type, text) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg({ type: '', text: '' }), 4500);
  };

  // GPS Auto-detect for Plant
  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) {
      showFeedback('warning', 'Geolocation is not supported by your browser.');
      return;
    }
    setLocationDetecting(true);
    setLocationStatusMsg('Acquiring GPS sensor coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            const industrialSub = addr.industrial || addr.suburb || addr.neighbourhood || addr.city_district || 'MIDC Industrial Area';
            const city = addr.city || addr.town || addr.state_district || 'Pune';
            const state = addr.state || 'Maharashtra';
            const postcode = addr.postcode ? ` ${addr.postcode}` : '';
            const detected = `${industrialSub}, ${city}, ${state}${postcode} (Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)})`;

            setPlantLocation(detected);
            setLocationSuccess(true);
            setLocationStatusMsg(`GPS Verified: ${city}, ${state}`);
          } else {
            const detected = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (GPS Verified)`;
            setPlantLocation(detected);
            setLocationSuccess(true);
            setLocationStatusMsg('GPS coordinates captured.');
          }
        } catch {
          const detected = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)} (GPS Acquired)`;
          setPlantLocation(detected);
          setLocationSuccess(true);
          setLocationStatusMsg('GPS coordinates recorded.');
        } finally {
          setLocationDetecting(false);
        }
      },
      (err) => {
        setLocationDetecting(false);
        setLocationSuccess(false);
        showFeedback('warning', `GPS lookup note: ${err.message}. You can manually type the address.`);
      },
      { timeout: 9000, enableHighAccuracy: true }
    );
  };

  const handleCopyRegId = () => {
    const textToCopy = authUser?.regId || plantRegId;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedRegId(true);
    setTimeout(() => setCopiedRegId(false), 2200);
  };

  // ── SAVE OPERATOR INFORMATION ────────────────────────────────────────────
  const handleSaveOperator = (e) => {
    e.preventDefault();
    if (!authUser) return;

    const updated = {
      ...authUser,
      name: opName.trim() || authUser.name,
      role: opRole || authUser.role,
      phone: opPhone.trim(),
      department: opDepartment.trim(),
      notes: opNotes.trim(),
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem('ecoleak_auth_user', JSON.stringify(updated));
    if (onUpdateUser) onUpdateUser(updated);

    syncProfileToSupabase(updated).catch((err) => console.debug('Supabase sync note:', err));
    if (authUser.uid && !authUser.uid.startsWith('demo-')) {
      syncUserToFirestore({ uid: authUser.uid }, updated).catch((err) => console.debug('Firestore sync note:', err));
    }

    showFeedback('success', 'Operator profile & contact details updated successfully.');
    setCurrentPage('operator');
  };

  // ── SAVE PLANT INFORMATION ───────────────────────────────────────────────
  const handleSavePlant = (e) => {
    e.preventDefault();
    if (!authUser) return;

    const updated = {
      ...authUser,
      facilityName: plantFacility.trim() || authUser.facilityName,
      industryType: plantIndustry.trim() || authUser.industryType,
      capacity: plantCapacity.trim() || authUser.capacity,
      location: plantLocation.trim() || authUser.location,
      regId: plantRegId.trim() || authUser.regId,
      regCategory: plantRegCategory || authUser.regCategory,
      regStandard: plantRegStandard || authUser.regStandard,
      emissionCap: plantEmissionCap.trim() || authUser.emissionCap,
      regionalOffice: plantRegionalOffice.trim() || authUser.regionalOffice,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem('ecoleak_auth_user', JSON.stringify(updated));
    if (onUpdateUser) onUpdateUser(updated);

    syncProfileToSupabase(updated).catch((err) => console.debug('Supabase sync note:', err));
    if (authUser.uid && !authUser.uid.startsWith('demo-')) {
      syncUserToFirestore({ uid: authUser.uid }, updated).catch((err) => console.debug('Firestore sync note:', err));
    }

    showFeedback('success', 'Plant facility parameters & SPCB regulatory consents updated successfully.');
    setCurrentPage('plant');
  };

  const getCategoryBadgeClass = (cat = '') => {
    const lower = cat.toLowerCase();
    if (lower.includes('orange')) return 'badge-orange-cat';
    if (lower.includes('red')) return 'badge-red-cat';
    if (lower.includes('green')) return 'badge-green-cat';
    return 'badge-white-cat';
  };

  if (!authUser) return null;

  // Active top tab highlighting
  const isOperatorSection = currentPage === 'operator' || currentPage === 'edit-operator';
  const isPlantSection = currentPage === 'plant' || currentPage === 'edit-plant';

  return (
    <div className={`operator-profile-page-root ${isEmbedded ? 'profile-embedded-mode' : ''}`}>
      {!isEmbedded && <AnimatedBackground />}
      {!isEmbedded && <div className="noise-overlay" />}

      {/* Standalone navbar when accessed directly outside dashboard */}
      {!isEmbedded && (
        <Navbar
          authUser={authUser}
          onOpenApp={onOpenDashboard}
          onBack={onBack}
        />
      )}

      <main className={`profile-page-main ${isEmbedded ? 'embedded-profile-main' : ''}`}>
        <div className={isEmbedded ? 'profile-container-embedded' : 'container profile-container-wide'}>

          {/* Feedback Toast */}
          {feedbackMsg.text && (
            <div className={`profile-alert ${feedbackMsg.type === 'success' ? 'profile-alert-success' : 'profile-alert-warning'}`}>
              {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{feedbackMsg.text}</span>
              <button type="button" className="alert-close-btn" onClick={() => setFeedbackMsg({ type: '', text: '' })}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* ── TOP NAVIGATION TABS: OPERATOR vs PLANT ────────────────────────── */}
          <div className="profile-pages-tab-bar">
            <div className="profile-pages-tabs-left">
              <button
                type="button"
                className={`profile-page-tab-btn ${isOperatorSection ? 'tab-btn-active' : ''}`}
                onClick={() => setCurrentPage('operator')}
              >
                <User size={16} />
                <span>Operator Profile</span>
                {currentPage === 'edit-operator' && <span className="tab-mode-pill">Editing</span>}
              </button>

              <button
                type="button"
                className={`profile-page-tab-btn ${isPlantSection ? 'tab-btn-active' : ''}`}
                onClick={() => setCurrentPage('plant')}
              >
                <Factory size={16} />
                <span>Plant Information</span>
                {currentPage === 'edit-plant' && <span className="tab-mode-pill">Editing</span>}
              </button>
            </div>

            <div className="profile-pages-tabs-right">
              {onNavigateSection && (
                <button
                  type="button"
                  className="profile-tab-action-btn"
                  onClick={() => onNavigateSection('input')}
                  title="Open Input Audit"
                >
                  <LayoutDashboard size={14} />
                  <span>Plant Process Data</span>
                </button>
              )}
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              PAGE 1: OPERATOR PROFILE (VIEW MODE)
             ═════════════════════════════════════════════════════════════════════ */}
          {currentPage === 'operator' && (
            <div className="profile-section-view-wrap">
              {/* Operator Hero Banner */}
              <div className="profile-hero-banner elite-card">
                <div className="profile-hero-left">
                  <div className="profile-hero-badge-row">
                    <span className="profile-badge-chip verified-chip">
                      <ShieldCheck size={13} color="var(--mint-hover)" /> Verified Plant Operator
                    </span>
                    <span className="profile-badge-chip compliance-chip">
                      <Award size={12} /> {authUser.role || 'Plant Manager'}
                    </span>
                    <span className="profile-badge-chip font-mono-val" style={{ background: 'rgba(0,0,0,0.04)' }}>
                      <Hash size={11} /> {authUser.uid ? `UID: ${authUser.uid.slice(0, 10)}...` : 'UID: OP-MIDC-0894'}
                    </span>
                  </div>
                  <h1 className="profile-hero-title">
                    {authUser.name || 'Industrial Operator'}
                  </h1>
                  <p className="profile-hero-sub">
                    Authorized operator credentials, identity verification, role permissions, and active audit history for{' '}
                    <strong>{authUser.facilityName || 'GreenPack Plastics Ltd.'}</strong>.
                  </p>
                </div>

                <div className="profile-hero-actions">
                  <button
                    type="button"
                    className="btn-profile-primary-edit"
                    onClick={() => setCurrentPage('edit-operator')}
                  >
                    <Edit2 size={15} />
                    <span>Edit Operator Details</span>
                  </button>
                  <button
                    type="button"
                    className="btn-profile-hero-switch"
                    onClick={() => setCurrentPage('plant')}
                  >
                    <Factory size={15} />
                    <span>View Plant Information</span>
                  </button>
                </div>
              </div>

              {/* Operator Details & Activity Grid */}
              <div className="profile-two-column-clean-grid">
                {/* Card 1: Personal & Professional Account Information */}
                <div className="profile-card-clean elite-card">
                  <div className="profile-card-header">
                    <div className="card-header-icon icon-mint">
                      <User size={18} />
                    </div>
                    <div className="card-header-titles">
                      <h3 className="profile-card-title">Operator Identity &amp; Credentials</h3>
                      <span className="profile-card-subtitle">Personal credentials, role, and authentication status</span>
                    </div>
                    <div className="card-header-actions" style={{ marginLeft: 'auto' }}>
                      <button
                        type="button"
                        className="btn-card-collapse-toggle"
                        onClick={() => toggleCard('op-identity')}
                        title={collapsedCards['op-identity'] ? "Expand card" : "Collapse card"}
                        aria-label="Toggle section collapse"
                      >
                        {collapsedCards['op-identity'] ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                      </button>
                    </div>
                  </div>

                  {collapsedCards['op-identity'] ? (
                    <div className="card-collapsed-summary">
                      <User size={14} color="var(--mint-hover)" />
                      <span>{authUser.name || 'Industrial Operator'} · {authUser.role || 'Plant Manager'} · {authUser.email || 'operator@ecoleak.org'}</span>
                    </div>
                  ) : (
                    <>
                      <div className="profile-id-block">
                        <div className="profile-avatar-large">
                          <UserPfp user={authUser} size={64} className="profile-avatar-img-lg" />
                          <span className="profile-online-badge" title="Active Verified Session" />
                        </div>
                        <div className="profile-id-names">
                          <h4 className="profile-operator-name">{authUser.name || 'Industrial Operator'}</h4>
                          <span className="profile-operator-email">{authUser.email || 'operator@ecoleak.org'}</span>
                          <div className="profile-role-pill">
                            <Cpu size={12} />
                            <span>{authUser.role || 'Plant Manager'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="profile-specs-list">
                        <div className="profile-spec-row">
                          <span className="spec-label"><Briefcase size={13} /> Plant Role</span>
                          <strong className="spec-val">{authUser.role || 'Plant Manager'}</strong>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Mail size={13} /> Contact Email</span>
                          <span className="spec-val font-mono-val">{authUser.email || 'operator@ecoleak.org'}</span>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Phone size={13} /> Direct Mobile</span>
                          <span className="spec-val font-mono-val">{authUser.phone || '+91 98201 54892'}</span>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Building2 size={13} /> Assigned Facility</span>
                          <strong className="spec-val">{authUser.facilityName || 'GreenPack Plastics Ltd.'}</strong>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Sliders size={13} /> Department</span>
                          <span className="spec-val">{authUser.department || 'Plant Operations & Environmental Compliance'}</span>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Shield size={13} /> Auth Security</span>
                          <span className="spec-badge-val">
                            {authUser.authMethod === 'firebase-google' ? 'Google SSO (OAuth 2.0)' : 'Supabase Cloud Token'}
                          </span>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Clock size={13} /> Last Synchronized</span>
                          <span className="spec-val" style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {authUser.lastUpdated ? new Date(authUser.lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Live Active Session'}
                          </span>
                        </div>
                      </div>

                      <div className="profile-card-footer-action">
                        <button
                          type="button"
                          className="btn-profile-card-action"
                          onClick={() => setCurrentPage('edit-operator')}
                        >
                          <Edit2 size={14} /> Edit Operator Information
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Card 2: Operator Audit Activity & History */}
                <div className="profile-card-clean elite-card">
                  <div className="profile-card-header">
                    <div className="card-header-icon icon-amber">
                      <Database size={18} />
                    </div>
                    <div className="card-header-titles">
                      <h3 className="profile-card-title">Operator Audit Activity</h3>
                      <span className="profile-card-subtitle">Verified emission assessments executed by this account</span>
                    </div>
                    <div className="card-header-actions" style={{ marginLeft: 'auto' }}>
                      <button
                        type="button"
                        className="btn-card-collapse-toggle"
                        onClick={() => toggleCard('op-audits')}
                        title={collapsedCards['op-audits'] ? "Expand card" : "Collapse card"}
                        aria-label="Toggle section collapse"
                      >
                        {collapsedCards['op-audits'] ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                      </button>
                    </div>
                  </div>

                  {collapsedCards['op-audits'] ? (
                    <div className="card-collapsed-summary">
                      <Database size={14} color="var(--amber)" />
                      <span>{audits.length} Recorded Audits · Latest: {audits[0]?.industry || 'Active Factory Audit'}</span>
                    </div>
                  ) : (
                    <>
                      {loadingAudits ? (
                        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <RefreshCw size={22} className="spin" style={{ margin: '0 auto 10px' }} />
                          <div>Loading recorded plant audits...</div>
                        </div>
                      ) : audits.length > 0 ? (
                        <div className="profile-audit-history-list">
                          {audits.map((audit, idx) => (
                            <div key={audit.id || idx} className="profile-audit-item">
                              <div className="audit-item-left">
                                <div className="audit-item-title-row">
                                  <strong className="audit-industry-name">{audit.industry || 'Plant Audit Run'}</strong>
                                  <span className="audit-date-tag">
                                    {audit.created_at ? new Date(audit.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                                  </span>
                                </div>
                                <div className="audit-scope-pills">
                                  <span className="scope-pill scope-1"><JargonTooltip term="Scope 1">Scope 1</JargonTooltip>: {formatCO2e(audit.scope_1_kg || 1200)}</span>
                                  <span className="scope-pill scope-2"><JargonTooltip term="Scope 2">Scope 2</JargonTooltip>: {formatCO2e(audit.scope_2_kg || 16400)}</span>
                                  <span className="scope-pill scope-3"><JargonTooltip term="Scope 3">Scope 3</JargonTooltip>: {formatCO2e(audit.scope_3_kg || 176980)}</span>
                                </div>
                              </div>

                              <div className="audit-item-right">
                                <span className="audit-total-co2"><JargonTooltip term="CO2e">{formatCO2e(audit.total_co2e_kg, true)}</JargonTooltip></span>
                                {onNavigateSection && (
                                  <button
                                    type="button"
                                    className="btn-view-audit-record"
                                    onClick={() => onNavigateSection('leaks')}
                                  >
                                    <span>Inspect Leaks</span>
                                    <ExternalLink size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          <p style={{ margin: '0 0 14px' }}>No audit runs logged yet for this operator.</p>
                          {onNavigateSection && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => onNavigateSection('input')}
                            >
                              Run First Factory Audit
                            </button>
                          )}
                        </div>
                      )}

                      <div className="profile-card-footer-action">
                        <button
                          type="button"
                          className="btn-profile-card-action"
                          onClick={() => setCurrentPage('plant')}
                        >
                          <Factory size={14} /> Switch to Plant Information &amp; Consents
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              PAGE 2: EDIT OPERATOR INFORMATION (SEPARATE EDIT PAGE)
             ═════════════════════════════════════════════════════════════════════ */}
          {currentPage === 'edit-operator' && (
            <div className="profile-dedicated-edit-page">
              {/* Back breadcrumb bar */}
              <div className="edit-page-breadcrumb-bar">
                <button
                  type="button"
                  className="btn-back-breadcrumb"
                  onClick={() => setCurrentPage('operator')}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Operator Profile</span>
                </button>
                <span className="breadcrumb-divider">/</span>
                <span className="breadcrumb-current">Edit Operator Information</span>
              </div>

              {/* Edit Header */}
              <div className="edit-page-header-card elite-card">
                <div className="edit-page-header-content">
                  <div className="edit-header-icon-wrap icon-mint">
                    <User size={22} />
                  </div>
                  <div>
                    <h2 className="edit-page-title">Edit Operator Information</h2>
                    <p className="edit-page-sub">
                      Update your full name, management designation, phone number, and plant division details.
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Operator Form */}
              <form onSubmit={handleSaveOperator} className="profile-clean-edit-form elite-card">
                <div className="edit-form-grid-two-col">
                  {/* Left Column */}
                  <div className="edit-form-col">
                    <div className="edit-form-group">
                      <label className="dash-label">
                        Operator Full Name <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="dash-input"
                        value={opName}
                        onChange={(e) => setOpName(e.target.value)}
                        placeholder="e.g. Kavin Jindal"
                        required
                      />
                      <span className="field-hint">The primary name printed on SPCB compliance certificates.</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">
                        Plant Designation / Role <span className="req-star">*</span>
                      </label>
                      <select
                        className="dash-select"
                        value={opRole}
                        onChange={(e) => setOpRole(e.target.value)}
                        required
                      >
                        <option value="Plant Manager">Plant Manager</option>
                        <option value="Operations Lead">Operations Lead</option>
                        <option value="Environmental & Sustainability Officer">Environmental &amp; Sustainability Officer</option>
                        <option value="Process Engineer">Process Engineer</option>
                        <option value="EHS (Environment, Health & Safety) Lead">EHS Lead</option>
                        <option value="Managing Director / Owner">Managing Director / Owner</option>
                      </select>
                      <span className="field-hint">Official operational role for audit sign-offs.</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">Email Address (Read-Only Identity)</label>
                      <input
                        type="email"
                        className="dash-input font-mono-val"
                        value={opEmail}
                        disabled
                        style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                      />
                      <span className="field-hint">Tied to your authenticated Google / Supabase token.</span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="edit-form-col">
                    <div className="edit-form-group">
                      <label className="dash-label">Contact Phone / Mobile</label>
                      <input
                        type="tel"
                        className="dash-input font-mono-val"
                        value={opPhone}
                        onChange={(e) => setOpPhone(e.target.value)}
                        placeholder="e.g. +91 98201 54892"
                      />
                      <span className="field-hint">Used for urgent leak notifications and threshold breach alerts.</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">Department / Division</label>
                      <input
                        type="text"
                        className="dash-input"
                        value={opDepartment}
                        onChange={(e) => setOpDepartment(e.target.value)}
                        placeholder="e.g. Operations & Environmental Management"
                      />
                      <span className="field-hint">Internal departmental grouping within the manufacturing site.</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">Professional Certifications / EHS Notes</label>
                      <textarea
                        className="dash-input"
                        rows={3}
                        value={opNotes}
                        onChange={(e) => setOpNotes(e.target.value)}
                        placeholder="e.g. ISO 14001:2015 Lead Auditor, Certified Energy Auditor (BEE India)"
                      />
                      <span className="field-hint">Key accreditation details for regulatory audit trails.</span>
                    </div>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="edit-form-actions-bar">
                  <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={16} /> Save Operator Details
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setCurrentPage('operator')}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              PAGE 3: PLANT INFORMATION (VIEW MODE)
             ═════════════════════════════════════════════════════════════════════ */}
          {currentPage === 'plant' && (
            <div className="profile-section-view-wrap">
              {/* Plant Hero Banner */}
              <div className="profile-hero-banner elite-card">
                <div className="profile-hero-left">
                  <h1 className="profile-hero-title">
                    {authUser.facilityName || plantFacility}
                  </h1>
                  <p className="profile-hero-sub">
                    Physical location, GPS telemetry, SPCB Consent to Operate (CTO) registration, and permissible emission boundaries.
                  </p>
                </div>

                <div className="profile-hero-actions">
                  <button
                    type="button"
                    className="btn-profile-primary-edit"
                    onClick={() => setCurrentPage('edit-plant')}
                  >
                    <Edit2 size={15} />
                    <span>Edit Plant Details</span>
                  </button>
                  <button
                    type="button"
                    className="btn-profile-hero-switch"
                    onClick={() => setCurrentPage('operator')}
                  >
                    <User size={15} />
                    <span>View Operator Profile</span>
                  </button>
                </div>
              </div>

              {/* 4-Card Plant Stat Ribbon */}
              <div className="profile-stats-ribbon">
                <div className="profile-stat-card">
                  <div className="stat-card-icon-wrap icon-mint">
                    <FileCheck size={18} />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-label"><JargonTooltip term="SPCB">SPCB</JargonTooltip> <JargonTooltip term="CTO">CTO</JargonTooltip> REGISTRATION</span>
                    <strong className="stat-card-value font-mono-val">{authUser.regId || plantRegId}</strong>
                    <span className="stat-card-sub">State Pollution Board Consent</span>
                  </div>
                </div>

                <div className="profile-stat-card">
                  <div className="stat-card-icon-wrap icon-amber">
                    <Scale size={18} />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-label"><JargonTooltip term="CTO">CONSENTED CAP</JargonTooltip></span>
                    <strong className="stat-card-value">{authUser.emissionCap || plantEmissionCap}</strong>
                    <span className="stat-card-sub">Air Act Permissible Ceiling</span>
                  </div>
                </div>

                <div className="profile-stat-card">
                  <div className="stat-card-icon-wrap icon-cyan">
                    <MapPin size={18} />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-label">INDUSTRIAL ZONE</span>
                    <strong className="stat-card-value">
                      {authUser.location ? authUser.location.split(',')[0] : 'MIDC Bhosari Area'}
                    </strong>
                    <span className="stat-card-sub">Industrial Development Corp</span>
                  </div>
                </div>

                <div className="profile-stat-card">
                  <div className="stat-card-icon-wrap icon-emerald">
                    <Layers size={18} />
                  </div>
                  <div className="stat-card-info">
                    <span className="stat-card-label">INDUSTRY SECTOR</span>
                    <strong className="stat-card-value">
                      {authUser.industryType || plantIndustry}
                    </strong>
                    <span className="stat-card-sub">Process Classification</span>
                  </div>
                </div>
              </div>

              {/* Plant Details Grid */}
              <div className="profile-two-column-clean-grid">
                {/* Site & Location Card */}
                <div className="profile-card-clean elite-card">
                  <div className="profile-card-header">
                    <div className="card-header-icon icon-cyan">
                      <MapPin size={18} />
                    </div>
                    <div className="card-header-titles">
                      <h3 className="profile-card-title">Physical Facility &amp; GPS Telemetry</h3>
                      <span className="profile-card-subtitle">Geographical coordinates, regional zone, and site jurisdiction</span>
                    </div>
                    <div className="card-header-actions" style={{ marginLeft: 'auto' }}>
                      <button
                        type="button"
                        className="btn-card-collapse-toggle"
                        onClick={() => toggleCard('plant-site')}
                        title={collapsedCards['plant-site'] ? "Expand section" : "Collapse section"}
                        aria-label="Toggle section collapse"
                      >
                        {collapsedCards['plant-site'] ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                      </button>
                    </div>
                  </div>

                  {collapsedCards['plant-site'] ? (
                    <div className="card-collapsed-summary">
                      <MapPin size={14} color="var(--cyan-main)" />
                      <span>{authUser.location || plantLocation} · GPS Anchored</span>
                    </div>
                  ) : (
                    <>
                      <div className="profile-telemetry-box">
                        <div className="telemetry-pin-row">
                          <div className="telemetry-pin-icon">
                            <MapPin size={18} color="#ffffff" />
                          </div>
                          <div className="telemetry-pin-text">
                            <span className="telemetry-title">PHYSICAL MANUFACTURING SITE</span>
                            <strong className="telemetry-address">
                              {authUser.location || plantLocation}
                            </strong>
                          </div>
                        </div>

                        <div className="telemetry-metrics-grid">
                          <div className="telemetry-sub-metric">
                            <span className="telemetry-sub-label">Industrial Zone</span>
                            <strong className="telemetry-sub-val">MIDC Industrial Complex</strong>
                          </div>
                          <div className="telemetry-sub-metric">
                            <span className="telemetry-sub-label">Regional Pollution Office</span>
                            <strong className="telemetry-sub-val">{authUser.regionalOffice || plantRegionalOffice}</strong>
                          </div>
                          <div className="telemetry-sub-metric">
                            <span className="telemetry-sub-label">Site Geocoding</span>
                            <span className="telemetry-sub-status">
                              <CheckCircle2 size={12} color="var(--mint-hover)" /> GPS Anchored
                            </span>
                          </div>
                          <div className="telemetry-sub-metric">
                            <span className="telemetry-sub-label">State Jurisdiction</span>
                            <strong className="telemetry-sub-val">Maharashtra SPCB</strong>
                          </div>
                        </div>
                      </div>

                      <div className="profile-map-card-stub">
                        <div className="map-stub-radar">
                          <div className="radar-circle circle-1" />
                          <div className="radar-circle circle-2" />
                          <div className="radar-blip" />
                        </div>
                        <div className="map-stub-info">
                          <span className="map-stub-title">Telemetric Coordinate Match</span>
                          <span className="map-stub-coords">
                            {authUser.location && authUser.location.includes('Lat:')
                              ? authUser.location.split('(')[1]?.replace(')', '') || 'Lat: 18.6279, Lon: 73.8423'
                              : 'Lat: 18.6279, Lon: 73.8423 (MIDC Zone)'}
                          </span>
                          <span className="map-stub-note">Pinpoint telemetry for regional grid emission factor baseline</span>
                        </div>
                      </div>

                      <div className="profile-card-footer-action">
                        <button
                          type="button"
                          className="btn-profile-card-action"
                          onClick={() => setCurrentPage('edit-plant')}
                        >
                          <LocateFixed size={14} /> Update Site Location &amp; Coordinates
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Consents & Permissible Limits Card */}
                <div className="profile-card-clean elite-card">
                  <div className="profile-card-header">
                    <div className="card-header-icon icon-rose">
                      <Scale size={18} />
                    </div>
                    <div className="card-header-titles">
                      <h3 className="profile-card-title">SPCB / CPCB Regulatory Consents</h3>
                      <span className="profile-card-subtitle">Permissible statutory limits, CTO certificates, and standards</span>
                    </div>
                    <div className="card-header-actions" style={{ marginLeft: 'auto' }}>
                      <button
                        type="button"
                        className="btn-card-collapse-toggle"
                        onClick={() => toggleCard('plant-consents')}
                        title={collapsedCards['plant-consents'] ? "Expand section" : "Collapse section"}
                        aria-label="Toggle section collapse"
                      >
                        {collapsedCards['plant-consents'] ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                      </button>
                    </div>
                  </div>

                  {collapsedCards['plant-consents'] ? (
                    <div className="card-collapsed-summary">
                      <Scale size={14} color="var(--rose)" />
                      <span>CTO: {authUser.regId || plantRegId} · Cap: {authUser.emissionCap || plantEmissionCap}</span>
                    </div>
                  ) : (
                    <>
                      <div className="profile-consent-box">
                        <div className="consent-top-item">
                          <div className="consent-label-row">
                            <span className="consent-label">
                              <FileCheck size={13} color="var(--mint-hover)" /> <JargonTooltip term="CTO">Consent to Operate (CTO)</JargonTooltip> No.
                            </span>
                            <button
                              type="button"
                              className="btn-copy-consent"
                              onClick={handleCopyRegId}
                              title="Copy Consent Number"
                            >
                              {copiedRegId ? <Check size={12} color="var(--mint-hover)" /> : <Copy size={12} />}
                              <span>{copiedRegId ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <div className="consent-reg-number-display">
                            <code>{authUser.regId || plantRegId}</code>
                          </div>
                        </div>

                        <div className="consent-category-block">
                          <div className="consent-label-row">
                            <span className="consent-label"><ShieldAlert size={13} /> <JargonTooltip term="Orange Category">Pollution Category</JargonTooltip></span>
                            <span className={`reg-cat-badge ${getCategoryBadgeClass(authUser.regCategory || plantRegCategory)}`}>
                              {(authUser.regCategory || plantRegCategory).split('(')[0].trim()}
                            </span>
                          </div>
                          <p className="category-explanation">
                            {(authUser.regCategory || plantRegCategory).includes('Red')
                              ? 'Heavy industrial operations (Pollution Index 60+). Requires continuous online emission monitoring.'
                              : (authUser.regCategory || plantRegCategory).includes('Green')
                              ? 'Low impact operations (Pollution Index 21–40). Simplified periodic consent renewals.'
                              : 'Moderate impact category (PI 41–59). Standard quarterly compliance reporting under Air/Water Acts.'}
                          </p>
                        </div>

                        <div className="consent-cap-meter">
                          <div className="cap-meter-header">
                            <span className="cap-meter-title"><JargonTooltip term="tCO2e">Consented Emission Ceiling</JargonTooltip></span>
                            <strong className="cap-meter-val">{authUser.emissionCap || plantEmissionCap}</strong>
                          </div>
                          <div className="cap-meter-bar-track">
                            <div className="cap-meter-bar-fill" style={{ width: '43%' }} />
                          </div>
                          <div className="cap-meter-footer">
                            <span>Estimated Current Run-Rate: ~194.7 MT</span>
                            <span style={{ color: 'var(--mint-hover)', fontWeight: 700 }}>43% of Permissible Cap</span>
                          </div>
                        </div>

                        <div className="profile-spec-row" style={{ marginTop: '12px' }}>
                          <span className="spec-label"><Scale size={13} /> <JargonTooltip term="SPCB">Primary Standard</JargonTooltip></span>
                          <span className="spec-val" style={{ fontWeight: 700 }}>
                            {authUser.regStandard || plantRegStandard}
                          </span>
                        </div>
                      </div>

                      <div className="profile-card-footer-action">
                        <button
                          type="button"
                          className="btn-profile-card-action"
                          onClick={() => setCurrentPage('edit-plant')}
                        >
                          <Edit2 size={14} /> Modify Regulatory Framework &amp; Consents
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Physical Process Streams Baseline Ribbon */}
              <div className="profile-stream-baseline-card elite-card">
                <div className="profile-card-header">
                  <div className="card-header-icon icon-emerald">
                    <Factory size={18} />
                  </div>
                  <div className="card-header-titles">
                    <h3 className="profile-card-title">Configured Process Streams Baseline</h3>
                    <span className="profile-card-subtitle">Industrial utility &amp; raw material throughput profiles</span>
                  </div>
                  <div className="card-header-actions" style={{ marginLeft: 'auto' }}>
                    <button
                      type="button"
                      className="btn-card-collapse-toggle"
                      onClick={() => toggleCard('plant-streams')}
                      title={collapsedCards['plant-streams'] ? "Expand section" : "Collapse section"}
                      aria-label="Toggle section collapse"
                    >
                      {collapsedCards['plant-streams'] ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                    </button>
                  </div>
                </div>

                {collapsedCards['plant-streams'] ? (
                  <div className="card-collapsed-summary">
                    <Zap size={14} color="var(--mint-hover)" />
                    <span>20,000 kWh Power · 500 L Diesel · 60,000 kg Virgin Resin · 50% Circular PCR Target</span>
                  </div>
                ) : (
                  <div className="profile-stream-grid">
                    <div className="stream-badge-card">
                      <div className="stream-badge-header">
                        <Zap size={15} color="var(--mint-hover)" />
                        <span>Grid Utility Power</span>
                      </div>
                      <strong className="stream-badge-value">20,000 <JargonTooltip term="kWh">kWh</JargonTooltip></strong>
                      <span className="stream-badge-sub"><JargonTooltip term="Scope 2">Scope 2</JargonTooltip> (0.82 kg CO₂e / kWh)</span>
                    </div>

                    <div className="stream-badge-card">
                      <div className="stream-badge-header">
                        <Flame size={15} color="var(--rose)" />
                        <span>Thermal Boiler Fuel</span>
                      </div>
                      <strong className="stream-badge-value">500 Liters Diesel</strong>
                      <span className="stream-badge-sub"><JargonTooltip term="Scope 1">Scope 1</JargonTooltip> (2.68 kg CO₂e / L)</span>
                    </div>

                    <div className="stream-badge-card">
                      <div className="stream-badge-header">
                        <Layers size={15} color="var(--emerald-main)" />
                        <span>Raw Virgin Polymer</span>
                      </div>
                      <strong className="stream-badge-value">60,000 kg <JargonTooltip term="Virgin Material">Virgin Resin</JargonTooltip></strong>
                      <span className="stream-badge-sub"><JargonTooltip term="Scope 3">Scope 3</JargonTooltip> Inflow (3.10 kg/kg)</span>
                    </div>

                    <div className="stream-badge-card">
                      <div className="stream-badge-header">
                        <TrendingDown size={15} color="var(--mint-hover)" />
                        <span>Circular Substitution</span>
                      </div>
                      <strong className="stream-badge-value">50% <JargonTooltip term="PCR">Recycled PCR</JargonTooltip></strong>
                      <span className="stream-badge-sub"><JargonTooltip term="Closed-Loop">Closed-Loop</JargonTooltip> Alternative</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════════
              PAGE 4: EDIT PLANT INFORMATION (SEPARATE EDIT PAGE)
             ═════════════════════════════════════════════════════════════════════ */}
          {currentPage === 'edit-plant' && (
            <div className="profile-dedicated-edit-page">
              {/* Back breadcrumb bar */}
              <div className="edit-page-breadcrumb-bar">
                <button
                  type="button"
                  className="btn-back-breadcrumb"
                  onClick={() => setCurrentPage('plant')}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Plant Information</span>
                </button>
                <span className="breadcrumb-divider">/</span>
                <span className="breadcrumb-current">Edit Plant Parameters &amp; Consents</span>
              </div>

              {/* Edit Header */}
              <div className="edit-page-header-card elite-card">
                <div className="edit-page-header-content">
                  <div className="edit-header-icon-wrap icon-cyan">
                    <Factory size={22} />
                  </div>
                  <div>
                    <h2 className="edit-page-title">Edit Plant Parameters &amp; Regulatory Consents</h2>
                    <p className="edit-page-sub">
                      Configure physical manufacturing site, GPS telemetry, SPCB Consent to Operate (CTO), and permissible emission caps.
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Plant Form */}
              <form onSubmit={handleSavePlant} className="profile-clean-edit-form elite-card">
                <div className="edit-form-grid-two-col">
                  {/* Left Column: Facility & Location */}
                  <div className="edit-form-col">
                    <div className="edit-sub-section-title">
                      <Building2 size={16} color="var(--cyan-main)" />
                      <span>Facility Identity &amp; Physical Site</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">
                        Facility / Company Name <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="dash-input"
                        value={plantFacility}
                        onChange={(e) => setPlantFacility(e.target.value)}
                        placeholder="e.g. GreenPack Plastics Ltd."
                        required
                      />
                      <span className="field-hint">Registered legal name of the manufacturing plant.</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">Industry Classification / Sector</label>
                      <select
                        className="dash-select"
                        value={plantIndustry}
                        onChange={(e) => setPlantIndustry(e.target.value)}
                      >
                        <option value="Plastic Processing & Extrusion">Plastic Processing &amp; Extrusion</option>
                        <option value="Polymer Compounding & Injection Moulding">Polymer Compounding &amp; Injection</option>
                        <option value="Metal Fabrication & Machining">Metal Fabrication &amp; Machining</option>
                        <option value="Chemical & Petrochemical Processing">Chemical &amp; Petrochemical</option>
                        <option value="Textile & Dyeing Operations">Textile &amp; Dyeing Operations</option>
                        <option value="Automotive Component Manufacturing">Automotive Components</option>
                        <option value="Food & Agro Processing">Food &amp; Agro Processing</option>
                      </select>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">Annual Production Capacity</label>
                      <input
                        type="text"
                        className="dash-input"
                        value={plantCapacity}
                        onChange={(e) => setPlantCapacity(e.target.value)}
                        placeholder="e.g. 2,400 MT / Year"
                      />
                    </div>

                    <div className="edit-form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label className="dash-label" style={{ margin: 0 }}>
                          Plant Address &amp; Industrial Estate <span className="req-star">*</span>
                        </label>
                        <button
                          type="button"
                          className="btn-gps-detect-inline"
                          onClick={handleAutoDetectLocation}
                          disabled={locationDetecting}
                          title="Auto-detect coordinates via browser GPS"
                        >
                          {locationDetecting ? (
                            <>
                              <RefreshCw size={11} className="spin" />
                              <span>Detecting...</span>
                            </>
                          ) : (
                            <>
                              <LocateFixed size={11} />
                              <span>Auto GPS</span>
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        className="dash-input font-mono-val"
                        rows={3}
                        value={plantLocation}
                        onChange={(e) => setPlantLocation(e.target.value)}
                        placeholder="e.g. MIDC Bhosari Industrial Area, Pune, Maharashtra 411026"
                        required
                      />
                      {locationStatusMsg && (
                        <span className="location-feedback-pill pill-success">
                          <Check size={12} /> {locationStatusMsg}
                        </span>
                      )}
                      <span className="field-hint">Used for state grid emission factor selection.</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">Regional Pollution Control Board Office</label>
                      <input
                        type="text"
                        className="dash-input"
                        value={plantRegionalOffice}
                        onChange={(e) => setPlantRegionalOffice(e.target.value)}
                        placeholder="e.g. MPCB Regional Office, Pune"
                      />
                    </div>
                  </div>

                  {/* Right Column: Regulatory Consents */}
                  <div className="edit-form-col">
                    <div className="edit-sub-section-title">
                      <Scale size={16} color="var(--rose)" />
                      <span>SPCB &amp; CPCB Regulatory Consents</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">
                        Consent to Operate (CTO) No. <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        className="dash-input font-mono-val"
                        value={plantRegId}
                        onChange={(e) => setPlantRegId(e.target.value)}
                        placeholder="e.g. MH-SPCB/PUN/CTO-2026/4102"
                        required
                      />
                      <span className="field-hint">Official SPCB operating permit serial number.</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">CPCB Pollution Category Norm</label>
                      <select
                        className="dash-select"
                        value={plantRegCategory}
                        onChange={(e) => setPlantRegCategory(e.target.value)}
                      >
                        <option value="Orange Category (Pollution Index 41-59 - Moderate)">Orange Category (PI 41-59 - Moderate)</option>
                        <option value="Red Category (Pollution Index 60+ - High Impact)">Red Category (PI 60+ - High Impact)</option>
                        <option value="Green Category (Pollution Index 21-40 - Low Impact)">Green Category (PI 21-40 - Low Impact)</option>
                        <option value="White Category (Pollution Index up to 20 - Non-Polluting)">White Category (PI 0-20 - Non-Polluting)</option>
                      </select>
                      <span className="field-hint">Determines monitoring frequency and renewal cycles.</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">Permissible Emission Ceiling</label>
                      <input
                        type="text"
                        className="dash-input font-mono-val"
                        value={plantEmissionCap}
                        onChange={(e) => setPlantEmissionCap(e.target.value)}
                        placeholder="e.g. 450 MT CO2e / Year"
                      />
                      <span className="field-hint">Max annual greenhouse gas output consented by SPCB.</span>
                    </div>

                    <div className="edit-form-group">
                      <label className="dash-label">Applicable Reporting Framework</label>
                      <select
                        className="dash-select"
                        value={plantRegStandard}
                        onChange={(e) => setPlantRegStandard(e.target.value)}
                      >
                        <option value="SPCB Consent to Operate & Water/Air Acts">SPCB Consent to Operate (CTO)</option>
                        <option value="SEBI BRSR Core Standards">SEBI BRSR Core Standards</option>
                        <option value="GHG Protocol & ISO 14064-1">GHG Protocol &amp; ISO 14064-1</option>
                        <option value="EU CBAM Importer Verification">EU CBAM Importer Verification</option>
                      </select>
                      <span className="field-hint">Reporting guidelines for audit export documents.</span>
                    </div>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="edit-form-actions-bar">
                  <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <Save size={16} /> Save Plant Parameters
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setCurrentPage('plant')}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

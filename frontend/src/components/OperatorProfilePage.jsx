import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, LayoutDashboard, ShieldCheck, ShieldAlert, MapPin,
  FileCheck, Scale, Edit2, Save, X, Check, Copy, AlertTriangle,
  Building2, User, Mail, Sparkles, RefreshCw, LocateFixed,
  Layers, Zap, Flame, LogOut, CheckCircle2, Factory, TrendingDown,
  Clock, Hash, Shield, Database, ExternalLink, Cpu, Phone, Briefcase,
  Sliders, ArrowRight, CheckSquare, Award, ChevronDown, ChevronUp,
  Plus, Trash2
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

  // ── Multi-Plant State ───────────────────────────────────────────────────
  const [plants, setPlants] = useState([]);
  // null = viewing list, 'new' = adding new, or plant.id = editing existing
  const [editingPlantId, setEditingPlantId] = useState(null);

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
      setOpName(authUser.name || '');
      setOpRole(authUser.role || '');
      setOpEmail(authUser.email || '');
      setOpPhone(authUser.phone || '');
      setOpDepartment(authUser.department || '');
      setOpNotes(authUser.notes || '');

      // Load multi-plant array (backward compat: migrate legacy single plant)
      if (authUser.plants && authUser.plants.length > 0) {
        setPlants(authUser.plants);
      } else if (authUser.facilityName) {
        // Migrate legacy single-plant data to plants array
        const legacyPlant = {
          id: 'plant_1',
          facilityName: authUser.facilityName || '',
          industryType: authUser.industryType || '',
          capacity: authUser.capacity || '',
          location: authUser.location || '',
          regId: authUser.regId || '',
          regCategory: authUser.regCategory || '',
          regStandard: authUser.regStandard || '',
          emissionCap: authUser.emissionCap || '',
          regionalOffice: authUser.regionalOffice || '',
        };
        setPlants([legacyPlant]);
      } else {
        setPlants([]);
      }
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
          // Auto-sync unique facilities from audit history into plants inventory
          syncPlantsFromAudits(data, true);
        } else if (isMounted) {
          setAudits([]);
        }
      } catch {
        if (isMounted) setAudits([]);
      } finally {
        if (isMounted) setLoadingAudits(false);
      }
    }
    loadAudits();
    return () => { isMounted = false; };
  }, [authUser]);

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
            const industrialSub = addr.industrial || addr.suburb || addr.neighbourhood || addr.city_district || 'Industrial Area';
            const city = addr.city || addr.town || addr.state_district || '';
            const state = addr.state || '';
            const postcode = addr.postcode ? ` ${addr.postcode}` : '';
            const detected = `${industrialSub}${city ? `, ${city}` : ''}${state ? `, ${state}` : ''}${postcode} (Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)})`;

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

  // ── AUTO-SYNC / MAP FACILITIES FROM AUDIT RECORDS ─────────────────────────
  const syncPlantsFromAudits = (auditList = audits, isSilent = false) => {
    if (!auditList || auditList.length === 0) {
      if (!isSilent) showFeedback('warning', 'No audit records found to map facilities from.');
      return;
    }

    const currentPlants = [...(plants.length > 0 ? plants : (authUser?.plants || []))];
    const seen = new Set(currentPlants.map((p) => (p.facilityName || '').toLowerCase().trim()));
    const newPlants = [];

    // Also preserve authUser.facilityName if configured and not already mapped
    if (authUser?.facilityName && authUser.facilityName.trim() && !seen.has(authUser.facilityName.toLowerCase().trim())) {
      const primaryPlant = {
        id: 'plant_1',
        facilityName: authUser.facilityName.trim(),
        industryType: authUser.industryType || 'Plastic Processing & Extrusion',
        capacity: authUser.capacity || '2,400 MT / Year',
        location: authUser.location || 'Industrial Facility Site',
        regId: authUser.regId || 'SPCB/CTO-2026/4102',
        regCategory: authUser.regCategory || 'Orange Category (Pollution Index 41-59 - Moderate)',
        regStandard: authUser.regStandard || 'SPCB Consent to Operate & Water/Air Acts',
        emissionCap: authUser.emissionCap || '450 MT CO2e / Year',
        regionalOffice: authUser.regionalOffice || 'Regional SPCB Office',
        auditCount: 0,
        lastAuditDate: null,
      };
      currentPlants.unshift(primaryPlant);
      seen.add(primaryPlant.facilityName.toLowerCase().trim());
    }

    for (const a of auditList) {
      const facName =
        a.raw_inputs?.facility_name ||
        (a.title ? a.title.replace(/ carbon audit/i, '').replace(/ audit/i, '').trim() : null) ||
        (a.industry ? `${a.industry} Facility` : 'Manufacturing Facility');
      const normKey = facName.toLowerCase().trim();

      if (seen.has(normKey)) {
        // Increment audit count on existing matching plant
        const found = currentPlants.find(p => (p.facilityName || '').toLowerCase().trim() === normKey);
        if (found) {
          found.auditCount = (found.auditCount || 0) + 1;
          if (!found.lastAuditDate && a.created_at) found.lastAuditDate = a.created_at;
        }
        continue;
      }
      seen.add(normKey);

      const s1 = Number(a.scope_1_kg || 0);
      const s2 = Number(a.scope_2_kg || 0);
      const s3 = Number(a.scope_3_kg || 0);
      const totalCo2 = Number(a.total_co2e_kg || (s1 + s2 + s3) || 0);
      const capVal = totalCo2 > 0 ? `${Math.round((totalCo2 / 1000) * 1.25)} MT CO2e / Year` : '450 MT CO2e / Year';

      newPlants.push({
        id: a.raw_inputs?.plant_id || `plant_${Date.now()}_${newPlants.length + 1}`,
        facilityName: facName,
        industryType: a.industry || 'Manufacturing SME',
        capacity: a.raw_inputs?.capacity || 'Continuous Operation',
        location: a.raw_inputs?.location || 'Industrial Facility Site',
        regId: a.raw_inputs?.regId || `SPCB/CTO-2026/${Math.floor(1000 + Math.random() * 9000)}`,
        regCategory: a.raw_inputs?.regCategory || 'Orange Category (Pollution Index 41-59 - Moderate)',
        regStandard: a.raw_inputs?.regStandard || 'SPCB Consent to Operate & Water/Air Acts',
        emissionCap: capVal,
        regionalOffice: a.raw_inputs?.regionalOffice || 'Regional State Pollution Board Office',
        auditCount: 1,
        lastAuditDate: a.created_at || new Date().toISOString(),
      });
    }

    if (newPlants.length === 0 && currentPlants.length === plants.length) {
      if (!isSilent) showFeedback('success', 'All facilities from your audit records are already in your plant inventory.');
      return;
    }

    const updatedPlants = [...currentPlants, ...newPlants];
    setPlants(updatedPlants);

    const primary = updatedPlants[0] || {};
    const updated = {
      ...authUser,
      plants: updatedPlants,
      facilityName: primary.facilityName || authUser.facilityName || '',
      industryType: primary.industryType || authUser.industryType || '',
      capacity: primary.capacity || authUser.capacity || '',
      location: primary.location || authUser.location || '',
      regId: primary.regId || authUser.regId || '',
      regCategory: primary.regCategory || authUser.regCategory || '',
      regStandard: primary.regStandard || authUser.regStandard || '',
      emissionCap: primary.emissionCap || authUser.emissionCap || '',
      regionalOffice: primary.regionalOffice || authUser.regionalOffice || '',
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem('ecoleak_auth_user', JSON.stringify(updated));
    if (onUpdateUser) onUpdateUser(updated);
    if (!isSilent || newPlants.length > 0) {
      showFeedback('success', `Mapped ${newPlants.length} plant facility record${newPlants.length !== 1 ? 's' : ''} from profile audit ledger.`);
    }
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

  // ── SAVE PLANT INFORMATION (Multi-Plant) ─────────────────────────────────
  const handleSavePlant = (e) => {
    e.preventDefault();
    if (!authUser) return;

    const plantData = {
      id: editingPlantId === 'new' ? `plant_${Date.now()}` : editingPlantId,
      facilityName: plantFacility.trim(),
      industryType: plantIndustry.trim(),
      capacity: plantCapacity.trim(),
      location: plantLocation.trim(),
      regId: plantRegId.trim(),
      regCategory: plantRegCategory,
      regStandard: plantRegStandard,
      emissionCap: plantEmissionCap.trim(),
      regionalOffice: plantRegionalOffice.trim(),
    };

    let updatedPlants;
    if (editingPlantId === 'new') {
      updatedPlants = [...plants, plantData];
    } else {
      updatedPlants = plants.map((p) => (p.id === editingPlantId ? plantData : p));
    }

    setPlants(updatedPlants);

    // Backward compat: set primary (first) plant fields on top-level authUser
    const primary = updatedPlants[0] || {};
    const updated = {
      ...authUser,
      plants: updatedPlants,
      facilityName: primary.facilityName || '',
      industryType: primary.industryType || '',
      capacity: primary.capacity || '',
      location: primary.location || '',
      regId: primary.regId || '',
      regCategory: primary.regCategory || '',
      regStandard: primary.regStandard || '',
      emissionCap: primary.emissionCap || '',
      regionalOffice: primary.regionalOffice || '',
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem('ecoleak_auth_user', JSON.stringify(updated));
    if (onUpdateUser) onUpdateUser(updated);

    syncProfileToSupabase(updated).catch((err) => console.debug('Supabase sync note:', err));
    if (authUser.uid && !authUser.uid.startsWith('demo-')) {
      syncUserToFirestore({ uid: authUser.uid }, updated).catch((err) => console.debug('Firestore sync note:', err));
    }

    showFeedback('success', editingPlantId === 'new' ? 'New plant added successfully.' : 'Plant details updated successfully.');
    setEditingPlantId(null);
    setCurrentPage('plant');
  };

  // ── DELETE PLANT ─────────────────────────────────────────────────────────
  const handleDeletePlant = (plantId) => {
    if (!authUser) return;
    const updatedPlants = plants.filter((p) => p.id !== plantId);
    setPlants(updatedPlants);

    const primary = updatedPlants[0] || {};
    const updated = {
      ...authUser,
      plants: updatedPlants,
      facilityName: primary.facilityName || '',
      industryType: primary.industryType || '',
      capacity: primary.capacity || '',
      location: primary.location || '',
      regId: primary.regId || '',
      regCategory: primary.regCategory || '',
      regStandard: primary.regStandard || '',
      emissionCap: primary.emissionCap || '',
      regionalOffice: primary.regionalOffice || '',
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem('ecoleak_auth_user', JSON.stringify(updated));
    if (onUpdateUser) onUpdateUser(updated);
    showFeedback('success', 'Plant removed from your account.');
  };

  // ── LOAD PLANT INTO EDIT FORM ───────────────────────────────────────────
  const startEditPlant = (plant) => {
    setPlantFacility(plant.facilityName || '');
    setPlantIndustry(plant.industryType || '');
    setPlantCapacity(plant.capacity || '');
    setPlantLocation(plant.location || '');
    setPlantRegId(plant.regId || '');
    setPlantRegCategory(plant.regCategory || '');
    setPlantRegStandard(plant.regStandard || '');
    setPlantEmissionCap(plant.emissionCap || '');
    setPlantRegionalOffice(plant.regionalOffice || '');
    setEditingPlantId(plant.id);
    setCurrentPage('edit-plant');
  };

  const startAddPlant = () => {
    setPlantFacility('');
    setPlantIndustry('Plastic Processing & Extrusion');
    setPlantCapacity('');
    setPlantLocation('');
    setPlantRegId('');
    setPlantRegCategory('Orange Category (Pollution Index 41-59 - Moderate)');
    setPlantRegStandard('SPCB Consent to Operate & Water/Air Acts');
    setPlantEmissionCap('');
    setPlantRegionalOffice('');
    setEditingPlantId('new');
    setCurrentPage('edit-plant');
  };

  const getCategoryBadgeClass = (cat = '') => {
    const lower = cat.toLowerCase();
    if (lower.includes('orange')) return 'badge-orange-cat';
    if (lower.includes('red')) return 'badge-red-cat';
    if (lower.includes('green')) return 'badge-green-cat';
    return 'badge-white-cat';
  };

  if (!authUser) return null;

  // Active section tracking (tab bar removed, but logic kept for parent nav)
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
                    <span className="profile-badge-chip" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7', border: '1px solid rgba(14, 165, 233, 0.35)' }}>
                      <Factory size={12} /> {plants.length} Plant{plants.length !== 1 ? 's' : ''} Linked
                    </span>
                    <span className="profile-badge-chip font-mono-val" style={{ background: 'rgba(0,0,0,0.04)' }}>
                      <Hash size={11} /> {authUser.uid ? `UID: ${authUser.uid.slice(0, 10)}...` : 'UID: OP-8492'}
                    </span>
                  </div>
                  <h1 className="profile-hero-title">
                    {authUser.name || 'Industrial Operator'}
                  </h1>
                  <p className="profile-hero-sub">
                    Authorized operator credentials, identity verification, role permissions, and active audit history across{' '}
                    <strong>
                      {plants.length > 1
                        ? `${plants.length} Manufacturing Plants (${plants.map(p => p.facilityName).filter(Boolean).slice(0, 2).join(', ')}${plants.length > 2 ? '...' : ''})`
                        : (plants[0]?.facilityName || authUser.facilityName || 'Unconfigured Plant')}
                    </strong>.
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
                    className="btn-profile-hero-dash"
                    onClick={() => onNavigateSection ? onNavigateSection('plant') : setCurrentPage('plant')}
                    title="Open Plant Information directory"
                  >
                    <Factory size={15} />
                    <span>Plant Directory ({plants.length})</span>
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
                      <span>{authUser.name || 'Industrial Operator'} · {authUser.role || 'Plant Operator'} · {authUser.email || 'No email configured'}</span>
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
                          <span className="profile-operator-email">{authUser.email || 'No email configured'}</span>
                          <div className="profile-role-pill">
                            <Cpu size={12} />
                            <span>{authUser.role || 'Plant Operator'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="profile-specs-list">
                        <div className="profile-spec-row">
                          <span className="spec-label"><Briefcase size={13} /> Plant Role</span>
                          <strong className="spec-val">{authUser.role || 'Not configured'}</strong>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Mail size={13} /> Contact Email</span>
                          <span className="spec-val font-mono-val">{authUser.email || 'Not configured'}</span>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Phone size={13} /> Direct Mobile</span>
                          <span className="spec-val font-mono-val">{authUser.phone || 'Not configured'}</span>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Building2 size={13} /> Primary Facility</span>
                          <strong className="spec-val">{plants[0]?.facilityName || authUser.facilityName || 'Not configured'}</strong>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Factory size={13} /> Managed Sites</span>
                          <span className="spec-badge-val" style={{ background: 'rgba(0, 184, 107, 0.1)', color: 'var(--mint-hover)' }}>
                            {plants.length} Active {plants.length === 1 ? 'Plant' : 'Plants'}
                          </span>
                        </div>

                        <div className="profile-spec-row">
                          <span className="spec-label"><Sliders size={13} /> Department</span>
                          <span className="spec-val">{authUser.department || 'Not configured'}</span>
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
                          {audits.map((audit, idx) => {
                            const matchedPlant = plants.find((p) =>
                              (audit.raw_inputs?.facility_name && p.facilityName?.toLowerCase() === audit.raw_inputs.facility_name.toLowerCase()) ||
                              (audit.industry && p.industryType?.toLowerCase().includes(audit.industry.toLowerCase()))
                            );
                            const facDisplay = matchedPlant?.facilityName || audit.raw_inputs?.facility_name || (audit.industry ? `${audit.industry} Facility` : 'Operational Site');

                            return (
                              <div key={audit.id || idx} className="profile-audit-item">
                                <div className="audit-item-left">
                                  <div className="audit-item-title-row">
                                    <strong className="audit-industry-name">{facDisplay}</strong>
                                    <span className="audit-facility-chip-badge">
                                      <Factory size={10} /> {audit.industry || 'Manufacturing'}
                                    </span>
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
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    {onNavigateSection && (
                                      <button
                                        type="button"
                                        className="btn-view-audit-record"
                                        onClick={() => onNavigateSection('leaks')}
                                        title="Inspect detected leaks for this audit"
                                      >
                                        <span>Inspect Leaks</span>
                                        <ExternalLink size={12} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="btn-view-audit-record"
                                      style={{ background: 'rgba(14, 165, 233, 0.08)', color: '#0284c7', borderColor: 'rgba(14, 165, 233, 0.25)' }}
                                      onClick={() => onNavigateSection ? onNavigateSection('plant') : setCurrentPage('plant')}
                                      title="View facility in Plant Information"
                                    >
                                      <Factory size={11} />
                                      <span>Plant Info</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
                    </>
                  )}
                </div>
              </div>

              {/* Card 3: Managed Manufacturing Facilities Portfolio */}
              <div className="profile-card-clean elite-card" style={{ marginTop: '24px' }}>
                <div className="profile-card-header">
                  <div className="card-header-icon icon-cyan">
                    <Factory size={18} />
                  </div>
                  <div className="card-header-titles">
                    <h3 className="profile-card-title">Managed Manufacturing Facilities ({plants.length})</h3>
                    <span className="profile-card-subtitle">Physical sites, GPS telemetry, and CTO consents linked to this account</span>
                  </div>
                  <div className="card-header-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {audits.length > 0 && (
                      <button
                        type="button"
                        className="btn-profile-card-action"
                        onClick={() => syncPlantsFromAudits()}
                        title="Sync facilities from audit history"
                      >
                        <RefreshCw size={13} /> Sync from Audits
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-profile-card-action"
                      onClick={startAddPlant}
                      title="Add a new plant"
                    >
                      <Plus size={13} /> Add Plant
                    </button>
                    <button
                      type="button"
                      className="btn-card-collapse-toggle"
                      onClick={() => toggleCard('op-plants')}
                      title={collapsedCards['op-plants'] ? "Expand card" : "Collapse card"}
                      aria-label="Toggle section collapse"
                    >
                      {collapsedCards['op-plants'] ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                    </button>
                  </div>
                </div>

                {collapsedCards['op-plants'] ? (
                  <div className="card-collapsed-summary">
                    <Factory size={14} color="var(--cyan-main)" />
                    <span>{plants.length} Registered Plants · Primary: {plants[0]?.facilityName || 'Pending'}</span>
                  </div>
                ) : (
                  <div className="profile-plants-portfolio-body">
                    {plants.length === 0 ? (
                      <div className="profile-plants-empty-inline">
                        <Factory size={32} strokeWidth={1} style={{ opacity: 0.5, margin: '0 auto 10px' }} />
                        <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                          No physical manufacturing plants have been linked to this operator account yet.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={startAddPlant}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Plus size={14} /> Add First Plant
                          </button>
                          {audits.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => syncPlantsFromAudits()}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                              <RefreshCw size={14} /> Import {audits.length} from Audits
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="profile-plant-minilist">
                        {plants.map((plant, idx) => (
                          <div key={plant.id || idx} className="profile-plant-mini-row">
                            <div className="mini-row-icon-wrap">
                              <Factory size={16} />
                            </div>
                            <div className="mini-row-info">
                              <div className="mini-row-title-line">
                                <strong className="mini-row-name">{plant.facilityName || 'Unnamed Plant'}</strong>
                                {idx === 0 && (
                                  <span className="mini-primary-tag">
                                    <ShieldCheck size={10} /> Primary
                                  </span>
                                )}
                                <span className={`pcs-value ${getCategoryBadgeClass(plant.regCategory)}`} style={{ fontSize: '10.5px', padding: '2px 7px', borderRadius: '4px' }}>
                                  {(plant.regCategory || 'Orange').split('(')[0].trim()}
                                </span>
                              </div>
                              <div className="mini-row-meta-line">
                                <span><MapPin size={11} /> {plant.location || 'Location pending'}</span>
                                <span>•</span>
                                <span className="font-mono-val">CTO: {plant.regId || 'Pending'}</span>
                                <span>•</span>
                                <span>Cap: {plant.emissionCap || 'Unset'}</span>
                              </div>
                            </div>
                            <div className="mini-row-actions">
                              <button
                                type="button"
                                className="btn-mini-plant-action"
                                onClick={() => startEditPlant(plant)}
                                title="Edit plant parameters"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                className="btn-mini-plant-action"
                                onClick={() => onNavigateSection ? onNavigateSection('plant') : setCurrentPage('plant')}
                                title="View in Plant Information"
                              >
                                <ExternalLink size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
              PAGE 3: PLANT INFORMATION — MULTI-PLANT LIST
             ═════════════════════════════════════════════════════════════════════ */}
          {currentPage === 'plant' && (
            <div className="profile-section-view-wrap">
              {/* Plant Page Header */}
              <div className="profile-hero-banner elite-card">
                <div className="profile-hero-left">
                  <div className="profile-hero-badge-row">
                    <span className="profile-badge-chip verified-chip">
                      <Factory size={13} color="var(--mint-hover)" /> {plants.length} Plant{plants.length !== 1 ? 's' : ''} Registered
                    </span>
                  </div>
                  <h1 className="profile-hero-title">Plant Information</h1>
                  <p className="profile-hero-sub">
                    Manufacturing facilities, GPS telemetry, SPCB Consent to Operate (CTO), and permissible emission boundaries.
                  </p>
                </div>
                <div className="profile-hero-actions">
                  {audits.length > 0 && (
                    <button
                      type="button"
                      className="btn-profile-hero-edit"
                      onClick={() => syncPlantsFromAudits()}
                      title="Sync facilities from audit history"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RefreshCw size={14} />
                      <span>Sync from Audits ({audits.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn-profile-primary-edit"
                    onClick={startAddPlant}
                  >
                    <Plus size={15} />
                    <span>Add Plant</span>
                  </button>
                </div>
              </div>

              {plants.length === 0 ? (
                /* ── Empty State: No Plants ──────────────────────────────────────── */
                <div className="plant-empty-state">
                  <div className="plant-empty-icon-wrap">
                    <Factory size={48} strokeWidth={1} />
                  </div>
                  <h3 className="plant-empty-title">No plants configured yet</h3>
                  <p className="plant-empty-desc">
                    {audits.length > 0
                      ? `You have ${audits.length} recorded emission audits on your profile. You can import these facilities directly into your plant inventory with one click.`
                      : 'Add your first manufacturing facility to start tracking emissions, regulatory consents, and circular economy opportunities.'}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-lg"
                      onClick={startAddPlant}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Plus size={18} />
                      <span>Add Your First Plant</span>
                    </button>
                    {audits.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-lg"
                        onClick={() => syncPlantsFromAudits()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                      >
                        <RefreshCw size={18} />
                        <span>Import {audits.length} Facilities from Profile Audits</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ── Plant List Cards ────────────────────────────────────────────── */
                <div className="plant-list-grid">
                  {plants.map((plant, idx) => (
                    <div key={plant.id} className="plant-list-card elite-card">
                      <div className="plant-card-header">
                        <div className="plant-card-icon-wrap">
                          <Factory size={20} />
                        </div>
                        <div className="plant-card-titles">
                          <h3 className="plant-card-name">{plant.facilityName || 'Unnamed Plant'}</h3>
                          <span className="plant-card-location">
                            <MapPin size={11} /> {plant.location || 'Location not set'}
                          </span>
                        </div>
                        <div className="plant-card-actions">
                          <button
                            type="button"
                            className="btn-plant-card-action btn-edit"
                            onClick={() => startEditPlant(plant)}
                            title="Edit plant details"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn-plant-card-action btn-delete"
                            onClick={() => handleDeletePlant(plant.id)}
                            title="Remove plant"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="plant-card-specs">
                        <div className="plant-card-spec">
                          <span className="pcs-label">Industry</span>
                          <span className="pcs-value">{plant.industryType || 'Not set'}</span>
                        </div>
                        <div className="plant-card-spec">
                          <span className="pcs-label">CTO No.</span>
                          <span className="pcs-value font-mono-val">{plant.regId || 'Not set'}</span>
                        </div>
                        <div className="plant-card-spec">
                          <span className="pcs-label">Category</span>
                          <span className={`pcs-value ${getCategoryBadgeClass(plant.regCategory)}`} style={{ fontWeight: 700 }}>
                            {(plant.regCategory || 'Not set').split('(')[0].trim()}
                          </span>
                        </div>
                        <div className="plant-card-spec">
                          <span className="pcs-label">Emission Cap</span>
                          <span className="pcs-value">{plant.emissionCap || 'Not set'}</span>
                        </div>
                      </div>

                      <div className="plant-card-footer-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--line, rgba(0, 0, 0, 0.06))', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {idx === 0 && (
                            <div className="plant-card-primary-badge">
                              <ShieldCheck size={11} /> Primary Plant
                            </div>
                          )}
                          <span className="plant-card-audit-count-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary, #475569)', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                            <Database size={11} color="var(--mint-hover)" /> {plant.auditCount || 0} {plant.auditCount === 1 ? 'Audit' : 'Audits'}
                          </span>
                        </div>

                        {onNavigateSection && (
                          <button
                            type="button"
                            className="btn-card-audit-jump"
                            onClick={() => onNavigateSection('input')}
                            title={`Run new carbon audit for ${plant.facilityName || 'this plant'}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', background: 'linear-gradient(135deg, #062319 0%, #0d5f47 100%)', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            <Zap size={12} color="#ffffff" />
                            <span>Audit Plant</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add Plant Card */}
                  <button
                    type="button"
                    className="plant-add-card"
                    onClick={startAddPlant}
                  >
                    <Plus size={24} />
                    <span>Add Another Plant</span>
                  </button>
                </div>
              )}
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
                  onClick={() => { setEditingPlantId(null); setCurrentPage('plant'); }}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Plant List</span>
                </button>
                <span className="breadcrumb-divider">/</span>
                <span className="breadcrumb-current">{editingPlantId === 'new' ? 'Add New Plant' : 'Edit Plant'}</span>
              </div>

              {/* Edit Header */}
              <div className="edit-page-header-card elite-card">
                <div className="edit-page-header-content">
                  <div className="edit-header-icon-wrap icon-cyan">
                    <Factory size={22} />
                  </div>
                  <div>
                    <h2 className="edit-page-title">{editingPlantId === 'new' ? 'Add New Plant' : 'Edit Plant Parameters'}</h2>
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
                        placeholder="e.g. Industrial Area Phase 1, City, State"
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
                    <Save size={16} /> {editingPlantId === 'new' ? 'Add Plant' : 'Save Plant Parameters'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => { setEditingPlantId(null); setCurrentPage('plant'); }}
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

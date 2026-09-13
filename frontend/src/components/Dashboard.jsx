import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, LayoutDashboard, UploadCloud, MessageSquareText,
  Layers, BarChart3, LogIn, X, ChevronRight, Zap, Flame,
  Building2, AlertTriangle, TrendingDown, Coins, ShieldCheck,
  RefreshCw, ArrowRight, CheckCircle2, Lock, Mail, Menu,
  Download, Printer, Sparkles, Sliders, Factory, Check, Info,
  Eye, EyeOff, User, UserPlus, LogOut, UserCheck, Key, Cog, Package,
  MapPin, FileCheck, ShieldAlert, Scale, Languages, FileText, ExternalLink, Database
} from 'lucide-react';
import {
  analyzeActivities,
  analyzeDocument,
  analyzeChat,
  formatINR,
  formatCO2e,
  formatDisplayName,
  saveAuditToSupabase,
  uploadDocumentToStorage,
  fetchUploadedDocuments
} from '../services/api';
import { INDUSTRY_PRESETS } from '../data/mockData';
import { CuteEcoBotIcon } from './EcoBotChat';
import EcoBotDashboardPage from './EcoBotDashboardPage';
import OperatorProfilePage from './OperatorProfilePage';
import { UserPfp } from '../services/avatarService';
import JargonTooltip, { JargonIcon } from './JargonTooltip';
import EcoLeakLogo from './EcoLeakLogo';
import LeakVisualizer from './LeakVisualizer';
import TangibleImpactSuite from './TangibleImpactSuite';
import ActionPlanBookletModal from './ActionPlanBookletModal';

// ─── 1-Click Pre-filled Facility Profiles ─────────────────────────────────────
const PRESET_SCENARIOS = {
  'Plastic Moulding (60t Resin)': {
    Icon: Factory,
    industry: 'Plastic manufacturing',
    tag: 'Extrusion & Moulding',
    kwh: 20000,
    fuelType: 'Diesel',
    fuelQty: 500,
    materialType: 'Virgin Plastic Pellets',
    materialQty: 60000,
    wasteType: 'Sprue & Trim Scrap',
    wasteQty: 1800,
    activities: [
      { name: 'Virgin Plastic Pellets', quantity: 60000, unit: 'kg' },
      { name: 'Grid Electricity', quantity: 20000, unit: 'kWh' },
      { name: 'Diesel Fuel', quantity: 500, unit: 'liters' },
      { name: 'Color Additives', quantity: 2500, unit: 'kg' },
      { name: 'Packaging Material', quantity: 5000, unit: 'kg' },
    ]
  },
  'Metal Fabrication (2t Steel)': {
    Icon: Cog,
    industry: 'Metal fabrication',
    tag: 'Furnace & CNC Milling',
    kwh: 30000,
    fuelType: 'LPG',
    fuelQty: 450,
    materialType: 'Virgin Steel',
    materialQty: 2000,
    wasteType: 'Metal Swarf & Mill Scale',
    wasteQty: 320,
    activities: [
      { name: 'Virgin Steel', quantity: 2000, unit: 'kg' },
      { name: 'LPG', quantity: 450, unit: 'kg' },
      { name: 'Grid Electricity', quantity: 30000, unit: 'kWh' },
      { name: 'Industrial Lubricant', quantity: 200, unit: 'liters' },
    ]
  },
  'Packaging SME (5t HDPE)': {
    Icon: Package,
    industry: 'Packaging',
    tag: 'Blow Moulding & Boxes',
    kwh: 15000,
    fuelType: 'Diesel',
    fuelQty: 400,
    materialType: 'Virgin HDPE Plastic',
    materialQty: 5000,
    wasteType: 'Cardboard Waste',
    wasteQty: 1200,
    activities: [
      { name: 'Virgin HDPE Plastic', quantity: 5000, unit: 'kg' },
      { name: 'Grid Electricity', quantity: 15000, unit: 'kWh' },
      { name: 'Cardboard Waste', quantity: 1200, unit: 'kg' },
      { name: 'Packaging Material', quantity: 2000, unit: 'kg' },
      { name: 'Diesel Fuel', quantity: 400, unit: 'liters' },
    ]
  },
  'Textile & Dyeing Mill': {
    Icon: Layers,
    industry: 'Textile',
    tag: 'Boiler & Weaving Unit',
    kwh: 32000,
    fuelType: 'Coal',
    fuelQty: 1500,
    materialType: 'Virgin Kraft Paper',
    materialQty: 1800,
    wasteType: 'Process Effluent & Steam',
    wasteQty: 10000,
    activities: [
      { name: 'Grid Electricity', quantity: 32000, unit: 'kWh' },
      { name: 'Coal', quantity: 1500, unit: 'kg' },
      { name: 'Packaging Material', quantity: 1800, unit: 'kg' },
      { name: 'Process Water', quantity: 10000, unit: 'liters' },
    ]
  }
};

// ─── Simplified, Jargon-Free Sidebar Items ───────────────────────────────────
const NAV_ITEMS = [
  { id: 'input',    icon: LayoutDashboard,   label: '1. Plant Process Data',    sub: 'Energy, Materials & Waste' },
  { id: 'leaks',    icon: AlertTriangle,     label: '2. Top Emission Leaks',    sub: 'Hotspot Detection' },
  { id: 'circular', icon: RefreshCw,         label: '3. Circular Solutions',     sub: 'Interventions & Cost Savings' },
  { id: 'report',   icon: Download,          label: '4. Executive Action Plan', sub: 'Compliance & Export' },
  { id: 'profile',  icon: User,              label: '5. Operator Profile',      sub: 'Identity & Credentials' },
  { id: 'plant',    icon: Factory,           label: '6. Plant Information',      sub: 'Multi-Plant Directory & Consents' },
];

export default function Dashboard({
  onBack,
  initialSection = 'input',
  authUser,
  onUpdateUser,
  onSignOut,
  onOpenAuth,
  onOpenEcoBot,
  onSectionChange,
}) {
  const parseSection = (sec) => {
    if (sec === 'overview' || sec === 'audit' || sec === 'signin') return 'input';
    if (sec === 'results') return 'leaks';
    if (sec === 'operator') return 'profile';
    if (sec === 'chat' || sec === 'ecobot' || sec === 'copilot') return 'copilot';
    if (['input', 'leaks', 'circular', 'report', 'profile', 'plant', 'copilot'].includes(sec)) return sec;
    return 'input';
  };

  const [activeSection, setActiveSection] = useState(() => parseSection(initialSection));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(parseSection(initialSection));
    }
  }, [initialSection]);

  const handleSectionSelect = (sectionKey) => {
    setActiveSection(sectionKey);
    if (onSectionChange) onSectionChange(sectionKey);
  };

  // Authentication guard: Dashboard is strictly inaccessible to logged-out users
  useEffect(() => {
    if (!authUser) {
      if (onOpenAuth) onOpenAuth();
      else if (onBack) onBack();
    }
  }, [authUser, onOpenAuth, onBack]);

  if (!authUser) {
    return null;
  }

  // ── Input Mode Selector: 'form' | 'upload' | 'chat' ─────────────────────────
  const [inputMode, setInputMode] = useState('form');

  // ── Multi-Plant Target Selection ──────────────────────────────────────────
  const [selectedPlantId, setSelectedPlantId] = useState(() => {
    return authUser?.plants?.[0]?.id || 'primary';
  });

  useEffect(() => {
    if (authUser?.plants && authUser.plants.length > 0) {
      if (!authUser.plants.some(p => p.id === selectedPlantId)) {
        setSelectedPlantId(authUser.plants[0].id);
      }
    }
  }, [authUser?.plants]);

  const handlePlantSelectionChange = (plantId) => {
    setSelectedPlantId(plantId);
    const target = authUser?.plants?.find(p => p.id === plantId);
    if (target?.industryType) {
      const matched = Object.keys(INDUSTRY_PRESETS).find(k => k.toLowerCase() === target.industryType.toLowerCase());
      if (matched) {
        setIndustry(matched);
      } else {
        setIndustry(target.industryType);
      }
    }
  };

  // ── Process Data Form State ────────────────────────────────────────────────
  const [selectedPresetKey, setSelectedPresetKey] = useState('Plastic Moulding (60t Resin)');
  const [industry, setIndustry] = useState('Plastic manufacturing');
  const [kwh, setKwh] = useState(20000);
  const [fuelType, setFuelType] = useState('Diesel');
  const [fuelQty, setFuelQty] = useState(500);
  const [materialType, setMaterialType] = useState('Virgin Plastic Pellets');
  const [materialQty, setMaterialQty] = useState(60000);
  const [wasteType, setWasteType] = useState('Sprue & Trim Scrap');
  const [wasteQty, setWasteQty] = useState(1800);

  // ── Circular Loop Interactive Simulation ───────────────────────────────────
  const [circularRatio, setCircularRatio] = useState(100); // 0% to 100% substitution
  const [activeRecFilter, setActiveRecFilter] = useState('all'); // 'all' | 'high_impact' | 'fast_payback'

  // ── Document & Chat State ──────────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDrag, setUploadDrag] = useState(false);
  const [uploadLanguage, setUploadLanguage] = useState('auto');
  const [sarvamApiKey, setSarvamApiKey] = useState('');
  const [showSarvamKey, setShowSarvamKey] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  // ── Shared State ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditResult, setAuditResult] = useState(null);
  const [showBookletModal, setShowBookletModal] = useState(false);
  // ── Uploaded Storage Documents ─────────────────────────────────────────────
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDocs() {
      setLoadingDocs(true);
      try {
        const docs = await fetchUploadedDocuments(authUser);
        if (isMounted) setUploadedDocuments(docs || []);
      } catch (e) {
        console.debug('Failed to load documents:', e);
      } finally {
        if (isMounted) setLoadingDocs(false);
      }
    }
    loadDocs();
    return () => { isMounted = false; };
  }, [authUser]);

  // Initialize with a default run so first-time users immediately see rich data
  useEffect(() => {
    if (!auditResult) {
      handleApplyPreset('Plastic Moulding (60t Resin)', false);
    }
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const resetError = () => setError(null);

  const handleApplyPreset = async (presetKey, switchView = true) => {
    setSelectedPresetKey(presetKey);
    const p = PRESET_SCENARIOS[presetKey];
    if (!p) return;

    setIndustry(p.industry);
    setKwh(p.kwh);
    setFuelType(p.fuelType);
    setFuelQty(p.fuelQty);
    setMaterialType(p.materialType);
    setMaterialQty(p.materialQty);
    setWasteType(p.wasteType || 'Process Scrap');
    setWasteQty(p.wasteQty || 1000);

    setLoading(true);
    setError(null);
    try {
      const res = await analyzeActivities({ industry: p.industry, activities: p.activities });
      setAuditResult(res);
      if (switchView) setActiveSection('leaks');
    } catch (err) {
      setError(err.message || 'Failed to analyze scenario');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const activities = [{ name: 'Grid Electricity', quantity: Number(kwh), unit: 'kWh' }];

    if (fuelType !== 'None' && fuelQty > 0) {
      const fuelUnit = fuelType === 'Natural gas' ? 'm³' : (fuelType === 'LPG' || fuelType === 'Coal' ? 'kg' : 'liters');
      activities.push({
        name: fuelType === 'Diesel' ? 'Diesel Fuel' : fuelType,
        quantity: Number(fuelQty),
        unit: fuelUnit
      });
    }

    if (materialType !== 'None' && materialQty > 0) {
      activities.push({ name: materialType, quantity: Number(materialQty), unit: 'kg' });
    }

    if (wasteType && wasteQty > 0) {
      activities.push({ name: 'Cardboard Waste', quantity: Number(wasteQty), unit: 'kg' });
    }

    try {
      const res = await analyzeActivities({ industry, activities });
      setAuditResult(res);
      const selectedPlant = authUser?.plants?.find(p => p.id === selectedPlantId) || authUser?.plants?.[0] || null;
      saveAuditToSupabase(res, authUser, selectedPlant).catch((e) => console.debug('Background Supabase save note:', e));
      handleSectionSelect('leaks');
    } catch (err) {
      setError(err.message || 'Analysis could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a utility bill or invoice (PDF, PNG, JPG).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Upload to Supabase Storage bucket 'audit-documents' (with resilient local metadata fallback)
      let uploadedDoc = null;
      try {
        uploadedDoc = await uploadDocumentToStorage(uploadFile, authUser, selectedPlantId);
        if (uploadedDoc) {
          setUploadedDocuments(prev => [uploadedDoc, ...prev.filter(d => d.id !== uploadedDoc.id)]);
        }
      } catch (uploadErr) {
        console.warn('Storage upload note:', uploadErr);
      }

      // 2. Extract activities and compute emissions
      const res = await analyzeDocument(uploadFile, industry, uploadLanguage, sarvamApiKey);
      setAuditResult(res);

      // 3. Save audit record linked to the uploaded document
      const selectedPlant = authUser?.plants?.find(p => p.id === selectedPlantId) || authUser?.plants?.[0] || null;
      saveAuditToSupabase(res, authUser, selectedPlant, uploadedDoc).catch((e) => console.debug('Background Supabase save note:', e));
      handleSectionSelect('leaks');
    } catch (err) {
      setError(err.message || 'Document analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeChat(chatMessage);
      setAuditResult(res);
      saveAuditToSupabase(res, authUser).catch((e) => console.debug('Background Supabase save note:', e));
      handleSectionSelect('leaks');
    } catch (err) {
      setError(err.message || 'Plant narrative parsing failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    if (onSignOut) onSignOut();
  };

  // ── Calculated Summary Numbers ─────────────────────────────────────────────
  const totalEmissions = auditResult?.facility_summary?.total_emissions_kg_co2e || 0;
  const rawRecs = auditResult?.circular_recommendations || [];

  // Deduplicate recommendations by alternative and target_activity
  const uniqueRecs = rawRecs.filter((rec, idx, self) =>
    idx === self.findIndex(r => r.alternative === rec.alternative && r.target_activity === rec.target_activity)
  );

  // Filter recommendations based on active pill
  const filteredRecs = uniqueRecs.filter(r => {
    if (activeRecFilter === 'high_impact') return r.co2e_reduction_percent >= 60;
    if (activeRecFilter === 'fast_payback') return (r.payback_months || 12) <= 8;
    return true;
  });

  const scaledMultiplier = circularRatio / 100;
  const simulatedSavingsKg = Math.round(uniqueRecs.reduce((acc, r) => acc + (r.co2e_savings_kg || 0), 0) * scaledMultiplier);
  const simulatedOpexSavings = Math.round(uniqueRecs.reduce((acc, r) => acc + (r.annual_opex_savings_inr || 0), 0) * scaledMultiplier);
  const totalCapex = uniqueRecs.reduce((acc, r) => acc + (r.estimated_capex_inr || 0), 0);
  const avgPaybackMonths = uniqueRecs.length > 0
    ? Math.round(uniqueRecs.reduce((acc, r) => acc + (r.payback_months || 6), 0) / uniqueRecs.length)
    : 7;

  // ── RENDER STEP 1: Process Data Inputs ──────────────────────────────────────
  const renderInputSection = () => (
    <div className="dash-content-inner">
      {/* Editorial Header */}
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section-title">Enter Plant Energy, Materials &amp; Waste</h2>
          <p className="dash-section-desc">
            Input your monthly consumption data below or load a pre-filled plant profile to identify where emissions leak.
          </p>
        </div>
      </div>

      {/* 1-Click Pre-filled Facility Profiles (Prominent & Clean) */}
      <div className="dash-card elite-card" style={{ marginBottom: '20px' }}>
        <div className="dash-card-label-row">
          <span className="dash-card-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} color="var(--mint-hover)" /> 1-CLICK PRE-FILLED PLANT PROFILES (TEST INSTANTLY)
          </span>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Select to test real benchmark data</span>
        </div>
        <div className="preset-btn-grid">
          {Object.entries(PRESET_SCENARIOS).map(([key, data]) => {
            const PresetIconComponent = data.Icon || Factory;
            return (
              <button
                key={key}
                type="button"
                disabled={loading}
                onClick={() => handleApplyPreset(key, false)}
                className={`dash-preset-pill ${selectedPresetKey === key ? 'preset-active' : ''}`}
              >
                <span className="preset-icon">
                  <PresetIconComponent size={18} color="var(--mint-hover)" />
                </span>
                <div className="preset-info">
                  <strong className="preset-name">{key}</strong>
                  <span className="preset-tag">{data.tag}</span>
                </div>
                {selectedPresetKey === key && <Check size={14} className="preset-check" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input Mode Segment Switcher */}
      <div className="input-mode-tabs-bar">
        <button
          type="button"
          className={`input-mode-tab ${inputMode === 'form' ? 'tab-active' : ''}`}
          onClick={() => setInputMode('form')}
        >
          <Zap size={15} /> Direct Process Form
        </button>
        <button
          type="button"
          className={`input-mode-tab ${inputMode === 'upload' ? 'tab-active' : ''}`}
          onClick={() => setInputMode('upload')}
        >
          <UploadCloud size={15} /> Upload Utility Bill / PDF
        </button>
        <button
          type="button"
          className={`input-mode-tab ${inputMode === 'chat' ? 'tab-active' : ''}`}
          onClick={() => setInputMode('chat')}
        >
          <MessageSquareText size={15} /> Describe in Plain Words
        </button>
      </div>

      {error && (
        <div className="dash-alert dash-alert-danger">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={resetError} className="dash-error-close"><X size={14} /></button>
        </div>
      )}

      {/* MODE 1: Direct Form */}
      {inputMode === 'form' && (
        <form onSubmit={handleDirectSubmit} className="dash-form">
          {/* Facility Sector & Target Plant Selection */}
          <div className="dash-card elite-card">
            <div className="dash-card-label">1. FACILITY CLASSIFICATION &amp; TARGET PLANT</div>

            {authUser?.plants && authUser.plants.length > 0 && (
              <div className="dash-form-group" style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label className="dash-label" style={{ margin: 0 }}>
                    <Factory size={15} color="var(--mint-hover)" /> Target Manufacturing Facility
                  </label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: 'var(--mint-hover)', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    onClick={() => handleSectionSelect('plant')}
                  >
                    Manage Plants ({authUser.plants.length}) →
                  </button>
                </div>
                <select
                  value={selectedPlantId}
                  onChange={(e) => handlePlantSelectionChange(e.target.value)}
                  className="dash-select"
                  style={{ fontWeight: 700 }}
                >
                  {authUser.plants.map((p, idx) => (
                    <option key={p.id || idx} value={p.id}>
                      {p.facilityName || `Facility ${idx + 1}`} ({p.location || 'Site Location'} · {p.industryType || 'Manufacturing'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="dash-form-group">
              <label className="dash-label"><Building2 size={15} /> Industrial Sector</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="dash-select"
              >
                {Object.keys(INDUSTRY_PRESETS).map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
                <option value="General Manufacturing">General Manufacturing / Assembly</option>
                <option value="Chemicals & Agro">Chemicals &amp; Agro</option>
              </select>
            </div>
          </div>

          {/* Energy & Fuels */}
          <div className="dash-card elite-card">
            <div className="dash-card-label">2. ENERGY SOURCE &amp; ON-SITE FUELS</div>
            <div className="dash-form-grid-2">
              <div className="dash-form-group">
                <label className="dash-label">
                  <Zap size={15} color="var(--mint-hover)" />
                  Monthly Electricity (<JargonTooltip term="kWh">kWh</JargonTooltip>)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={kwh}
                  onChange={(e) => setKwh(Math.max(0, Number(e.target.value)))}
                  className="dash-input"
                  required
                />
                <span className="input-helper">Grid utility meter reading</span>
              </div>

              <div className="dash-form-group">
                <label className="dash-label">
                  <Flame size={15} color="var(--rose)" />
                  Primary Heating / Thermal Fuel (<JargonTooltip term="Scope 1">Scope 1</JargonTooltip>)
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="dash-select"
                >
                  <option value="Diesel">Diesel Fuel (Boilers / Genset in Liters)</option>
                  <option value="LPG">LPG / Liquified Petroleum Gas (kg)</option>
                  <option value="Natural gas">Natural Gas (m³)</option>
                  <option value="Coal">Industrial Coal (kg)</option>
                  <option value="Biomass">Biomass Pellets / Briquettes (kg)</option>
                  <option value="None">None (All Electric Operation)</option>
                </select>
                <span className="input-helper">Used for steam, furnaces, or generators</span>
              </div>
            </div>

            {fuelType !== 'None' && (
              <div className="dash-form-group" style={{ marginTop: '14px' }}>
                <label className="dash-label">
                  Monthly Fuel Quantity ({fuelType === 'Natural gas' ? 'm³' : (fuelType === 'LPG' || fuelType === 'Coal' ? 'kg' : 'Liters')})
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={fuelQty}
                  onChange={(e) => setFuelQty(Math.max(0, Number(e.target.value)))}
                  className="dash-input"
                />
              </div>
            )}
          </div>

          {/* Materials & Waste Streams */}
          <div className="dash-card elite-card">
            <div className="dash-card-label">3. MATERIALS USED &amp; WASTE STREAMS</div>
            <div className="dash-form-grid-2">
              <div className="dash-form-group">
                <label className="dash-label">
                  <Layers size={15} color="var(--emerald-main)" />
                  Primary Raw Material Feedstock (<JargonTooltip term="Scope 3">Scope 3</JargonTooltip>)
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="dash-select"
                >
                  <option value="Virgin Plastic Pellets">Virgin Plastic Pellets (PP / PE Resin)</option>
                  <option value="Virgin HDPE Plastic">Virgin HDPE Plastic (Bottles &amp; Pipes)</option>
                  <option value="Virgin PP Plastic">Virgin PP Plastic (Moulding)</option>
                  <option value="Virgin LDPE Film">Virgin LDPE Film (Packaging)</option>
                  <option value="Virgin Steel">Virgin Structural Steel (Billet/Sheet)</option>
                  <option value="Virgin Aluminum">Virgin Aluminum Ingot</option>
                  <option value="Virgin Kraft Paper">Virgin Kraft Paper (Corrugated Boxes)</option>
                  <option value="Packaging Material">General Packaging &amp; Cushioning</option>
                  <option value="None">None (Pure Utility/Assembly)</option>
                </select>
              </div>

              {materialType !== 'None' && (
                <div className="dash-form-group">
                  <label className="dash-label">Monthly Material Inflow (kg)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={materialQty}
                    onChange={(e) => setMaterialQty(Math.max(0, Number(e.target.value)))}
                    className="dash-input"
                  />
                  <span className="input-helper">Weight of virgin material purchased</span>
                </div>
              )}
            </div>

            <div className="dash-form-grid-2" style={{ marginTop: '14px' }}>
              <div className="dash-form-group">
                <label className="dash-label">
                  <RefreshCw size={14} color="var(--mint-hover)" />
                  Main Waste Stream Generated
                </label>
                <input
                  type="text"
                  value={wasteType}
                  onChange={(e) => setWasteType(e.target.value)}
                  placeholder="e.g., Plastic Trimmings, Cardboard, Slag"
                  className="dash-input"
                />
              </div>
              <div className="dash-form-group">
                <label className="dash-label">Monthly Waste Output (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(Math.max(0, Number(e.target.value)))}
                  className="dash-input"
                />
              </div>
            </div>
          </div>

          {/* Elite Submit Button */}
          <div className="dash-action-bar">
            <button
              type="submit"
              disabled={loading}
              className="dash-elite-btn"
              id="dash-run-audit-btn"
            >
              {loading ? (
                <>
                  <RefreshCw size={17} className="spin-on-active" />
                  Calculating Emission Factors &amp; Circular Options...
                </>
              ) : (
                <>
                  Find Emission Leaks &amp; Calculate Savings
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* MODE 2: Bill / PDF Upload */}
      {inputMode === 'upload' && (
        <form onSubmit={handleDocumentSubmit} className="dash-form">
          <div
            className={`dash-dropzone ${uploadDrag ? 'drag-over' : ''} ${uploadFile ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setUploadDrag(true); }}
            onDragLeave={() => setUploadDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setUploadDrag(false);
              if (e.dataTransfer.files[0]) setUploadFile(e.dataTransfer.files[0]);
            }}
          >
            <UploadCloud size={46} className="dropzone-icon" />
            <h4 className="dropzone-title">
              {uploadFile ? uploadFile.name : 'Drop your utility bill or invoice here'}
            </h4>
            <p className="dropzone-sub">
              {uploadFile
                ? `${(uploadFile.size / 1024).toFixed(1)} KB · Ready to scan`
                : 'Upload electricity invoices, diesel receipts, or fuel bills (PDF, PNG, JPG)'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <label className="dash-file-label">
                {uploadFile ? 'Change File' : 'Browse Computer'}
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: 'none' }}
                  onChange={(e) => setUploadFile(e.target.files[0] || null)}
                />
              </label>
              {uploadFile && (
                <button type="button" onClick={() => setUploadFile(null)} className="dropzone-clear">
                  <X size={14} /> Remove
                </button>
              )}
            </div>
          </div>

          {/* Indic Language Support & Sarvam DocAgent Engine Badge */}
          <div className="dash-card elite-card" style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="elite-tag badge-cyan" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Languages size={13} /> Sarvam AI DocAgent (Indic OCR)
                </span>
                <span className="elite-tag badge-subtle" style={{ fontSize: '11px' }}>
                  PyMuPDF Fallback
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSarvamKey(!showSarvamKey)}
                style={{ background: 'none', border: 'none', color: 'var(--mint-hover)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {showSarvamKey ? 'Hide Custom Key' : 'Custom Sarvam API Key?'}
              </button>
            </div>

            <div className="dash-form-group">
              <label className="dash-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Languages size={15} color="var(--mint-hover)" />
                Document Language (Indian Regional &amp; Multilingual)
              </label>
              <select
                value={uploadLanguage}
                onChange={(e) => setUploadLanguage(e.target.value)}
                className="dash-select"
              >
                <option value="auto">Auto-Detect (Sarvam DocAgent for Indic)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
                <option value="mr-IN">Marathi (मराठी)</option>
                <option value="gu-IN">Gujarati (ગુજરાતી)</option>
                <option value="ta-IN">Tamil (தமிழ்)</option>
                <option value="te-IN">Telugu (తెలుగు)</option>
                <option value="bn-IN">Bengali (বাংলা)</option>
                <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                <option value="ml-IN">Malayalam (മലയാളം)</option>
                <option value="pa-IN">Punjabi (ਪੰਜਾਬੀ)</option>
                <option value="od-IN">Odia (ଓଡ଼ିଆ)</option>
                <option value="en-IN">English</option>
              </select>
              <span className="input-helper">
                Powered by Sarvam Vision 1.5 across 22+ Indian languages. PyMuPDF retained as deterministic fallback.
              </span>
            </div>

            {showSarvamKey && (
              <div className="dash-form-group" style={{ marginTop: '12px' }}>
                <label className="dash-label">
                  Sarvam AI Subscription Key (Optional override)
                </label>
                <input
                  type="password"
                  placeholder="Enter custom Sarvam API Key or leave blank to use server environment"
                  value={sarvamApiKey}
                  onChange={(e) => setSarvamApiKey(e.target.value)}
                  className="dash-input"
                />
              </div>
            )}
          </div>

          <div className="dash-action-bar">
            <button
              type="submit"
              disabled={loading || !uploadFile}
              className="dash-elite-btn"
            >
              {loading ? (
                <><RefreshCw size={17} className="spin-on-active" /> Scanning Invoice &amp; Mapping Streams...</>
              ) : (
                <>Scan Document &amp; Run Leak Detection <ArrowRight size={17} /></>
              )}
            </button>
          </div>

          {/* ── Past Documents Repository Card ── */}
          <div className="dash-card elite-card" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0,184,107,0.12)', color: 'var(--mint-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={17} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                    Past Documents
                  </h4>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Digital invoice and utility document history
                  </span>
                </div>
              </div>
              <span className="elite-tag badge-cyan" style={{ fontSize: '11px' }}>
                {uploadedDocuments.length} Document{uploadedDocuments.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loadingDocs ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <RefreshCw size={18} className="spin" style={{ margin: '0 auto 8px' }} />
                <span>Loading past documents...</span>
              </div>
            ) : uploadedDocuments.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed var(--line)' }}>
                <FileText size={28} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', opacity: 0.6 }} />
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  No Past Documents Uploaded Yet
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  Upload a PDF electricity bill, fuel voucher, or material invoice above to automatically save and track your documents.
                </p>
              </div>
            ) : (
              <div className="uploaded-docs-table-wrap" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--line-strong)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '10px 12px' }}>Document Name</th>
                      <th style={{ padding: '10px 12px' }}>File Size</th>
                      <th style={{ padding: '10px 12px' }}>Timestamp</th>
                      <th style={{ padding: '10px 12px' }}>Storage Status</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadedDocuments.map((doc, idx) => (
                      <tr key={doc.id || idx} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FileText size={15} style={{ color: 'var(--mint-hover)', flexShrink: 0 }} />
                            <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.name}>
                              {doc.name}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>
                          {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : 'PDF Document'}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {doc.status === 'stored_cloud' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#047857', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 8px', borderRadius: '100px' }}>
                              <CheckCircle2 size={11} /> Saved
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#0284c7', background: 'rgba(14, 165, 233, 0.12)', padding: '2px 8px', borderRadius: '100px' }}>
                              <Check size={11} /> Saved
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
                          {doc.url ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--mint-hover)', textDecoration: 'none' }}
                            >
                              <span>View File</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Cached Record</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </form>
      )}

      {/* MODE 3: Chat / Copilot Prompt */}
      {inputMode === 'chat' && (
        <form onSubmit={handleChatSubmit} className="dash-form">
          <div className="dash-card elite-card">
            <div className="dash-card-label">CLICK AN EXAMPLE TO AUTO-FILL:</div>
            <div className="example-prompts-list">
              {[
                'Our factory processes 60t of virgin plastic pellets monthly, uses 20,000 kWh of grid power and 500L of diesel.',
                'We run a metal fabrication unit with 2t virgin steel, 450kg LPG burners, and 30,000 kWh of power monthly.',
                'Our packaging plant uses 5t of HDPE, 15,000 kWh electricity, and produces 1.2t of cardboard waste.'
              ].map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setChatMessage(ex)}
                  className="dash-example-pill"
                >
                  <ChevronRight size={13} color="var(--mint-hover)" />
                  <span>{ex}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="dash-card elite-card">
            <div className="dash-card-label">YOUR FACTORY NARRATIVE</div>
            <textarea
              rows={5}
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="dash-textarea"
              placeholder="Describe your plant's monthly inputs, utilities, fuel consumption, and material streams in plain words..."
              required
            />
          </div>

          <div className="dash-action-bar">
            <button
              type="submit"
              disabled={loading || !chatMessage.trim()}
              className="dash-elite-btn"
            >
              {loading ? (
                <><RefreshCw size={17} className="spin-on-active" /> Extracting Process Quantities...</>
              ) : (
                <>Detect Leaks from Description <ArrowRight size={17} /></>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  // ── RENDER STEP 2: Emission Leak Points (Hotspots) ──────────────────────────
  const renderLeakSection = () => {
    if (!auditResult) {
      return (
        <div className="dash-content-inner">
          <div className="dash-empty-state">
            <AlertTriangle size={48} className="empty-icon" />
            <h3>No Emission Leaks Detected Yet</h3>
            <p>Input your plant process data in Step 1 to calculate your emission leak points.</p>
            <button className="dash-elite-btn" style={{ marginTop: '20px' }} onClick={() => setActiveSection('input')}>
              Go to Step 1: Input Data <ArrowRight size={15} />
            </button>
          </div>
        </div>
      );
    }

    const leakPoints = (auditResult.activities && auditResult.activities.length > 0)
      ? auditResult.activities
      : (auditResult.leak_points || []);
    const scopeBreakdown = auditResult.facility_summary?.scope_breakdown || {};

    return (
      <div className="dash-content-inner">
        {/* Header */}
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section-title">Where Carbon &amp; Energy Escapes</h2>
            <p className="dash-section-desc">
              Identified emission hotspots ranked by magnitude. Target these top leak points to unlock maximum financial savings.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="dash-back-btn-sm" onClick={() => setActiveSection('input')}>
              <Sliders size={14} /> Adjust Inputs
            </button>
            <button className="dash-elite-btn-sm" onClick={() => setActiveSection('circular')}>
              View Circular Solutions <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="dash-kpi-grid">
          <div className="dash-kpi-card">
            <span className="kpi-label">Total Monthly Emissions</span>
            <div className="kpi-value kpi-red">
              <JargonTooltip term="CO2e">{formatCO2e(totalEmissions, true)}</JargonTooltip>
            </div>
            <small className="kpi-sub">
              {Math.round(totalEmissions).toLocaleString()} <JargonTooltip term="CO2e">kg CO₂e</JargonTooltip> / month
            </small>
          </div>
          <div className="dash-kpi-card">
            <span className="kpi-label">Reducible by <JargonTooltip term="Circular Economy">Circularity</JargonTooltip></span>
            <div className="kpi-value kpi-green">
              <JargonTooltip term="CO2e">{formatCO2e(simulatedSavingsKg, true)}</JargonTooltip>
              <span style={{ fontSize: '13px', marginLeft: '6px', fontWeight: 600 }}>
                ({Math.round((simulatedSavingsKg / (totalEmissions || 1)) * 100)}% cut)
              </span>
            </div>
            <small className="kpi-sub">Avoidable via <JargonTooltip term="Closed-Loop">closed-loop</JargonTooltip> alternatives</small>
          </div>
          <div className="dash-kpi-card">
            <span className="kpi-label">Projected Annual <JargonTooltip term="OPEX">OPEX Savings</JargonTooltip></span>
            <div className="kpi-value kpi-cyan">{formatINR(simulatedOpexSavings, true)}/yr</div>
            <small className="kpi-sub">Net operating expense saved</small>
          </div>
        </div>

        {/* ── Interactive Graph Visualizations (Pareto 80/20 & GHG Scopes Donut) ── */}
        <LeakVisualizer
          leakPoints={leakPoints}
          scopeBreakdown={scopeBreakdown}
          totalEmissions={totalEmissions}
        />

        {/* Top Emission Hotspots / Pareto Leak Points */}
        <div className="dash-card elite-card">
          <div className="dash-card-label-row">
            <span className="dash-card-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={14} color="var(--rose)" /> TOP <JargonTooltip term="Leak Point">EMISSION LEAK POINTS</JargonTooltip> (RANKED BY SEVERITY)
            </span>
            <span className="badge-pill-danger">
              <JargonTooltip term="Pareto 80/20">80/20 Rule Hotspot Analysis</JargonTooltip>
            </span>
          </div>

          <div className="leak-points-container">
            {leakPoints.map((lp, idx) => (
              <div key={idx} className="leak-point-row">
                <div className="leak-point-header">
                  <div className="leak-title-wrap">
                    <span className="leak-rank">#{idx + 1}</span>
                    <div>
                      <strong className="leak-name">{formatDisplayName(lp.raw_name || lp.activity_key)}</strong>
                      <span className="leak-scope-tag">
                        <JargonTooltip term={lp.scope}>{lp.scope}</JargonTooltip>
                      </span>
                    </div>
                  </div>
                  <div className="leak-stat-wrap">
                    <span className="leak-qty">
                      <JargonTooltip term="CO2e">{formatCO2e(lp.co2e_kg ?? lp.emissions_kg)}</JargonTooltip>
                    </span>
                    <span className={`leak-tier-badge ${lp.share_percent >= 35 ? 'tier-critical' : 'tier-high'}`}>
                      {lp.share_percent}% of Total
                    </span>
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="leak-progress-track">
                  <div
                    className="leak-progress-fill"
                    style={{
                      width: `${Math.min(100, Math.max(8, lp.share_percent))}%`,
                      background: lp.share_percent >= 35
                        ? 'linear-gradient(90deg, #e11d48 0%, #fb7185 100%)'
                        : 'linear-gradient(90deg, #d97706 0%, #f59e0b 100%)'
                    }}
                  />
                </div>

                <div className="leak-diagnostic-text">
                  <Info size={13} color="var(--text-muted)" />
                  <span>
                    {lp.diagnostic
                      ? formatDisplayName(lp.diagnostic)
                      : `${formatDisplayName(lp.raw_name || lp.activity_key)} accounts for ${lp.share_percent}% of your entire plant carbon footprint.`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scope 1, 2, 3 Breakdown */}
        <div className="dash-card elite-card">
          <div className="dash-card-label">EMISSION SOURCES BY ACTIVITY TYPE</div>
          <div className="dash-scope-grid">
            <div className="dash-scope-cell">
              <span className="scope-label scope-1">On-Site Fuels (<JargonTooltip term="Scope 1">Scope 1</JargonTooltip>)</span>
              <div className="scope-value">{formatCO2e(scopeBreakdown.scope_1_kg)}</div>
              <span className="scope-pct">{scopeBreakdown.scope_1_pct ?? 0}% of footprint · Diesel, LPG, Gas</span>
            </div>
            <div className="dash-scope-cell">
              <span className="scope-label scope-2">Purchased Power (<JargonTooltip term="Scope 2">Scope 2</JargonTooltip>)</span>
              <div className="scope-value">{formatCO2e(scopeBreakdown.scope_2_kg)}</div>
              <span className="scope-pct">{scopeBreakdown.scope_2_pct ?? 0}% of footprint · Grid Electricity</span>
            </div>
            <div className="dash-scope-cell">
              <span className="scope-label scope-3">Raw Materials &amp; Waste (<JargonTooltip term="Scope 3">Scope 3</JargonTooltip>)</span>
              <div className="scope-value">{formatCO2e(scopeBreakdown.scope_3_kg)}</div>
              <span className="scope-pct">{scopeBreakdown.scope_3_pct ?? 0}% of footprint · Feedstock &amp; Packaging</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── RENDER STEP 3: Circular Solutions & Cost Savings ────────────────────────
  const renderCircularSection = () => {
    if (!auditResult) {
      return (
        <div className="dash-content-inner">
          <div className="dash-empty-state">
            <RefreshCw size={48} className="empty-icon" />
            <h3>No Circular Recommendations Yet</h3>
            <p>Run the leak point analysis first to generate pre-engineered circular alternatives.</p>
            <button className="dash-elite-btn" style={{ marginTop: '20px' }} onClick={() => setActiveSection('input')}>
              Go to Step 1: Input Data <ArrowRight size={15} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="dash-content-inner">
        {/* Header */}
        <div className="dash-section-header">
          <div>
            <h2 className="dash-section-title">Pre-Engineered Circular Solutions</h2>
            <p className="dash-section-desc">
              Specific interventions that substitute linear leak-points with closed-loop materials, process heat recapture, and verified savings.
            </p>
          </div>
          <button className="dash-elite-btn-sm" onClick={() => setShowBookletModal(true)}>
            <Download size={14} /> Download Action Plan (Booklet PDF)
          </button>
        </div>

        {/* ── Tangible Impact Suite: Real-World Equivalents & Live Before/After Demo Bench ── */}
        <TangibleImpactSuite
          simulatedSavingsKg={simulatedSavingsKg}
          simulatedOpexSavings={simulatedOpexSavings}
          totalEmissions={totalEmissions}
        />

        {/* Interactive Circular Loop Balancer */}
        <div className="dash-card elite-card interactive-balancer-card">
          <div className="balancer-top-row">
            <div>
              <span className="dash-card-label">
                <JargonTooltip term="What-If Analysis">INTERACTIVE CIRCULARITY SIMULATOR</JargonTooltip>
              </span>
              <h4 style={{ margin: '3px 0 0', fontSize: '15px', color: 'var(--text-primary)' }}>
                Simulate Plant Substitution Ratio: <strong>{circularRatio}% <JargonTooltip term="Circular Economy">Circular Feed</JargonTooltip></strong>
              </h4>
            </div>
            <span className="balancer-tag">
              {circularRatio >= 80 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <RefreshCw size={12} className="spin-on-active" /> <JargonTooltip term="Closed-Loop">Fully Circular Loop</JargonTooltip>
                </span>
              ) : circularRatio >= 50 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Zap size={12} color="var(--amber)" /> Hybrid Transition
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <AlertTriangle size={12} color="var(--rose)" /> Linear Heavy
                </span>
              )}
            </span>
          </div>

          <div className="balancer-slider-wrap">
            <div className="balancer-slider-labels">
              <span>0% Baseline Bleed</span>
              <span>50% Partial Loop</span>
              <span>100% <JargonTooltip term="Closed-Loop">Fully Closed-Loop</JargonTooltip></span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={circularRatio}
              onChange={(e) => setCircularRatio(Number(e.target.value))}
              className="scrub-range-slider"
            />
          </div>

          <div className="balancer-dynamic-metrics">
            <div className="balancer-metric-pill">
              <small><JargonTooltip term="CO2e">Avoided Carbon</JargonTooltip></small>
              <strong style={{ color: 'var(--mint-hover)' }}>−{formatCO2e(simulatedSavingsKg)}/mo</strong>
            </div>
            <div className="balancer-metric-pill">
              <small>Projected Annual <JargonTooltip term="OPEX">OPEX Saved</JargonTooltip></small>
              <strong style={{ color: 'var(--emerald-deep)' }}>+{formatINR(simulatedOpexSavings, true)}/yr</strong>
            </div>
            <div className="balancer-metric-pill">
              <small style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Estimated Upfront <JargonTooltip term="CAPEX">CAPEX</JargonTooltip>
                <JargonIcon term="Williams' 0.65 Rule" size={11} />
              </small>
              <strong>{formatINR(totalCapex, true)}</strong>
            </div>
            <div className="balancer-metric-pill">
              <small>Average <JargonTooltip term="Payback Period">Payback</JargonTooltip></small>
              <strong style={{ color: 'var(--cyan-fresh)' }}>{avgPaybackMonths} Months</strong>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="rec-filters-bar">
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)' }}>FILTER SOLUTIONS:</span>
          <button
            className={`rec-filter-pill ${activeRecFilter === 'all' ? 'pill-active' : ''}`}
            onClick={() => setActiveRecFilter('all')}
          >
            All Recommended ({rawRecs.length})
          </button>
          <button
            className={`rec-filter-pill ${activeRecFilter === 'high_impact' ? 'pill-active' : ''}`}
            onClick={() => setActiveRecFilter('high_impact')}
          >
            Highest Carbon Cut (&gt;60%)
          </button>
          <button
            className={`rec-filter-pill ${activeRecFilter === 'fast_payback' ? 'pill-active' : ''}`}
            onClick={() => setActiveRecFilter('fast_payback')}
          >
            Fastest Payback (&lt;8 Months)
          </button>
        </div>

        {/* Recommended Circular Cards */}
        <div className="rec-cards-list">
          {filteredRecs.length > 0 ? (
            filteredRecs.map((rec, i) => (
              <div key={i} className="dash-rec-card elite-rec-card">
                <div className="rec-header">
                  <div>
                    <span className="rec-type-label">CIRCULAR INTERVENTION #{i + 1}</span>
                    <h3 className="rec-title">
                      {formatDisplayName(rec.target_activity)} <span style={{ color: 'var(--mint-hover)', margin: '0 4px' }}>→</span> <strong className="gradient-text">{formatDisplayName(rec.alternative)}</strong>
                    </h3>
                  </div>
                  <div className="rec-badge-group">
                    <span className="rec-feasibility">
                      Feasibility: {rec.feasibility_score ?? 90}/100
                    </span>
                    <span className="rec-difficulty-badge">
                      {rec.technical_difficulty || 'Low'} Complexity
                    </span>
                  </div>
                </div>

                {rec.mechanism && (
                  <p className="rec-mechanism-desc">
                    <strong><JargonTooltip term="Closed-Loop">Closed-Loop Mechanism</JargonTooltip>:</strong> {rec.mechanism}
                  </p>
                )}

                <div className="rec-metrics">
                  <div className="rec-metric">
                    <small><JargonTooltip term="CO2e">CO₂ Reduction</JargonTooltip></small>
                    <strong className="metric-green">
                      −{rec.co2e_reduction_percent}% ({formatCO2e(Math.round(rec.co2e_savings_kg * (circularRatio / 100)))})
                    </strong>
                  </div>
                  <div className="rec-metric">
                    <small>Required Investment (<JargonTooltip term="CAPEX">CAPEX</JargonTooltip>)</small>
                    <strong>{formatINR(rec.estimated_capex_inr)}</strong>
                  </div>
                  <div className="rec-metric">
                    <small>Annual Operating Savings (<JargonTooltip term="OPEX">OPEX</JargonTooltip>)</small>
                    <strong className="metric-cyan">
                      {formatINR(Math.round(rec.annual_opex_savings_inr * (circularRatio / 100)))}/yr
                    </strong>
                  </div>
                  <div className="rec-metric">
                    <small>Investment <JargonTooltip term="Payback Period">Payback</JargonTooltip></small>
                    <strong style={{ color: 'var(--amber)' }}>
                      {rec.payback_months ? `${rec.payback_months} Months` : 'Immediate'}
                    </strong>
                  </div>
                </div>

                {rec.regulatory_readiness && (
                  <div className="rec-compliance">
                    <ShieldCheck size={14} color="var(--mint-hover)" />
                    <span><strong>Regulation &amp; ESG Standards:</strong> <JargonTooltip term="BRSR">{rec.regulatory_readiness}</JargonTooltip></span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p style={{ padding: '20px', color: 'var(--text-muted)' }}>No circular solutions match the chosen filter.</p>
          )}
        </div>
      </div>
    );
  };

  // ── RENDER STEP 4: Executive Action Plan ────────────────────────────────────
  const renderReportSection = () => (
    <div className="dash-content-inner">
      <div className="dash-section-header">
        <div>
          <h2 className="dash-section-title">Executive Decarbonization Action Plan</h2>
          <p className="dash-section-desc">
            Audit-ready report summary for factory managers, green bank loans, and pollution control board regulations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="dash-elite-btn-sm" onClick={() => setShowBookletModal(true)}>
            <Download size={14} /> Download Action Plan (Booklet PDF)
          </button>
          <button className="dash-back-btn-sm" onClick={() => window.print()} title="Standard browser print">
            <Printer size={14} /> Print View
          </button>
        </div>
      </div>

      <div className="dash-card elite-card report-card">
        <div className="report-letterhead">
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--emerald-deep)' }}>
              EcoLeak Industrial Emission Assessment
            </h3>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Theme: Circular Carbon Ecosystem · Facility: {authUser?.facilityName || industry || 'Facility Pending'}
            </span>
            <div className="report-compliance-meta-row">
              <span className="report-meta-chip">
                <MapPin size={11} /> {authUser?.location || 'Location Pending'}
              </span>
              <span className="report-meta-chip">
                <FileCheck size={11} /> <JargonTooltip term="SPCB">SPCB</JargonTooltip>: {authUser?.regId || 'Consent ID Pending'}
              </span>
              <span className="report-meta-chip">
                <ShieldAlert size={11} /> <JargonTooltip term="Orange Category">{authUser?.regCategory ? authUser.regCategory.split('(')[0].trim() : 'Uncategorized'}</JargonTooltip>
              </span>
            </div>
          </div>
          <div className="report-status-badge">
            <CheckCircle2 size={15} color="var(--mint)" /> Verified Factors Aligned
          </div>
        </div>

        <div className="report-grid-3">
          <div className="report-stat-box">
            <small><JargonTooltip term="Carbon Footprint">Baseline Footprint</JargonTooltip></small>
            <strong><JargonTooltip term="CO2e">{formatCO2e(totalEmissions, true)}</JargonTooltip></strong>
            <span>Per Month</span>
          </div>
          <div className="report-stat-box">
            <small><JargonTooltip term="Circular Economy">Total Recoverable Emissions</JargonTooltip></small>
            <strong style={{ color: 'var(--mint-hover)' }}><JargonTooltip term="CO2e">{formatCO2e(simulatedSavingsKg, true)}</JargonTooltip></strong>
            <span>Avoidable through circularity</span>
          </div>
          <div className="report-stat-box">
            <small>Annual Capital Savings</small>
            <strong style={{ color: 'var(--emerald-deep)' }}><JargonTooltip term="OPEX">{formatINR(simulatedOpexSavings, true)}</JargonTooltip></strong>
            <span>Recurring OPEX reduction</span>
          </div>
        </div>

        <h4 style={{ margin: '24px 0 10px', fontSize: '14px', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
          ACTIONABLE IMPLEMENTATION ROADMAP:
        </h4>

        <div className="report-roadmap-list">
          {uniqueRecs.map((rec, i) => (
            <div key={i} className="report-roadmap-item">
              <div className="roadmap-num">{i + 1}</div>
              <div className="roadmap-content">
                <strong>{formatDisplayName(rec.alternative)}</strong>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Target: {formatDisplayName(rec.target_activity)} · Cuts {rec.co2e_reduction_percent}% CO₂ · Payback: {rec.payback_months} mo · CAPEX: {formatINR(rec.estimated_capex_inr)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="report-footer-note">
          <span>Standards Aligned: <JargonTooltip term="GHG Protocol">GHG Protocol Corporate Standard</JargonTooltip>, <JargonTooltip term="ISO 14064-1">ISO 14064-1</JargonTooltip>, CEA Central Electricity Authority India Factors, <JargonTooltip term="BRSR">BRSR Core</JargonTooltip>, and <JargonTooltip term="CBAM">CBAM</JargonTooltip> Readiness.</span>
        </div>
      </div>
    </div>
  );

  const dynamicNavItems = [
    { id: 'input',    icon: LayoutDashboard,   label: '1. Plant Process Data',    sub: 'Energy, Materials & Waste' },
    { id: 'leaks',    icon: AlertTriangle,     label: '2. Top Emission Leaks',    sub: 'Hotspot Detection' },
    { id: 'circular', icon: RefreshCw,         label: '3. Circular Solutions',     sub: 'Interventions & Cost Savings' },
    { id: 'report',   icon: Download,          label: '4. Executive Action Plan', sub: 'Compliance & Export' },
    { id: 'profile',  icon: User,              label: '5. Operator Profile',      sub: 'Identity & Credentials' },
    { id: 'plant',    icon: Factory,           label: '6. Plant Information',      sub: 'Multi-Plant Directory & Consents' },
  ];

  const renderProfileSection = () => (
    <div className="dashboard-embedded-profile-wrap">
      <OperatorProfilePage
        initialPage="operator"
        authUser={authUser}
        onUpdateUser={onUpdateUser}
        onSignOut={onSignOut}
        onBack={() => handleSectionSelect('input')}
        onOpenDashboard={() => handleSectionSelect('input')}
        onNavigateSection={(sec) => handleSectionSelect(sec)}
        isEmbedded={true}
      />
    </div>
  );

  const renderPlantSection = () => (
    <div className="dashboard-embedded-profile-wrap">
      <OperatorProfilePage
        initialPage="plant"
        authUser={authUser}
        onUpdateUser={onUpdateUser}
        onSignOut={onSignOut}
        onBack={() => handleSectionSelect('input')}
        onOpenDashboard={() => handleSectionSelect('input')}
        onNavigateSection={(sec) => handleSectionSelect(sec)}
        isEmbedded={true}
      />
    </div>
  );

  const renderEcoBotSection = () => (
    <EcoBotDashboardPage
      authUser={authUser}
      onOpenAuth={onOpenAuth}
      activePlantContext={{
        facilityName: authUser?.facilityName || '',
        location: authUser?.location || '',
        industry: industry || authUser?.industry || '',
        regCategory: authUser?.regCategory || '',
        regId: authUser?.regId || '',
        capacity: authUser?.capacity || '',
        emissionCap: authUser?.emissionCap || '',
        total_emissions: auditResult?.facility_summary?.total_emissions_kg_co2e || totalEmissions || 0,
        scope_1_kg_co2e: auditResult?.facility_summary?.scope_1_kg_co2e || 0,
        scope_2_kg_co2e: auditResult?.facility_summary?.scope_2_kg_co2e || 0,
        scope_3_kg_co2e: auditResult?.facility_summary?.scope_3_kg_co2e || 0,
        activities: auditResult?.activities || [],
        hotspots: auditResult?.hotspots || [],
        circular_recommendations: uniqueRecs || auditResult?.circular_recommendations || []
      }}
      onNavigateSection={handleSectionSelect}
    />
  );

  const sectionRenderers = {
    input: renderInputSection,
    leaks: renderLeakSection,
    circular: renderCircularSection,
    report: renderReportSection,
    profile: renderProfileSection,
    plant: renderPlantSection,
    copilot: renderEcoBotSection,
  };

  const isProfileIncomplete = (user) => {
    if (!user) return true;
    if (user.plants && user.plants.length > 0) {
      const primary = user.plants[0];
      const hasPrimaryFac = Boolean(primary.facilityName && primary.facilityName.trim());
      const hasPrimaryLoc = Boolean(primary.location && primary.location.trim());
      const hasPrimaryReg = Boolean(primary.regId && primary.regId.trim());
      return !hasPrimaryFac || !hasPrimaryLoc || !hasPrimaryReg;
    }
    const hasFacility = Boolean(user.facilityName && user.facilityName.trim());
    const hasLocation = Boolean(user.location && user.location.trim());
    const hasRegId = Boolean(user.regId && user.regId.trim());
    return !hasFacility || !hasLocation || !hasRegId;
  };

  return (
    <div className="dash-shell">
      {/* ── Glassy Modern Sidebar ───────────────────────────────────────────── */}
      <aside className={`dash-sidebar ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <EcoLeakLogo size={34} />
            {sidebarOpen && (
              <div>
                <span className="sidebar-brand-text">Eco<span className="brand-accent">Leak</span></span>
                <div className="sidebar-tagline">Emission Intelligence</div>
              </div>
            )}
          </div>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
            <Menu size={16} />
          </button>
        </div>

        {/* Exclusive AI Bot button above WORKFLOW PIPELINE in Sidebar */}
        <div className={`sidebar-ai-launcher-card ${sidebarOpen ? '' : 'ai-launcher-collapsed'}`}>
          <button
            type="button"
            className={`sidebar-ai-bot-btn ${!authUser ? 'ai-locked' : 'ai-unlocked'} ${activeSection === 'copilot' ? 'ai-active' : ''} ${sidebarOpen ? '' : 'btn-collapsed'}`}
            onClick={() => handleSectionSelect('copilot')}
            title={authUser ? "Launch EcoBot AI Copilot" : "Authentication Required for EcoBot AI"}
          >
            <div className={`ai-bot-icon-glow ${sidebarOpen ? '' : 'glow-collapsed'}`}>
              <CuteEcoBotIcon size={20} isAnimated={Boolean(authUser)} />
            </div>
            {sidebarOpen && (
              <div className="ai-bot-btn-text">
                <div className="ai-bot-btn-title-row">
                  <span className="ai-bot-btn-title">EcoBot AI</span>
                </div>
              </div>
            )}
          </button>
        </div>

        {sidebarOpen && <div className="sidebar-nav-label">WORKFLOW PIPELINE</div>}

        <nav className="sidebar-nav">
          {dynamicNavItems.map(({ id, icon: Icon, label, sub }) => (
            <button
              key={id}
              className={`sidebar-nav-item ${activeSection === id ? 'nav-active' : ''} ${
                (id === 'leaks' || id === 'circular') && auditResult ? 'has-results' : ''
              }`}
              onClick={() => handleSectionSelect(id)}
            >
              <span className="nav-icon-wrap"><Icon size={17} /></span>
              {sidebarOpen && (
                <span className="nav-label-wrap">
                  <span className="nav-label">{label}</span>
                  <span className="nav-sub">{sub}</span>
                </span>
              )}
              {sidebarOpen && (id === 'leaks' || id === 'circular') && auditResult && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-footer">
              {authUser ? (
                <div className="sidebar-user-card">
                  <div
                    className="sidebar-user-avatar"
                    onClick={() => handleSectionSelect('profile')}
                    style={{ cursor: 'pointer' }}
                    title="View & Edit Operator Profile"
                  >
                    <UserPfp user={authUser} size={38} />
                  </div>
                  <div
                    className="sidebar-user-info"
                    onClick={() => handleSectionSelect('profile')}
                    style={{ cursor: 'pointer' }}
                    title="View Operator Profile & Regulatory Parameters"
                  >
                    <strong className="sidebar-user-name">{authUser.name || 'Plant Operator'}</strong>
                    <span className="sidebar-user-facility">
                      {authUser.plants && authUser.plants.length > 1
                        ? `${authUser.plants.length} Plants (${authUser.facilityName || authUser.plants[0]?.facilityName || 'Portfolio'})`
                        : (authUser.facilityName || authUser.plants?.[0]?.facilityName || 'Unconfigured Plant')}
                    </span>
                    {authUser.location && (
                      <span className="sidebar-user-location" title={authUser.location}>
                        <MapPin size={10} style={{ flexShrink: 0 }} /> {authUser.location.split(',')[0]}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="sidebar-logout-btn"
                    title="Sign Out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <div className="sidebar-auth-prompt">
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="sidebar-signin-btn"
                  >
                    <LogIn size={15} />
                    <span>Sign In / Register</span>
                  </button>
                  <div className="sidebar-footer-card" style={{ marginTop: '8px' }}>
                    <div className="sidebar-footer-text">Hackout 2k26</div>
                    <div className="sidebar-footer-sub">Circular Carbon Ecosystem</div>
                    <div className="sidebar-status-pill">
                      <span className="sidebar-status-dot" />
                      Engine Online
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!sidebarOpen && authUser && (
          <div className="sidebar-collapsed-user">
            <div
              className="sidebar-user-avatar"
              onClick={() => handleSectionSelect('profile')}
              style={{ cursor: 'pointer' }}
              title={`Operator Profile: ${authUser.name}`}
            >
              <UserPfp user={authUser} size={36} />
            </div>
          </div>
        )}
      </aside>

      {/* ── Main Work Area ─────────────────────────────────────────────────── */}
      <main className="dash-main">
        <div className="dash-main-scroll">
          {/* ── Global Incomplete Profile Alert (Across all pages until updated) ── */}
          {isProfileIncomplete(authUser) && (
            <div className="dash-incomplete-profile-alert">
              <div className="incomplete-alert-icon-glow">
                <AlertTriangle size={20} className="incomplete-pulse-icon" />
              </div>
              <div className="incomplete-alert-body">
                <div className="incomplete-alert-headline-row">
                  <h4 className="incomplete-alert-title">
                    Action Required: Incomplete Plant &amp; Compliance Profile
                  </h4>
                  <span className="incomplete-alert-badge">Setup Incomplete</span>
                </div>
                <p className="incomplete-alert-desc">
                  Essential plant and regulatory parameters are blank. Please update your factory name, physical location, and SPCB Consent to Operate (CTO) number so all emission factors and executive compliance reports calculate accurately.
                </p>
                <div className="incomplete-missing-pills-row">
                  {!authUser?.facilityName?.trim() && (
                    <span className="incomplete-missing-pill">• Facility Name missing</span>
                  )}
                  {!authUser?.location?.trim() && (
                    <span className="incomplete-missing-pill">• Plant Location missing</span>
                  )}
                  {!authUser?.regId?.trim() && (
                    <span className="incomplete-missing-pill">• SPCB Consent ID missing</span>
                  )}
                </div>
              </div>
              <div className="incomplete-alert-action-wrap">
                <button
                  type="button"
                  className="btn-update-plant-alert"
                  onClick={() => handleSectionSelect('plant')}
                  title="Configure plant parameters"
                >
                  <Factory size={15} />
                  <span>Update Plant Information</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {(sectionRenderers[activeSection] || renderInputSection)()}
        </div>
      </main>

      {/* ── Executive Action Plan Custom Booklet Modal ── */}
      <ActionPlanBookletModal
        isOpen={showBookletModal}
        onClose={() => setShowBookletModal(false)}
        auditResult={auditResult}
        authUser={authUser}
        totalEmissions={totalEmissions}
        simulatedSavingsKg={simulatedSavingsKg}
        simulatedOpexSavings={simulatedOpexSavings}
        totalCapex={totalCapex}
        avgPaybackMonths={avgPaybackMonths}
        uniqueRecs={uniqueRecs}
      />
    </div>
  );
}


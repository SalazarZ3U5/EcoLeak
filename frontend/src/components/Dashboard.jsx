import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, LayoutDashboard, UploadCloud, MessageSquareText,
  Layers, BarChart3, LogIn, X, ChevronRight, Zap, Flame,
  Building2, AlertTriangle, TrendingDown, Coins, ShieldCheck,
  RefreshCw, ArrowRight, CheckCircle2, Lock, Mail, Menu,
  Download, Printer, Sparkles, Sliders, Factory, Check, Info,
  Eye, EyeOff, User, UserPlus, LogOut, UserCheck, Key, Cog, Package,
  MapPin, FileCheck, ShieldAlert, Scale
} from 'lucide-react';
import {
  analyzeActivities,
  analyzeDocument,
  analyzeChat,
  formatINR,
  formatCO2e
} from '../services/api';
import { INDUSTRY_PRESETS } from '../data/mockData';

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
  { id: 'report',   icon: Download,          label: 'Executive Action Plan',     sub: 'Compliance & Export' },
];

export default function Dashboard({
  onBack,
  initialSection = 'input',
  authUser,
  onSignOut,
  onOpenAuth
}) {
  const [activeSection, setActiveSection] = useState(
    initialSection === 'audit' ? 'input' : (initialSection === 'results' ? 'leaks' : (initialSection === 'signin' ? 'input' : initialSection))
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
  const [chatMessage, setChatMessage] = useState(
    'Our factory in Maharashtra processes 60 tons of virgin plastic pellets and 2.5 tons of color additives monthly, using 20,000 kWh of grid electricity and 500 liters of diesel backup.'
  );

  // ── Shared State ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditResult, setAuditResult] = useState(null);

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
      setActiveSection('leaks');
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
      const res = await analyzeDocument(uploadFile, industry);
      setAuditResult(res);
      setActiveSection('leaks');
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
      setActiveSection('leaks');
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

  // Filter recommendations based on active pill
  const filteredRecs = rawRecs.filter(r => {
    if (activeRecFilter === 'high_impact') return r.co2e_reduction_percent >= 60;
    if (activeRecFilter === 'fast_payback') return (r.payback_months || 12) <= 8;
    return true;
  });

  const scaledMultiplier = circularRatio / 100;
  const simulatedSavingsKg = Math.round(rawRecs.reduce((acc, r) => acc + (r.co2e_savings_kg || 0), 0) * scaledMultiplier);
  const simulatedOpexSavings = Math.round(rawRecs.reduce((acc, r) => acc + (r.annual_opex_savings_inr || 0), 0) * scaledMultiplier);
  const totalCapex = rawRecs.reduce((acc, r) => acc + (r.estimated_capex_inr || 0), 0);
  const avgPaybackMonths = rawRecs.length > 0
    ? Math.round(rawRecs.reduce((acc, r) => acc + (r.payback_months || 6), 0) / rawRecs.length)
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
          {/* Facility Sector */}
          <div className="dash-card elite-card">
            <div className="dash-card-label">1. FACILITY CLASSIFICATION</div>
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
                  Monthly Electricity (kWh)
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
                  Primary Heating / Thermal Fuel
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
                  Primary Raw Material Feedstock
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

    const leakPoints = auditResult.leak_points || [];
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
            <div className="kpi-value kpi-red">{formatCO2e(totalEmissions, true)}</div>
            <small className="kpi-sub">{Math.round(totalEmissions).toLocaleString()} kg CO₂e / month</small>
          </div>
          <div className="dash-kpi-card">
            <span className="kpi-label">Reducible by Circularity</span>
            <div className="kpi-value kpi-green">
              {formatCO2e(simulatedSavingsKg, true)}
              <span style={{ fontSize: '13px', marginLeft: '6px', fontWeight: 600 }}>
                ({Math.round((simulatedSavingsKg / (totalEmissions || 1)) * 100)}% cut)
              </span>
            </div>
            <small className="kpi-sub">Avoidable via closed-loop alternatives</small>
          </div>
          <div className="dash-kpi-card">
            <span className="kpi-label">Projected Annual Savings</span>
            <div className="kpi-value kpi-cyan">{formatINR(simulatedOpexSavings, true)}/yr</div>
            <small className="kpi-sub">Net operating expense saved</small>
          </div>
        </div>

        {/* Top Emission Hotspots / Pareto Leak Points */}
        <div className="dash-card elite-card">
          <div className="dash-card-label-row">
            <span className="dash-card-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={14} color="var(--rose)" /> TOP EMISSION LEAK POINTS (RANKED BY SEVERITY)
            </span>
            <span className="badge-pill-danger">80/20 Rule Hotspot Analysis</span>
          </div>

          <div className="leak-points-container">
            {leakPoints.map((lp, idx) => (
              <div key={idx} className="leak-point-row">
                <div className="leak-point-header">
                  <div className="leak-title-wrap">
                    <span className="leak-rank">#{idx + 1}</span>
                    <div>
                      <strong className="leak-name">{lp.raw_name || lp.activity_key}</strong>
                      <span className="leak-scope-tag">{lp.scope}</span>
                    </div>
                  </div>
                  <div className="leak-stat-wrap">
                    <span className="leak-qty">{formatCO2e(lp.emissions_kg)}</span>
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
                  <span>{lp.diagnostic || `${lp.raw_name} accounts for ${lp.share_percent}% of your entire plant carbon footprint.`}</span>
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
              <span className="scope-label scope-1">On-Site Fuels (Scope 1)</span>
              <div className="scope-value">{formatCO2e(scopeBreakdown.scope_1_kg)}</div>
              <span className="scope-pct">{scopeBreakdown.scope_1_pct ?? 0}% of footprint · Diesel, LPG, Gas</span>
            </div>
            <div className="dash-scope-cell">
              <span className="scope-label scope-2">Purchased Power (Scope 2)</span>
              <div className="scope-value">{formatCO2e(scopeBreakdown.scope_2_kg)}</div>
              <span className="scope-pct">{scopeBreakdown.scope_2_pct ?? 0}% of footprint · Grid Electricity</span>
            </div>
            <div className="dash-scope-cell">
              <span className="scope-label scope-3">Raw Materials &amp; Waste (Scope 3)</span>
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
          <button className="dash-elite-btn-sm" onClick={() => setActiveSection('report')}>
            <Download size={14} /> Download Action Plan
          </button>
        </div>

        {/* Interactive Circular Loop Balancer */}
        <div className="dash-card elite-card interactive-balancer-card">
          <div className="balancer-top-row">
            <div>
              <span className="dash-card-label">INTERACTIVE CIRCULARITY SIMULATOR</span>
              <h4 style={{ margin: '3px 0 0', fontSize: '15px', color: 'var(--text-primary)' }}>
                Simulate Plant Substitution Ratio: <strong>{circularRatio}% Circular Feed</strong>
              </h4>
            </div>
            <span className="balancer-tag">
              {circularRatio >= 80 ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <RefreshCw size={12} className="spin-on-active" /> Fully Circular Loop
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
              <span>100% Fully Closed-Loop</span>
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
              <small>Avoided Carbon</small>
              <strong style={{ color: 'var(--mint-hover)' }}>−{formatCO2e(simulatedSavingsKg)}/mo</strong>
            </div>
            <div className="balancer-metric-pill">
              <small>Projected Annual OPEX Saved</small>
              <strong style={{ color: 'var(--emerald-deep)' }}>+{formatINR(simulatedOpexSavings, true)}/yr</strong>
            </div>
            <div className="balancer-metric-pill">
              <small>Estimated Upfront CAPEX</small>
              <strong>{formatINR(totalCapex, true)}</strong>
            </div>
            <div className="balancer-metric-pill">
              <small>Average Payback</small>
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
                      {rec.target_activity} <span style={{ color: 'var(--mint-hover)', margin: '0 4px' }}>→</span> <strong className="gradient-text">{rec.alternative}</strong>
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
                    <strong>Closed-Loop Mechanism:</strong> {rec.mechanism}
                  </p>
                )}

                <div className="rec-metrics">
                  <div className="rec-metric">
                    <small>CO₂ Reduction</small>
                    <strong className="metric-green">
                      −{rec.co2e_reduction_percent}% ({formatCO2e(Math.round(rec.co2e_savings_kg * (circularRatio / 100)))})
                    </strong>
                  </div>
                  <div className="rec-metric">
                    <small>Required Investment</small>
                    <strong>{formatINR(rec.estimated_capex_inr)}</strong>
                  </div>
                  <div className="rec-metric">
                    <small>Annual Operating Savings</small>
                    <strong className="metric-cyan">
                      {formatINR(Math.round(rec.annual_opex_savings_inr * (circularRatio / 100)))}/yr
                    </strong>
                  </div>
                  <div className="rec-metric">
                    <small>Investment Payback</small>
                    <strong style={{ color: 'var(--amber)' }}>
                      {rec.payback_months ? `${rec.payback_months} Months` : 'Immediate'}
                    </strong>
                  </div>
                </div>

                {rec.regulatory_readiness && (
                  <div className="rec-compliance">
                    <ShieldCheck size={14} color="var(--mint-hover)" />
                    <span><strong>Regulation &amp; ESG Standards:</strong> {rec.regulatory_readiness}</span>
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
        <button className="dash-elite-btn-sm" onClick={() => window.print()}>
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      <div className="dash-card elite-card report-card">
        <div className="report-letterhead">
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--emerald-deep)' }}>
              EcoLeak Industrial Emission Assessment
            </h3>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Theme: Circular Carbon Ecosystem · Facility: {authUser?.facilityName || industry}
            </span>
            <div className="report-compliance-meta-row">
              <span className="report-meta-chip">
                <MapPin size={11} /> {authUser?.location || 'MIDC Bhosari Industrial Area, Pune'}
              </span>
              <span className="report-meta-chip">
                <FileCheck size={11} /> SPCB: {authUser?.regId || 'MH-SPCB/CTO-2026/4102'}
              </span>
              <span className="report-meta-chip">
                <ShieldAlert size={11} /> {authUser?.regCategory ? authUser.regCategory.split('(')[0].trim() : 'Orange Category'}
              </span>
            </div>
          </div>
          <div className="report-status-badge">
            <CheckCircle2 size={15} color="var(--mint)" /> Verified Factors Aligned
          </div>
        </div>

        <div className="report-grid-3">
          <div className="report-stat-box">
            <small>Baseline Footprint</small>
            <strong>{formatCO2e(totalEmissions, true)}</strong>
            <span>Per Month</span>
          </div>
          <div className="report-stat-box">
            <small>Total Recoverable Emissions</small>
            <strong style={{ color: 'var(--mint-hover)' }}>{formatCO2e(simulatedSavingsKg, true)}</strong>
            <span>Avoidable through circularity</span>
          </div>
          <div className="report-stat-box">
            <small>Annual Capital Savings</small>
            <strong style={{ color: 'var(--emerald-deep)' }}>{formatINR(simulatedOpexSavings, true)}</strong>
            <span>Recurring OPEX reduction</span>
          </div>
        </div>

        <h4 style={{ margin: '24px 0 10px', fontSize: '14px', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
          ACTIONABLE IMPLEMENTATION ROADMAP:
        </h4>

        <div className="report-roadmap-list">
          {rawRecs.map((rec, i) => (
            <div key={i} className="report-roadmap-item">
              <div className="roadmap-num">{i + 1}</div>
              <div className="roadmap-content">
                <strong>{rec.alternative}</strong>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  Target: {rec.target_activity} · Cuts {rec.co2e_reduction_percent}% CO₂ · Payback: {rec.payback_months} mo · CAPEX: {formatINR(rec.estimated_capex_inr)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="report-footer-note">
          <span>Standards Aligned: GHG Protocol Corporate Standard, ISO 14064-1, CEA Central Electricity Authority India Factors, BRSR Core.</span>
        </div>
      </div>
    </div>
  );

  const dynamicNavItems = [
    { id: 'input',    icon: LayoutDashboard,   label: '1. Plant Process Data',    sub: 'Energy, Materials & Waste' },
    { id: 'leaks',    icon: AlertTriangle,     label: '2. Top Emission Leaks',    sub: 'Hotspot Detection' },
    { id: 'circular', icon: RefreshCw,         label: '3. Circular Solutions',     sub: 'Interventions & Cost Savings' },
    { id: 'report',   icon: Download,          label: 'Executive Action Plan',     sub: 'Compliance & Export' },
  ];

  const sectionRenderers = {
    input: renderInputSection,
    leaks: renderLeakSection,
    circular: renderCircularSection,
    report: renderReportSection,
  };

  return (
    <div className="dash-shell">
      {/* ── Glassy Modern Sidebar ───────────────────────────────────────────── */}
      <aside className={`dash-sidebar ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={onBack} style={{ cursor: 'pointer' }} title="Back to Overview">
            <div className="brand-mark">
              <span></span>
              <span></span>
            </div>
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

        <button className="sidebar-back-btn" onClick={onBack}>
          <ArrowLeft size={14} />
          {sidebarOpen && <span>Back to Overview</span>}
        </button>

        {sidebarOpen && <div className="sidebar-nav-label">WORKFLOW PIPELINE</div>}

        <nav className="sidebar-nav">
          {dynamicNavItems.map(({ id, icon: Icon, label, sub }) => (
            <button
              key={id}
              className={`sidebar-nav-item ${activeSection === id ? 'nav-active' : ''} ${
                (id === 'leaks' || id === 'circular') && auditResult ? 'has-results' : ''
              }`}
              onClick={() => setActiveSection(id)}
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
                  <div className="sidebar-user-avatar">
                    {authUser.picture ? (
                      <img src={authUser.picture} alt={authUser.name} />
                    ) : (
                      <span>{authUser.name ? authUser.name.slice(0, 2).toUpperCase() : 'OP'}</span>
                    )}
                  </div>
                  <div
                    className="sidebar-user-info"
                    onClick={onOpenAuth}
                    style={{ cursor: 'pointer' }}
                    title="View Operator Profile & Regulatory Parameters"
                  >
                    <strong className="sidebar-user-name">{authUser.name}</strong>
                    <span className="sidebar-user-facility">{authUser.facilityName || 'Active Plant'}</span>
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
      </aside>

      {/* ── Main Work Area ─────────────────────────────────────────────────── */}
      <main className="dash-main">
        {/* Top Progress Stepper (Always accessible & clear) */}
        <header className="dash-top-workflow-bar">
          <div className="workflow-steps-flex">
            <button
              type="button"
              className={`workflow-step-pill ${activeSection === 'input' ? 'step-active' : 'step-completed'}`}
              onClick={() => setActiveSection('input')}
            >
              <span className="step-num">1</span>
              <span>Process Data Input</span>
            </button>
            <div className="step-connector" />
            <button
              type="button"
              className={`workflow-step-pill ${activeSection === 'leaks' ? 'step-active' : (auditResult ? 'step-completed' : 'step-disabled')}`}
              onClick={() => auditResult && setActiveSection('leaks')}
              disabled={!auditResult}
            >
              <span className="step-num">2</span>
              <span>Emission Leak Points</span>
            </button>
            <div className="step-connector" />
            <button
              type="button"
              className={`workflow-step-pill ${activeSection === 'circular' ? 'step-active' : (auditResult ? 'step-completed' : 'step-disabled')}`}
              onClick={() => auditResult && setActiveSection('circular')}
              disabled={!auditResult}
            >
              <span className="step-num">3</span>
              <span>Circular Solutions &amp; ROI</span>
            </button>
          </div>
        </header>

        <div className="dash-main-scroll">
          {(sectionRenderers[activeSection] || renderInputSection)()}
        </div>
      </main>
    </div>
  );
}

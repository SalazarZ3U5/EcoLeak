import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, LayoutDashboard, UploadCloud, MessageSquareText,
  Layers, BarChart3, LogIn, X, ChevronRight, Zap, Flame,
  Building2, AlertTriangle, TrendingDown, Coins, ShieldCheck,
  RefreshCw, ArrowRight, CheckCircle2, Lock, Mail, Menu
} from 'lucide-react';
import {
  analyzeActivities,
  analyzeDocument,
  analyzeChat,
  formatINR,
  formatCO2e
} from '../services/api';
import { INDUSTRY_PRESETS } from '../data/mockData';

// ─── One-click preset scenarios ───────────────────────────────────────────────
const PRESET_SCENARIOS = {
  'GreenPack Plastics (60t Resin)': {
    industry: 'Plastic manufacturing',
    activities: [
      { name: 'Virgin Plastic Pellets', quantity: 60000, unit: 'kg' },
      { name: 'Color Additives', quantity: 2500, unit: 'kg' },
      { name: 'Packaging Material', quantity: 5000, unit: 'kg' },
      { name: 'Grid Electricity', quantity: 20000, unit: 'kWh' },
      { name: 'Diesel Fuel', quantity: 500, unit: 'liters' },
    ]
  },
  'Standard Packaging SME': {
    industry: 'Packaging',
    activities: [
      { name: 'Virgin HDPE Plastic', quantity: 5000, unit: 'kg' },
      { name: 'Grid Electricity', quantity: 15000, unit: 'kWh' },
      { name: 'Diesel Fuel', quantity: 800, unit: 'liters' },
      { name: 'Cardboard Waste', quantity: 1200, unit: 'kg' },
      { name: 'Process Water', quantity: 10000, unit: 'liters' },
    ]
  },
  'Metal Fabrication Unit': {
    industry: 'Metal fabrication',
    activities: [
      { name: 'Virgin Steel', quantity: 2000, unit: 'kg' },
      { name: 'LPG', quantity: 450, unit: 'kg' },
      { name: 'Grid Electricity', quantity: 30000, unit: 'kWh' },
      { name: 'Industrial Lubricant', quantity: 200, unit: 'liters' },
    ]
  }
};

// ─── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'audit',    icon: LayoutDashboard,   label: 'Quick Audit',   sub: 'Inputs & Presets' },
  { id: 'upload',   icon: UploadCloud,       label: 'Bill Upload',   sub: 'PDF / Invoice' },
  { id: 'copilot',  icon: MessageSquareText, label: 'AI Copilot',    sub: 'Natural Language' },
  { id: 'results',  icon: BarChart3,         label: 'Results',       sub: 'Audit Report' },
  { id: 'signin',   icon: LogIn,             label: 'Sign In',       sub: 'Operator Console' },
];

export default function Dashboard({ onBack, initialSection = 'audit' }) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Audit form state ────────────────────────────────────────────────────────
  const [industry, setIndustry] = useState('Plastic manufacturing');
  const [kwh, setKwh] = useState(20000);
  const [fuelType, setFuelType] = useState('Diesel');
  const [fuelQty, setFuelQty] = useState(500);
  const [materialType, setMaterialType] = useState('Virgin Plastic Pellets');
  const [materialQty, setMaterialQty] = useState(60000);

  // ── Upload state ────────────────────────────────────────────────────────────
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDrag, setUploadDrag] = useState(false);

  // ── Copilot state ───────────────────────────────────────────────────────────
  const [chatMessage, setChatMessage] = useState(
    'Our factory in Maharashtra processes 60 tons of virgin plastic pellets and 2.5 tons of color additives monthly, using 20,000 kWh of grid electricity and 500 liters of diesel backup.'
  );

  // ── Shared loading / result state ───────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditResult, setAuditResult] = useState(null);

  // ── Login state ─────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  // Auto-navigate to results after successful audit
  useEffect(() => {
    if (auditResult) setActiveSection('results');
  }, [auditResult]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const resetError = () => setError(null);

  const handleApplyPreset = async (presetKey) => {
    const p = PRESET_SCENARIOS[presetKey];
    if (!p) return;
    setIndustry(p.industry);
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeActivities({ industry: p.industry, activities: p.activities });
      setAuditResult(res);
    } catch (err) {
      setError(err.message || 'Failed to analyze scenario');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const activities = [{ name: 'Grid Electricity', quantity: Number(kwh), unit: 'kWh' }];
    if (fuelType !== 'None' && fuelQty > 0) {
      const fuelUnit = fuelType === 'Natural gas' ? 'm³' : (fuelType === 'LPG' ? 'kg' : 'liters');
      activities.push({ name: fuelType === 'Diesel' ? 'Diesel Fuel' : fuelType, quantity: Number(fuelQty), unit: fuelUnit });
    }
    if (materialType !== 'None' && materialQty > 0) {
      activities.push({ name: materialType, quantity: Number(materialQty), unit: 'kg' });
    }
    try {
      const res = await analyzeActivities({ industry, activities });
      setAuditResult(res);
    } catch (err) {
      setError(err.message || 'Analysis error');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) { setError('Please select a file to upload (PDF, PNG, JPG).'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeDocument(uploadFile, industry);
      setAuditResult(res);
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
    } catch (err) {
      setError(err.message || 'Copilot extraction failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoggedIn(true);
    setTimeout(() => { setLoggedIn(false); }, 2000);
  };

  // ── Section content renderers ───────────────────────────────────────────────

  const renderAudit = () => (
    <div className="dash-content-inner">
      <div className="dash-section-header">
        <div>
          <div className="dash-section-badge">AUTONOMOUS GHG AUDIT</div>
          <h2 className="dash-section-title">Quick Facility Audit</h2>
          <p className="dash-section-desc">Enter your monthly energy, fuel, and material inputs for a verified GHG Protocol analysis.</p>
        </div>
      </div>

      {/* One-click presets */}
      <div className="dash-card">
        <div className="dash-card-label">ONE-CLICK BENCHMARK SCENARIOS</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
          {Object.keys(PRESET_SCENARIOS).map((key) => (
            <button key={key} type="button" disabled={loading} onClick={() => handleApplyPreset(key)} className="dash-preset-btn">
              <ChevronRight size={12} /> {key}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="dash-error"><AlertTriangle size={16} /> {error}<button onClick={resetError} className="dash-error-close"><X size={14}/></button></div>}

      <form onSubmit={handleQuickSubmit} className="dash-form">
        <div className="dash-card">
          <div className="dash-card-label">FACILITY CLASSIFICATION</div>
          <div className="dash-form-group">
            <label className="dash-label"><Building2 size={14} /> Industry Type</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="dash-select">
              {Object.keys(INDUSTRY_PRESETS).map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
              <option value="Other">Other / General Manufacturing</option>
            </select>
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-label">ENERGY CONSUMPTION</div>
          <div className="dash-form-grid-2">
            <div className="dash-form-group">
              <label className="dash-label"><Zap size={14} /> Monthly Electricity (kWh)</label>
              <input type="number" min="0" step="500" value={kwh} onChange={(e) => setKwh(Math.max(0, Number(e.target.value)))} className="dash-input" required />
            </div>
            <div className="dash-form-group">
              <label className="dash-label"><Flame size={14} /> Primary Fuel</label>
              <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="dash-select">
                <option value="Diesel">Diesel Fuel (L)</option>
                <option value="LPG">LPG (kg)</option>
                <option value="Natural gas">Natural Gas (m³)</option>
                <option value="Coal">Coal (kg)</option>
                <option value="Biomass">Biomass (kg)</option>
                <option value="None">None (All Electric)</option>
              </select>
            </div>
          </div>
          {fuelType !== 'None' && (
            <div className="dash-form-group" style={{ marginTop: '12px' }}>
              <label className="dash-label">Monthly Fuel Quantity</label>
              <input type="number" min="0" step="50" value={fuelQty} onChange={(e) => setFuelQty(Math.max(0, Number(e.target.value)))} className="dash-input" />
            </div>
          )}
        </div>

        <div className="dash-card">
          <div className="dash-card-label">RAW MATERIAL STREAM</div>
          <div className="dash-form-grid-2">
            <div className="dash-form-group">
              <label className="dash-label"><Layers size={14} /> Primary Material</label>
              <select value={materialType} onChange={(e) => setMaterialType(e.target.value)} className="dash-select">
                <option value="Virgin Plastic Pellets">Virgin Plastic Pellets</option>
                <option value="Virgin HDPE Plastic">Virgin HDPE Plastic</option>
                <option value="Virgin PP Plastic">Virgin PP Plastic</option>
                <option value="Virgin LDPE Film">Virgin LDPE Film</option>
                <option value="Virgin Steel">Virgin Steel</option>
                <option value="Virgin Aluminum">Virgin Aluminum</option>
                <option value="Virgin Kraft Paper">Virgin Kraft Paper</option>
                <option value="Packaging Material">Packaging Material</option>
                <option value="None">None / Pure Utility</option>
              </select>
            </div>
            {materialType !== 'None' && (
              <div className="dash-form-group">
                <label className="dash-label">Monthly Quantity (kg)</label>
                <input type="number" min="0" step="1000" value={materialQty} onChange={(e) => setMaterialQty(Math.max(0, Number(e.target.value)))} className="dash-input" />
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={loading} className="dash-submit-btn">
          {loading ? (
            <><RefreshCw size={16} className="spin-on-active" /> Analyzing Emission Factors & Hotspots...</>
          ) : (
            <>Execute Verified Facility Audit <ArrowRight size={15} /></>
          )}
        </button>
      </form>
    </div>
  );

  const renderUpload = () => (
    <div className="dash-content-inner">
      <div className="dash-section-header">
        <div>
          <div className="dash-section-badge">DOCUMENT INTELLIGENCE</div>
          <h2 className="dash-section-title">Utility Bill & PDF Upload</h2>
          <p className="dash-section-desc">Upload your electricity invoices, fuel receipts or energy audits. EcoLeak extracts and maps them automatically.</p>
        </div>
      </div>

      {error && <div className="dash-error"><AlertTriangle size={16} /> {error}<button onClick={resetError} className="dash-error-close"><X size={14}/></button></div>}

      <form onSubmit={handleDocumentSubmit} className="dash-form">
        <div className="dash-card">
          <div className="dash-card-label">FACILITY CLASSIFICATION</div>
          <div className="dash-form-group">
            <label className="dash-label"><Building2 size={14} /> Industry Type</label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="dash-select">
              {Object.keys(INDUSTRY_PRESETS).map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
              <option value="Other">Other / General Manufacturing</option>
            </select>
          </div>
        </div>

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
          <UploadCloud size={44} className="dropzone-icon" />
          <h4 className="dropzone-title">
            {uploadFile ? uploadFile.name : 'Drop your bill or invoice here'}
          </h4>
          <p className="dropzone-sub">
            {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB · Ready to analyze` : 'Accepts PDF, PNG, JPG — electricity bills, fuel invoices, energy audit reports'}
          </p>
          <label className="dash-file-label">
            {uploadFile ? 'Replace File' : 'Browse Files'}
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={(e) => setUploadFile(e.target.files[0] || null)} />
          </label>
          {uploadFile && (
            <button type="button" onClick={() => setUploadFile(null)} className="dropzone-clear">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        <button type="submit" disabled={loading || !uploadFile} className="dash-submit-btn">
          {loading ? (
            <><RefreshCw size={16} className="spin-on-active" /> Extracting & Running Audit...</>
          ) : (
            <>Extract & Audit Document <ArrowRight size={15} /></>
          )}
        </button>
      </form>
    </div>
  );

  const renderCopilot = () => (
    <div className="dash-content-inner">
      <div className="dash-section-header">
        <div>
          <div className="dash-section-badge">NATURAL LANGUAGE EXTRACTION</div>
          <h2 className="dash-section-title">AI Copilot Prompt</h2>
          <p className="dash-section-desc">Describe your factory's operations in plain English. The AI extracts quantities and maps them to GHG emission factors.</p>
        </div>
      </div>

      {error && <div className="dash-error"><AlertTriangle size={16} /> {error}<button onClick={resetError} className="dash-error-close"><X size={14}/></button></div>}

      <form onSubmit={handleChatSubmit} className="dash-form">
        <div className="dash-card">
          <div className="dash-card-label">EXAMPLE PROMPTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {[
              'Our factory processes 60t of virgin plastic pellets monthly, uses 20,000 kWh of grid power and 500L of diesel.',
              'We run a steel fabrication unit with 2t of virgin steel, LPG burners at 450kg/month and 30,000 kWh of electricity.',
              'Our packaging plant uses 5t of HDPE, 15,000 kWh electricity, and generates 1.2t of cardboard waste monthly.'
            ].map((ex, i) => (
              <button key={i} type="button" onClick={() => setChatMessage(ex)} className="dash-example-btn">
                <ChevronRight size={12} />{ex}
              </button>
            ))}
          </div>
        </div>

        <div className="dash-card">
          <div className="dash-card-label">YOUR FACTORY NARRATIVE</div>
          <textarea
            rows={6}
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            className="dash-textarea"
            placeholder="Describe your plant's monthly inputs, utilities, fuel consumption, and material streams..."
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{chatMessage.length} characters</span>
          </div>
        </div>

        <button type="submit" disabled={loading || !chatMessage.trim()} className="dash-submit-btn">
          {loading ? (
            <><RefreshCw size={16} className="spin-on-active" /> Parsing Narrative & Mapping Factors...</>
          ) : (
            <>Run Copilot Audit <ArrowRight size={15} /></>
          )}
        </button>
      </form>
    </div>
  );

  const renderResults = () => {
    if (!auditResult) return (
      <div className="dash-content-inner">
        <div className="dash-empty-state">
          <BarChart3 size={52} className="empty-icon" />
          <h3>No Audit Results Yet</h3>
          <p>Run a Quick Audit, upload a bill, or use the AI Copilot to generate your facility's emission report.</p>
          <button className="dash-submit-btn" style={{ marginTop: '20px' }} onClick={() => setActiveSection('audit')}>
            Start Quick Audit <ArrowRight size={15} />
          </button>
        </div>
      </div>
    );

    const recs = auditResult.circular_recommendations || [];
    const totalSavingsKg = recs.reduce((acc, r) => acc + (r.co2e_savings_kg || 0), 0);
    const totalOpex = recs.reduce((acc, r) => acc + (r.annual_opex_savings_inr || r.annual_opex_savings_usd * 84 || 0), 0);

    return (
      <div className="dash-content-inner">
        <div className="dash-section-header">
          <div>
            <div className="dash-section-badge">VERIFIED GHG AUDIT REPORT</div>
            <h2 className="dash-section-title">{auditResult.facility_summary?.industry} Facility</h2>
            <p className="dash-section-desc">ISO 14064-1 accounting · DQI: <strong>{auditResult.facility_summary?.data_quality_index ?? 100}%</strong></p>
          </div>
          <button className="dash-back-btn-sm" onClick={() => { setAuditResult(null); setActiveSection('audit'); }}>
            <RefreshCw size={14} /> New Audit
          </button>
        </div>

        {/* KPI strip */}
        <div className="dash-kpi-grid">
          <div className="dash-kpi-card">
            <span className="kpi-label">Total Emissions</span>
            <div className="kpi-value kpi-red">{formatCO2e(auditResult.facility_summary?.total_emissions_kg_co2e, true)}</div>
            <small className="kpi-sub">{Math.round(auditResult.facility_summary?.total_emissions_kg_co2e ?? 0).toLocaleString()} kg CO₂e</small>
          </div>
          <div className="dash-kpi-card">
            <span className="kpi-label">Reducible Emissions</span>
            <div className="kpi-value kpi-green">{formatCO2e(totalSavingsKg, true)}</div>
            <small className="kpi-sub">Closed-loop savings</small>
          </div>
          <div className="dash-kpi-card">
            <span className="kpi-label">Annual OPEX Upside</span>
            <div className="kpi-value kpi-cyan">{formatINR(totalOpex, true)}/yr</div>
            <small className="kpi-sub">Net recurring savings</small>
          </div>
        </div>

        {/* Scope breakdown */}
        <div className="dash-card">
          <div className="dash-card-label">GHG PROTOCOL SCOPE BREAKDOWN</div>
          <div className="dash-scope-grid">
            <div className="dash-scope-cell">
              <span className="scope-label scope-1">Scope 1 — Direct Fuel</span>
              <div className="scope-value">{formatCO2e(auditResult.facility_summary?.scope_breakdown?.scope_1_kg)}</div>
              <span className="scope-pct">{auditResult.facility_summary?.scope_breakdown?.scope_1_pct}% of footprint</span>
            </div>
            <div className="dash-scope-cell">
              <span className="scope-label scope-2">Scope 2 — Electricity</span>
              <div className="scope-value">{formatCO2e(auditResult.facility_summary?.scope_breakdown?.scope_2_kg)}</div>
              <span className="scope-pct">{auditResult.facility_summary?.scope_breakdown?.scope_2_pct}% of footprint</span>
            </div>
            <div className="dash-scope-cell">
              <span className="scope-label scope-3">Scope 3 — Materials & Waste</span>
              <div className="scope-value">{formatCO2e(auditResult.facility_summary?.scope_breakdown?.scope_3_kg)}</div>
              <span className="scope-pct">{auditResult.facility_summary?.scope_breakdown?.scope_3_pct}% of footprint</span>
            </div>
          </div>
        </div>

        {/* Leak points */}
        {auditResult.leak_points?.length > 0 && (
          <div className="dash-alert dash-alert-danger">
            <div className="dash-alert-title"><AlertTriangle size={15} /> PARETO HOTSPOT LEAK POINTS DETECTED</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              {auditResult.leak_points.map((lp, i) => (
                <span key={i} className="leak-badge">
                  {lp.raw_name || lp.activity_key} — {lp.share_percent ?? lp.percent_of_total}% [{(lp.hotspot_tier || lp.leak_point_severity || 'HIGH').toUpperCase()}]
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Circular recommendations */}
        <div className="dash-card">
          <div className="dash-card-label">CHROMADB MATCHED CIRCULAR INTERVENTIONS</div>
          {recs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              {recs.map((rec, i) => (
                <div key={i} className="dash-rec-card">
                  <div className="rec-header">
                    <div>
                      <span className="rec-type-label">CIRCULAR SUBSTITUTION</span>
                      <h4 className="rec-title">
                        {rec.target_activity?.replace(/_/g, ' ')} → <strong>{rec.alternative?.replace(/_/g, ' ')}</strong>
                      </h4>
                    </div>
                    <span className="rec-feasibility">Feasibility: {rec.feasibility_score}/100 · {rec.technical_difficulty} Complexity</span>
                  </div>
                  <div className="rec-metrics">
                    <div className="rec-metric">
                      <small>CO₂e Abatement</small>
                      <strong className="metric-green">-{rec.co2e_reduction_percent}% ({formatCO2e(rec.co2e_savings_kg)})</strong>
                    </div>
                    <div className="rec-metric">
                      <small>Est. CAPEX</small>
                      <strong>{formatINR(rec.estimated_capex_inr || rec.estimated_capex_usd * 84)}</strong>
                    </div>
                    <div className="rec-metric">
                      <small>Annual OPEX Saving</small>
                      <strong className="metric-cyan">{formatINR(rec.annual_opex_savings_inr || rec.annual_opex_savings_usd * 84)}/yr</strong>
                    </div>
                    <div className="rec-metric">
                      <small>Payback Horizon</small>
                      <strong>{rec.payback_months ? `${rec.payback_months} Months` : 'Immediate'}</strong>
                    </div>
                  </div>
                  {rec.regulatory_readiness && (
                    <p className="rec-compliance">
                      <ShieldCheck size={12} /> <strong>Standards & Compliance:</strong> {rec.regulatory_readiness}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>No high-volume virgin material hotspots detected.</p>
          )}
        </div>

        {/* Unresolved activities */}
        {auditResult.unresolved_activities?.length > 0 && (
          <div className="dash-alert dash-alert-warning">
            <div className="dash-alert-title">UNRESOLVED STREAMS ({auditResult.unresolved_activities.length})</div>
            <ul style={{ fontSize: '12.5px', paddingLeft: '18px', marginTop: '8px' }}>
              {auditResult.unresolved_activities.map((un, i) => (
                <li key={i}><strong>{un.raw_name}</strong>: {un.warning} → <em>{un.suggested_action}</em></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderSignIn = () => (
    <div className="dash-content-inner">
      <div className="dash-section-header">
        <div>
          <div className="dash-section-badge">OPERATOR CONSOLE</div>
          <h2 className="dash-section-title">Sign In to EcoLeak</h2>
          <p className="dash-section-desc">Access your facility's utility data, saved audits, and intervention ledger.</p>
        </div>
      </div>

      <div className="dash-login-wrap">
        {!loggedIn ? (
          <form onSubmit={handleLogin} className="dash-login-form">
            <div className="dash-form-group">
              <label className="dash-label"><Mail size={14} /> Corporate Email</label>
              <input type="email" placeholder="operator@plant.com" value={email} onChange={(e) => setEmail(e.target.value)} className="dash-input" required />
            </div>
            <div className="dash-form-group">
              <label className="dash-label"><Lock size={14} /> Password</label>
              <input type="password" placeholder="••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="dash-input" required />
            </div>
            <button type="submit" className="dash-submit-btn">
              Sign In to Console <ArrowRight size={15} />
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '14px' }}>
              Don't have an account? <a href="#" style={{ color: 'var(--mint-hover)' }}>Request access →</a>
            </p>
          </form>
        ) : (
          <div className="dash-login-success">
            <CheckCircle2 size={52} style={{ color: 'var(--mint)' }} />
            <h3>Authenticated Successfully</h3>
            <p>Opening your facility ledger...</p>
          </div>
        )}
      </div>
    </div>
  );

  const sectionRenderers = { audit: renderAudit, upload: renderUpload, copilot: renderCopilot, results: renderResults, signin: renderSignIn };

  return (
    <div className="dash-shell">
      {/* ── Glassy Sidebar ───────────────────────────────────────────────────── */}
      <aside className={`dash-sidebar ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-mark-small"><span></span><span></span></div>
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
          {sidebarOpen && <span>Back to Home</span>}
        </button>

        {sidebarOpen && <div className="sidebar-nav-label">Navigation</div>}

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ id, icon: Icon, label, sub }) => (
            <button
              key={id}
              className={`sidebar-nav-item ${activeSection === id ? 'nav-active' : ''} ${id === 'results' && auditResult ? 'has-results' : ''}`}
              onClick={() => setActiveSection(id)}
            >
              <span className="nav-icon-wrap"><Icon size={17} /></span>
              {sidebarOpen && (
                <span className="nav-label-wrap">
                  <span className="nav-label">{label}</span>
                  <span className="nav-sub">{id === 'results' && auditResult ? '✓ Report ready' : sub}</span>
                </span>
              )}
              {id === 'results' && auditResult && sidebarOpen && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <>
            <div className="sidebar-divider" />
            <div className="sidebar-footer">
              <div className="sidebar-footer-card">
                <div className="sidebar-footer-text">EcoLeak v1.0</div>
                <div className="sidebar-footer-sub">GHG Protocol · ISO 14064-1</div>
                <div className="sidebar-status-pill">
                  <span className="sidebar-status-dot" />
                  Platform Active
                </div>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="dash-main">
        <div className="dash-main-scroll">
          {(sectionRenderers[activeSection] || renderAudit)()}
        </div>
      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, ArrowRight, Zap, Flame, Building2, 
  UploadCloud, MessageSquareText, Layers, AlertTriangle, 
  TrendingDown, Coins, ShieldCheck, RefreshCw, FileText, ChevronRight, Languages
} from 'lucide-react';
import { 
  analyzeActivities, 
  analyzeDocument, 
  analyzeChat, 
  formatINR, 
  formatCO2e,
  formatDisplayName
} from '../services/api';
import { INDUSTRY_PRESETS } from '../data/mockData';
import JargonTooltip from './JargonTooltip';

// Real industrial benchmark presets matching hackout's verified databases
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

export default function AssessmentModal({ isOpen, onClose, initialIndustry = 'Plastic manufacturing' }) {
  const [activeTab, setActiveTab] = useState('quick'); // 'quick' | 'document' | 'chat'
  const [industry, setIndustry] = useState(initialIndustry);
  
  // Quick Assessment Form State
  const [kwh, setKwh] = useState(20000);
  const [fuelType, setFuelType] = useState('Diesel');
  const [fuelQty, setFuelQty] = useState(500);
  const [materialType, setMaterialType] = useState('Virgin Plastic Pellets');
  const [materialQty, setMaterialQty] = useState(60000);

  // Document Upload State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadLanguage, setUploadLanguage] = useState('auto');
  const [sarvamApiKey, setSarvamApiKey] = useState('');

  // Chat Copilot State
  const [chatMessage, setChatMessage] = useState(
    'Our factory in Maharashtra processes 60 tons of virgin plastic pellets and 2.5 tons of color additives monthly, using 20,000 kWh of grid electricity and 500 liters of diesel backup.'
  );

  // Loading & Result States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditResult, setAuditResult] = useState(null);

  useEffect(() => {
    if (initialIndustry) setIndustry(initialIndustry);
  }, [initialIndustry]);

  if (!isOpen) return null;

  // Apply one-click preset
  const handleApplyPreset = async (presetKey) => {
    const p = PRESET_SCENARIOS[presetKey];
    if (!p) return;
    setIndustry(p.industry);
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeActivities({
        industry: p.industry,
        activities: p.activities
      });
      setAuditResult(res);
    } catch (err) {
      setError(err.message || 'Failed to analyze scenario');
    } finally {
      setLoading(false);
    }
  };

  // Submit Quick Assessment Form
  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const activities = [
      { name: 'Grid Electricity', quantity: Number(kwh), unit: 'kWh' }
    ];

    if (fuelType !== 'None' && fuelQty > 0) {
      const fuelUnit = fuelType === 'Natural gas' ? 'm³' : (fuelType === 'LPG' ? 'kg' : 'liters');
      activities.push({
        name: fuelType === 'Diesel' ? 'Diesel Fuel' : fuelType,
        quantity: Number(fuelQty),
        unit: fuelUnit
      });
    }

    if (materialType !== 'None' && materialQty > 0) {
      activities.push({
        name: materialType,
        quantity: Number(materialQty),
        unit: 'kg'
      });
    }

    try {
      const res = await analyzeActivities({
        industry,
        activities
      });
      setAuditResult(res);
    } catch (err) {
      setError(err.message || 'Analysis error');
    } finally {
      setLoading(false);
    }
  };

  // Submit Document Upload
  const handleDocumentSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setError('Please select a file to upload (PDF, PNG, JPG).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await analyzeDocument(uploadFile, industry, uploadLanguage, sarvamApiKey);
      setAuditResult(res);
    } catch (err) {
      setError(err.message || 'Document analysis failed. Ensure file is readable.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Chat Copilot
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-dialog" 
        style={{ width: 'min(780px, 95vw)', maxHeight: '90vh', overflowY: 'auto' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {!auditResult ? (
          <div>
            <h2>Map your factory's closed loop.</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
              Deterministic GHG Protocol accounting (Scopes 1, 2, 3) coupled with Pareto leak-point detection and ChromaDB circular alternatives.
            </p>

            {/* Assessment Input Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '18px',
              padding: '4px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--line)'
            }}>
              <button
                type="button"
                className={`sector-btn ${activeTab === 'quick' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                onClick={() => setActiveTab('quick')}
              >
                <Layers size={14} style={{ display: 'inline', marginRight: '6px' }} /> Quick Inputs &amp; Presets
              </button>
              <button
                type="button"
                className={`sector-btn ${activeTab === 'document' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                onClick={() => setActiveTab('document')}
              >
                <UploadCloud size={14} style={{ display: 'inline', marginRight: '6px' }} /> Bill / PDF Upload
              </button>
              <button
                type="button"
                className={`sector-btn ${activeTab === 'chat' ? 'active' : ''}`}
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquareText size={14} style={{ display: 'inline', marginRight: '6px' }} /> AI Copilot Prompt
              </button>
            </div>

            {error && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'var(--rose-light)',
                border: '1px solid var(--rose)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--rose)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            {/* TAB 1: QUICK BENCHMARK */}
            {activeTab === 'quick' && (
              <form onSubmit={handleQuickSubmit} style={{ marginTop: '20px' }}>
                {/* One-click Presets */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    ONE-CLICK FACTORY BENCHMARK SCENARIOS:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.keys(PRESET_SCENARIOS).map((presetName) => (
                      <button
                        key={presetName}
                        type="button"
                        disabled={loading}
                        onClick={() => handleApplyPreset(presetName)}
                        style={{
                          background: 'var(--bg-white)',
                          border: '1px solid var(--line-strong)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--emerald-main)'
                        }}
                      >
                        <ChevronRight size={13} color="var(--mint)" /> {presetName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="modal-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={15} color="var(--mint)" /> Industry Classification
                  </label>
                  <select 
                    value={industry} 
                    onChange={(e) => setIndustry(e.target.value)}
                    className="modal-select"
                  >
                    {Object.keys(INDUSTRY_PRESETS).map((ind) => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                    <option value="Other">Other / General Manufacturing</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="modal-form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={15} color="var(--mint)" /> Monthly Electricity (kWh)
                    </label>
                    <input 
                      type="number"
                      min="0"
                      step="500"
                      value={kwh}
                      onChange={(e) => setKwh(Math.max(0, Number(e.target.value)))}
                      className="modal-input"
                      required
                    />
                  </div>

                  <div className="modal-form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Flame size={15} color="var(--mint)" /> Primary Fuel
                    </label>
                    <select 
                      value={fuelType} 
                      onChange={(e) => setFuelType(e.target.value)}
                      className="modal-select"
                    >
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
                  <div className="modal-form-group">
                    <label>Monthly Fuel Consumption Quantity</label>
                    <input 
                      type="number"
                      min="0"
                      step="50"
                      value={fuelQty}
                      onChange={(e) => setFuelQty(Math.max(0, Number(e.target.value)))}
                      className="modal-input"
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                  <div className="modal-form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={15} color="var(--mint)" /> Primary Raw Material Stream
                    </label>
                    <select 
                      value={materialType} 
                      onChange={(e) => setMaterialType(e.target.value)}
                      className="modal-select"
                    >
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
                    <div className="modal-form-group">
                      <label>Monthly Material (kg)</label>
                      <input 
                        type="number"
                        min="0"
                        step="1000"
                        value={materialQty}
                        onChange={(e) => setMaterialQty(Math.max(0, Number(e.target.value)))}
                        className="modal-input"
                      />
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-primary btn-lg" 
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="spin-on-active" /> Analyzing Emission Factors &amp; Hotspots...
                    </>
                  ) : (
                    <>
                      Execute Verified Facility Audit <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: DOCUMENT UPLOAD */}
            {activeTab === 'document' && (
              <form onSubmit={handleDocumentSubmit} style={{ marginTop: '20px' }}>
                <div style={{
                  border: '2px dashed var(--line-strong)',
                  borderRadius: 'var(--radius-md)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'var(--bg-white)',
                  cursor: 'pointer'
                }}>
                  <UploadCloud size={40} color="var(--mint)" style={{ margin: '0 auto 12px' }} />
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {uploadFile ? uploadFile.name : 'Upload Utility Bill, Invoice, or Monthly Energy Audit'}
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Accepts PDF reports, electricity utility invoices, or fuel receipts.
                  </p>
                  <input 
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ marginTop: '14px' }}
                    onChange={(e) => setUploadFile(e.target.files[0] || null)}
                  />
                </div>

                {/* Indian Language Support & Engine Badge */}
                <div style={{
                  marginTop: '14px',
                  padding: '12px 14px',
                  background: 'var(--bg-white)',
                  border: '1px solid var(--line-strong)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="elite-tag badge-cyan" style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Languages size={12} /> Sarvam AI DocAgent (Indic OCR)
                      </span>
                      <span className="elite-tag badge-subtle" style={{ fontSize: '10px' }}>
                        PyMuPDF Fallback
                      </span>
                    </div>
                  </div>

                  <div className="modal-form-group" style={{ marginBottom: '0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <Languages size={14} color="var(--mint)" /> Document Language
                    </label>
                    <select
                      value={uploadLanguage}
                      onChange={(e) => setUploadLanguage(e.target.value)}
                      className="modal-select"
                      style={{ fontSize: '13px', padding: '8px 10px' }}
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
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !uploadFile}
                  className="btn btn-primary btn-lg" 
                  style={{ width: '100%', marginTop: '16px' }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="spin-on-active" /> Extracting Data &amp; Running Audit...
                    </>
                  ) : (
                    <>
                      Extract &amp; Audit Document <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 3: AI COPILOT */}
            {activeTab === 'chat' && (
              <form onSubmit={handleChatSubmit} style={{ marginTop: '20px' }}>
                <div className="modal-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquareText size={15} color="var(--mint)" /> Factory Operational Narrative
                  </label>
                  <textarea 
                    rows={4}
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="modal-input"
                    style={{ resize: 'vertical', lineHeight: '1.5' }}
                    placeholder="Describe your plant's monthly inputs, utilities, fuel, and scrap..."
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading || !chatMessage.trim()}
                  className="btn btn-primary btn-lg" 
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  {loading ? (
                    <>
                      <RefreshCw size={18} className="spin-on-active" /> Parsing Natural Language &amp; Mapping Factors...
                    </>
                  ) : (
                    <>
                      Run Copilot Audit <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        ) : (
          /* ============================================================
             LIVE AUDIT REPORT VIEW
             ============================================================ */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                <JargonTooltip term="DQI">DQI</JargonTooltip>: <strong>{auditResult.facility_summary?.data_quality_index ?? 100}%</strong>
              </span>
            </div>

            <h2>{auditResult.facility_summary?.industry} Facility Audit</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '2px' }}>
              Calculated using localized emission factors and deterministic <JargonTooltip term="ISO 14064-1">ISO 14064-1</JargonTooltip> accounting.
            </p>

            {/* Top Stat Summary Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
              marginTop: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Total Emissions</span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                  <JargonTooltip term="CO2e">{formatCO2e(auditResult.facility_summary?.total_emissions_kg_co2e, true)}</JargonTooltip>
                </div>
                <small style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {Math.round(auditResult.facility_summary?.total_emissions_kg_co2e ?? 0).toLocaleString()} <JargonTooltip term="CO2e">kg CO₂e</JargonTooltip>
                </small>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', color: 'var(--mint-hover)', fontWeight: 700, textTransform: 'uppercase' }}>Reducible Emissions</span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--mint-hover)', marginTop: '4px' }}>
                  {auditResult.circular_recommendations?.length > 0 
                    ? formatCO2e(auditResult.circular_recommendations.reduce((acc, r) => acc + (r.co2e_savings_kg || 0), 0), true)
                    : '0 kg CO₂e'}
                </div>
                <small style={{ fontSize: '11px', color: 'var(--mint-hover)' }}>
                  <JargonTooltip term="Closed-Loop">Closed-loop savings</JargonTooltip>
                </small>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: '11px', color: 'var(--cyan-fresh)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Annual <JargonTooltip term="OPEX">OPEX Upside</JargonTooltip>
                </span>
                <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--cyan-fresh)', marginTop: '4px' }}>
                  {auditResult.circular_recommendations?.length > 0 
                    ? formatINR(auditResult.circular_recommendations.reduce((acc, r) => acc + (r.annual_opex_savings_inr || 0), 0), true) + '/yr'
                    : '₹0'}
                </div>
                <small style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Net recurring savings</small>
              </div>
            </div>

            {/* Scope 1, 2, 3 Breakdown Pills */}
            <div style={{
              background: 'var(--bg-white)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                <JargonTooltip term="GHG Protocol">GHG PROTOCOL</JargonTooltip> SCOPE BREAKDOWN:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--rose)', fontWeight: 700 }}>
                    <JargonTooltip term="Scope 1">Scope 1 (Direct Fuel)</JargonTooltip>
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                    {formatCO2e(auditResult.facility_summary?.scope_breakdown?.scope_1_kg)}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {auditResult.facility_summary?.scope_breakdown?.scope_1_pct}% of footprint
                  </span>
                </div>

                <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--amber)', fontWeight: 700 }}>
                    <JargonTooltip term="Scope 2">Scope 2 (Electricity)</JargonTooltip>
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                    {formatCO2e(auditResult.facility_summary?.scope_breakdown?.scope_2_kg)}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {auditResult.facility_summary?.scope_breakdown?.scope_2_pct}% of footprint
                  </span>
                </div>

                <div style={{ padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--mint-hover)', fontWeight: 700 }}>
                    <JargonTooltip term="Scope 3">Scope 3 (Materials &amp; Waste)</JargonTooltip>
                  </span>
                  <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                    {formatCO2e(auditResult.facility_summary?.scope_breakdown?.scope_3_kg)}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {auditResult.facility_summary?.scope_breakdown?.scope_3_pct}% of footprint
                  </span>
                </div>
              </div>
            </div>

            {/* Leak Point / Hotspots Warning Strip */}
            {auditResult.leak_points && auditResult.leak_points.length > 0 && (
              <div style={{
                background: 'var(--rose-light)',
                border: '1px solid var(--rose)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={16} /> <JargonTooltip term="Pareto 80/20">PARETO</JargonTooltip> <JargonTooltip term="Leak Point">HOTSPOT LEAK POINTS</JargonTooltip> DETECTED:
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {auditResult.leak_points.map((lp, i) => (
                    <span 
                      key={i} 
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--rose)',
                        color: 'var(--rose)',
                        fontSize: '12px',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 700
                      }}
                    >
                      {formatDisplayName(lp.raw_name || lp.activity_key)} — {lp.share_percent ?? lp.percent_of_total}% of plant emissions [{(lp.hotspot_tier || lp.leak_point_severity || 'HIGH').toUpperCase()}]
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Circular Recommendations Cards */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
                CHROMADB MATCHED CIRCULAR INTERVENTIONS:
              </div>

              {auditResult.circular_recommendations && auditResult.circular_recommendations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {auditResult.circular_recommendations.map((rec, i) => (
                    <div 
                      key={i}
                      style={{
                        background: 'var(--bg-white)',
                        border: '1px solid var(--line-strong)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--mint-hover)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            CIRCULAR SUBSTITUTION
                          </span>
                          <h4 style={{ fontSize: '16px', color: 'var(--emerald-deep)', marginTop: '2px' }}>
                            {formatDisplayName(rec.target_activity)} &rarr; <strong style={{ color: 'var(--mint-hover)' }}>{formatDisplayName(rec.alternative)}</strong>
                          </h4>
                        </div>
                        <div style={{
                          background: 'var(--mint-light)',
                          color: 'var(--mint-hover)',
                          padding: '4px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '12px',
                          fontWeight: 800
                        }}>
                          Feasibility: {rec.feasibility_score}/100 ({rec.technical_difficulty} Complexity)
                        </div>
                      </div>

                      {/* Metrics 4-cell */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '10px',
                        marginTop: '12px',
                        padding: '12px',
                        background: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-sm)'
                      }}>
                        <div>
                          <small style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>CO₂e Abatement</small>
                          <strong style={{ color: 'var(--mint-hover)', fontSize: '14px' }}>
                            -{rec.co2e_reduction_percent}% ({formatCO2e(rec.co2e_savings_kg)})
                          </strong>
                        </div>
                        <div>
                          <small style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Estimated CAPEX</small>
                          <strong style={{ fontSize: '14px' }}>
                            {formatINR(rec.estimated_capex_inr || rec.estimated_capex_usd * 84)}
                          </strong>
                        </div>
                        <div>
                          <small style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Annual OPEX Saving</small>
                          <strong style={{ color: 'var(--emerald-deep)', fontSize: '14px' }}>
                            {formatINR(rec.annual_opex_savings_inr || rec.annual_opex_savings_usd * 84)}/yr
                          </strong>
                        </div>
                        <div>
                          <small style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'block' }}>Payback Horizon</small>
                          <strong style={{ fontSize: '14px' }}>
                            {rec.payback_months ? `${rec.payback_months} Months` : 'Immediate'}
                          </strong>
                        </div>
                      </div>

                      {rec.regulatory_readiness && (
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          <ShieldCheck size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} color="var(--mint)" />
                          <strong>Standards &amp; Compliance:</strong> {rec.regulatory_readiness}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '14px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-muted)' }}>
                  No high-volume virgin material hotspots detected in current input.
                </div>
              )}
            </div>

            {/* Unresolved Activities (if any) */}
            {auditResult.unresolved_activities && auditResult.unresolved_activities.length > 0 && (
              <div style={{
                background: 'var(--amber-light)',
                border: '1px solid var(--amber)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--amber)', marginBottom: '4px' }}>
                  UNRESOLVED STREAMS DETECTED ({auditResult.unresolved_activities.length}):
                </div>
                <ul style={{ fontSize: '12px', color: 'var(--text-primary)', paddingLeft: '18px' }}>
                  {auditResult.unresolved_activities.map((un, i) => (
                    <li key={i} style={{ marginTop: '3px' }}>
                      <strong>{un.raw_name}</strong>: {un.warning} <em>&rarr; {un.suggested_action}</em>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Footer Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => setAuditResult(null)}
              >
                Modify Parameters
              </button>
              <button 
                className="btn btn-primary"
                onClick={onClose}
              >
                Close Audit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

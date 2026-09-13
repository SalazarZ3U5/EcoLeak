import React, { useState } from 'react';
import { Languages, Sparkles, CheckCircle2, ArrowRight, FileText, Cpu, ShieldCheck } from 'lucide-react';

const DEMO_LANGUAGES = [
  {
    id: 'hi',
    name: 'Hindi',
    native: 'हिन्दी',
    flag: 'HI',
    region: 'North & Central India',
    sampleInput: 'बिजली बिल: 18,500 kWh (डीजल जनरेटर: 420 लीटर)',
    parsedCategory: 'Scope 2 Grid Electricity + Scope 1 Diesel',
    extractedQty: '18,500 kWh · 420 L',
    co2e: '16.42 tCO₂e'
  },
  {
    id: 'mr',
    name: 'Marathi',
    native: 'मराठी',
    flag: 'MR',
    region: 'Maharashtra (Chakan / Bhosari)',
    sampleInput: 'कच्चा माल: व्हर्जिन एचडीपीई ग्रॅन्युल्स 12,000 किलो',
    parsedCategory: 'Scope 3 Virgin HDPE Polymer',
    extractedQty: '12,000 kg',
    co2e: '22.80 tCO₂e'
  },
  {
    id: 'gu',
    name: 'Gujarati',
    native: 'ગુજરાતી',
    flag: 'GU',
    region: 'Gujarat (Surat / Ankleshwar)',
    sampleInput: 'કુદરતી ગેસ વપરાશ: 4,800 ઘન મીટર બોઈલર માટે',
    parsedCategory: 'Scope 1 Natural Gas (Boiler Thermal)',
    extractedQty: '4,800 m³',
    co2e: '9.74 tCO₂e'
  },
  {
    id: 'ta',
    name: 'Tamil',
    native: 'தமிழ்',
    flag: 'TA',
    region: 'Tamil Nadu (Coimbatore / Tirupur)',
    sampleInput: 'மின்சார பயன்பாடு: 32,000 யூனிட்கள் மற்றும் நிலக்கரி 5 டன்',
    parsedCategory: 'Scope 2 TANGEDCO Grid + Scope 1 Coal',
    extractedQty: '32,000 kWh · 5,000 kg',
    co2e: '38.16 tCO₂e'
  },
  {
    id: 'te',
    name: 'Telugu',
    native: 'తెలుగు',
    flag: 'TE',
    region: 'Andhra Pradesh & Telangana',
    sampleInput: 'ఫర్నేస్ ఆయిల్ వినియోగం: 2,500 లీటర్లు మెటల్ కాస్టింగ్',
    parsedCategory: 'Scope 1 Furnace Oil (Metal Casting)',
    extractedQty: '2,500 L',
    co2e: '7.85 tCO₂e'
  },
  {
    id: 'pa',
    name: 'Punjabi',
    native: 'ਪੰਜਾਬੀ',
    flag: 'PA',
    region: 'Punjab & Haryana (Ludhiana)',
    sampleInput: 'ਡੀਜ਼ਲ ਖਪਤ: 1,200 ਲੀਟਰ ਟਰੈਕਟਰ ਅਤੇ ਜਨਰੇਟਰ',
    parsedCategory: 'Scope 1 Mobile & Stationary Diesel',
    extractedQty: '1,200 L',
    co2e: '3.22 tCO₂e'
  }
];

export default function MultilingualShowcase({ onOpenAssessment }) {
  const [selectedLang, setSelectedLang] = useState(DEMO_LANGUAGES[0]);

  return (
    <section className="section multilingual-showcase-section" id="multilingual">
      <div className="container">
        {/* Header */}
        <div className="multilingual-header">
          <div className="multilingual-badge">
            <Languages size={15} color="#0f172a" />
            <span>INDIC OCR &amp; NATURAL LANGUAGE INGESTION · POWERED BY SARVAM AI</span>
          </div>

          <h2 className="multilingual-title">
            Factory Audits in the Language of the <br />
            <span className="gradient-text">Shop Floor &amp; Local Vendors</span>
          </h2>

          <p className="multilingual-subtitle">
            Most Indian factory invoices, state electricity board bills (MSEDCL, TANGEDCO, UGVCL), and weighbridge chits 
            arrive in regional Indic scripts. EcoLeak pairs <strong>Sarvam AI Vision 1.5</strong> with our 
            deterministic emission engine to extract activities in <strong>22+ Indian languages</strong> with zero translation error.
          </p>
        </div>

        {/* Interactive Showcase Bench */}
        <div className="multilingual-bench-card">
          {/* Top Language Selector Tabs */}
          <div className="multilingual-tabs-bar">
            <span className="multilingual-tabs-label">Select Regional Script:</span>
            <div className="multilingual-tabs-list">
              {DEMO_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  className={`multilingual-tab-btn ${selectedLang.id === lang.id ? 'active' : ''}`}
                  onClick={() => setSelectedLang(lang)}
                >
                  <span className="tab-flag">{lang.flag}</span>
                  <span className="tab-native">{lang.native}</span>
                  <span className="tab-en">({lang.name})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Extraction Simulation Board */}
          <div className="multilingual-demo-grid">
            {/* Left: Raw Regional Document Input */}
            <div className="multilingual-panel raw-panel">
              <div className="panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} color="#64748b" />
                  <strong>Raw Regional Vendor Chit / Invoice</strong>
                </div>
                <span className="panel-badge-gray">{selectedLang.region}</span>
              </div>

              <div className="raw-doc-preview">
                <div className="chit-watermark">REGIONAL INVOICE</div>
                <div className="chit-content">
                  <div className="chit-line label">INCOMING VENDOR LOG / CHIT:</div>
                  <div className="chit-text-highlight">
                    "{selectedLang.sampleInput}"
                  </div>
                  <div className="chit-meta">
                    <span>Language: {selectedLang.name} ({selectedLang.native})</span>
                    <span>Script: Sarvam DocAgent Optical Parser</span>
                  </div>
                </div>
              </div>

              <div className="multilingual-engine-flow">
                <div className="flow-step">
                  <Cpu size={14} color="#0284c7" />
                  <span>Sarvam Indic OCR &amp; Unit Disambiguation</span>
                </div>
                <span className="flow-arrow">→</span>
                <div className="flow-step">
                  <ShieldCheck size={14} color="#0284c7" />
                  <span>Deterministic Q × EF Engine</span>
                </div>
              </div>
            </div>

            {/* Right: Deterministic Decoded Output */}
            <div className="multilingual-panel parsed-panel">
              <div className="panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#0f172a" />
                  <strong>Deterministic Clean Extracted Activity</strong>
                </div>
                <span className="panel-badge-green">
                  <CheckCircle2 size={12} /> 100% Verified
                </span>
              </div>

              <div className="parsed-results-box">
                <div className="result-row">
                  <span className="res-label">Resolved GHG Scope:</span>
                  <strong className="res-val scope-val">{selectedLang.parsedCategory}</strong>
                </div>

                <div className="result-row">
                  <span className="res-label">Physical Unit Normalized:</span>
                  <strong className="res-val qty-val">{selectedLang.extractedQty}</strong>
                </div>

                <div className="result-row">
                  <span className="res-label">Deterministic Carbon Burn:</span>
                  <strong className="res-val carbon-val">{selectedLang.co2e}</strong>
                </div>

                <div className="result-notice">
                  <ShieldCheck size={14} color="#059669" />
                  <span>
                    Zero LLM arithmetic. Quantities mapped directly to CEA / GHG Protocol emission factors without language distortion.
                  </span>
                </div>
              </div>

              <div className="multilingual-cta-row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onOpenAssessment}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Upload Your Own Invoice / Bill <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Supporting Micro Ticker */}
        <div className="multilingual-pills-footer">
          <span className="pill-title">Supported Across 22+ Official Indian Languages:</span>
          <div className="lang-micro-badges">
            {['Hindi', 'Marathi', 'Gujarati', 'Tamil', 'Telugu', 'Kannada', 'Bengali', 'Malayalam', 'Punjabi', 'Odia', 'Assamese', 'Urdu', '+10 more'].map((l) => (
              <span key={l} className="lang-micro-pill">{l}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

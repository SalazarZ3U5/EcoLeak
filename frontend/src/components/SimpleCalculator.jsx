import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { INDUSTRY_PRESETS } from '../data/mockData';
import { useTilt } from '../hooks/useTilt';

export default function SimpleCalculator({ onOpenAssessment }) {
  const [selectedIndustry, setSelectedIndustry] = useState('Plastic manufacturing');
  const [monthlyBillLakh, setMonthlyBillLakh] = useState(8.5);
  const tilt = useTilt(7);

  const preset = INDUSTRY_PRESETS[selectedIndustry] || INDUSTRY_PRESETS['Plastic manufacturing'];

  const annualBillLakh = (monthlyBillLakh * 12).toFixed(1);
  const netSavingsLakh = (monthlyBillLakh * 12 * 0.24).toFixed(1);
  const co2Tons = Math.round(monthlyBillLakh * 80);
  const co2CutTons = Math.round(co2Tons * 0.35);

  return (
    <section className="section" id="calculator" style={{ background: '#f2f7f4' }}>
      <div className="container">
        <div className="section-header center">
          <h2>
            Quantify your factory's closed-loop upside.
          </h2>
          <p>
            Select your industrial sector and average monthly utility spend to generate a real-time financial and emissions breakdown.
          </p>
        </div>

        {/* 3D Tilting Ledger */}
        <div
          className="ledger-container tilt-card"
          ref={tilt.ref}
          onMouseMove={tilt.onMouseMove}
          onMouseLeave={tilt.onMouseLeave}
        >
          {/* Header Bar with Sector Tabs */}
          <div className="ledger-header-bar">
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              INDUSTRIAL SECTOR:
            </span>
            <div className="ledger-sector-tabs">
              {Object.keys(INDUSTRY_PRESETS).map((ind) => (
                <button
                  key={ind}
                  className={`sector-btn ${selectedIndustry === ind ? 'active' : ''}`}
                  onClick={() => setSelectedIndustry(ind)}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Ledger Body Split */}
          <div className="ledger-body-split">
            {/* Left Controls & Line Items */}
            <div className="ledger-left-controls">
              <div className="ledger-slider-wrap">
                <div className="ledger-slider-header">
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Monthly Energy &amp; Fuel Spend
                  </span>
                  <span className="slider-big-val">₹{monthlyBillLakh} Lakh/mo</span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="30.0"
                  step="0.5"
                  value={monthlyBillLakh}
                  onChange={(e) => setMonthlyBillLakh(parseFloat(e.target.value))}
                  className="scrub-range-slider"
                />
                <div className="ledger-slider-scale">
                  <span>Small Plant (₹2L/mo)</span>
                  <span>Mid Enterprise (₹15L/mo)</span>
                  <span>Heavy Unit (₹30L/mo)</span>
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                AUTOMATED FACILITY AUDIT FINDINGS:
              </div>

              <div className="ledger-breakdown-list">
                <div className="ledger-breakdown-row">
                  <div className="row-left">
                    <span className="row-tag leak">LEAK POINT</span>
                    <span>{preset.leakPoint}</span>
                  </div>
                  <span className="row-val" style={{ color: 'var(--rose)' }}>High Intensity</span>
                </div>

                <div className="ledger-breakdown-row">
                  <div className="row-left">
                    <span className="row-tag closed">CIRCULAR FIX</span>
                    <span>{preset.circularIntervention}</span>
                  </div>
                  <span className="row-val" style={{ color: 'var(--mint-hover)' }}>Verified Match</span>
                </div>

                <div className="ledger-breakdown-row">
                  <div className="row-left">
                    <span className="row-tag closed">ANNUAL SPEND</span>
                    <span>Baseline Electricity + Thermal Fuel</span>
                  </div>
                  <span className="row-val">₹{annualBillLakh} Lakh/yr</span>
                </div>
              </div>
            </div>

            {/* Right Summary */}
            <div className="ledger-right-summary">
              <div>
                <span className="summary-headline">NET RETURN SUMMARY</span>

                <div className="big-net-savings">
                  <strong className="big-net-num">₹{netSavingsLakh} Lakh</strong>
                  <span className="big-net-label">Projected Annual OPEX Savings</span>
                </div>

                <div className="summary-stat-grid">
                  <div className="stat-item">
                    <small>Emissions Abatement</small>
                    <strong style={{ color: 'var(--mint-hover)' }}>−{preset.reduction} CO₂</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>~{co2CutTons} tCO₂e/yr cut</span>
                  </div>
                  <div className="stat-item">
                    <small>CapEx Amortization</small>
                    <strong>{preset.payback}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payback breakeven</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={() => onOpenAssessment(selectedIndustry)}
              >
                Download Full Facility Report <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

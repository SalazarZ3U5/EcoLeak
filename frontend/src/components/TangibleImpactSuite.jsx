import React, { useState } from 'react';
import {
  Car, Trees, Droplets, Zap, Sparkles, Sliders, ArrowRight,
  TrendingDown, CheckCircle2, ChevronRight, RefreshCw, BarChart2,
  DollarSign, Activity, Layers, Award
} from 'lucide-react';
import { formatCO2e, formatINR, calculateImpactEquivalents } from '../services/api';
import JargonTooltip from './JargonTooltip';

/**
 * TangibleImpactSuite — Making Carbon Reductions Tangible, Intuitive & Interactive
 * 
 * Features:
 * 1. Tangible Real-World Equivalents Card:
 *    - "96 tCO2e saved = taking 21 cars off the road for a year" or "= planting 1,600 trees"
 *    - Barrels of crude oil avoided, home energy months, Delhi-Mumbai flight offsets.
 * 2. Live "Before / After" Interactive Transition Simulator:
 *    - Drag slider from 0% (Virgin PET / Linear Baseline) to 100% (rPET Regrind / Closed Loop)
 *    - Real-time animated side-by-side comparison of Emissions Bar Chart & Cost Bar Chart
 *    - Visual live feedback showing immediate operational savings & emissions plummeting.
 */
export default function TangibleImpactSuite({
  simulatedSavingsKg = 0,
  simulatedOpexSavings = 0,
  totalEmissions = 0,
  defaultMaterial = 'Virgin PET → rPET Regrind'
}) {
  // Live Demo Slider: 0% = Pure Virgin PET, 100% = 100% rPET Regrind
  const [transitionRatio, setTransitionRatio] = useState(70); // default 70% substitution
  const [activeMaterialPreset, setActiveMaterialPreset] = useState('pet');

  // Pre-configured comparison models
  const PRESETS = {
    pet: {
      title: 'Virgin PET Polymer → rPET Regrind',
      subtitle: 'Plastic thermoforming & bottle preforms (50,000 kg/mo)',
      throughput_kg: 50000,
      virgin_name: 'Virgin PET Pellets',
      virgin_ef: 2.15, // kg CO2e / kg
      virgin_price_inr: 125, // ₹/kg
      recycled_name: '100% Food-Grade rPET',
      recycled_ef: 0.45, // kg CO2e / kg
      recycled_price_inr: 98, // ₹/kg
      savings_per_kg: 27,
      ef_reduction_pct: 79
    },
    hdpe: {
      title: 'Virgin HDPE → Recycled Flakes',
      subtitle: 'Blow moulding & containers (40,000 kg/mo)',
      throughput_kg: 40000,
      virgin_name: 'Virgin HDPE Granules',
      virgin_ef: 1.95,
      virgin_price_inr: 115,
      recycled_name: 'PCR HDPE Regrind Flakes',
      recycled_ef: 0.62,
      recycled_price_inr: 88,
      savings_per_kg: 27,
      ef_reduction_pct: 68
    },
    steel: {
      title: 'Primary Steel → Electric Arc Scrap Steel',
      subtitle: 'Industrial components & fabrication (25,000 kg/mo)',
      throughput_kg: 25000,
      virgin_name: 'Virgin Blast Furnace Steel',
      virgin_ef: 1.80,
      virgin_price_inr: 68,
      recycled_name: 'EAF Secondary Scrap Steel',
      recycled_ef: 0.43,
      recycled_price_inr: 52,
      savings_per_kg: 16,
      ef_reduction_pct: 76
    },
    aluminum: {
      title: 'Primary Ingot → Secondary Refined Aluminum',
      subtitle: 'Castings & extrusion profiles (10,000 kg/mo)',
      throughput_kg: 10000,
      virgin_name: 'Virgin Smelted Aluminum',
      virgin_ef: 11.50,
      virgin_price_inr: 220,
      recycled_name: 'Recycled Aluminum Billets',
      recycled_ef: 0.60,
      recycled_price_inr: 175,
      savings_per_kg: 45,
      ef_reduction_pct: 95
    }
  };

  const currentPreset = PRESETS[activeMaterialPreset] || PRESETS.pet;

  // Compute live values for the Demo Slider
  const subRatio = transitionRatio / 100;
  const throughput = currentPreset.throughput_kg;

  // Baseline 100% Virgin
  const baseEmissionsKg = throughput * currentPreset.virgin_ef;
  const baseCostInr = throughput * currentPreset.virgin_price_inr;

  // Dynamic Current (Blended based on slider)
  const currentVirginShare = 1 - subRatio;
  const currentRecycledShare = subRatio;

  const currentEmissionsKg = throughput * (
    (currentVirginShare * currentPreset.virgin_ef) + 
    (currentRecycledShare * currentPreset.recycled_ef)
  );

  const currentCostInr = throughput * (
    (currentVirginShare * currentPreset.virgin_price_inr) + 
    (currentRecycledShare * currentPreset.recycled_price_inr)
  );

  const deltaEmissionsKg = baseEmissionsKg - currentEmissionsKg;
  const deltaCostInr = baseCostInr - currentCostInr;
  const annualSavingsInr = deltaCostInr * 12;

  // Compute tangible real-world equivalents for both overall audit and demo slider
  const liveEquiv = calculateImpactEquivalents(deltaEmissionsKg);
  const auditEquiv = calculateImpactEquivalents(simulatedSavingsKg > 0 ? simulatedSavingsKg : deltaEmissionsKg);

  return (
    <div className="tangible-impact-container" style={{ marginBottom: '24px' }}>
      {/* ── 1. TANGIBLE REAL-WORLD EQUIVALENTS HERO BANNER ── */}
      <div className="dash-card elite-card tangible-equivalents-card">
        <div className="tangible-banner-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="tangible-icon-badge">
              <Trees size={20} />
            </div>
            <div>
              <span className="dash-card-label" style={{ color: 'var(--mint-hover)' }}>
                TANGIBLE CLIMATE IMPACT · REAL-WORLD EQUIVALENTS
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                What Your Carbon Savings Actually Mean
              </h3>
            </div>
          </div>
          <span className="tangible-source-tag">
            <Sparkles size={12} color="var(--mint-hover)" /> EPA GHG Equivalencies Verified
          </span>
        </div>

        {/* Primary Punchy Statement */}
        <div className="tangible-headline-box">
          <div className="tangible-headline-left">
            <span className="tangible-quote-mark">“</span>
            <div className="tangible-quote-text">
              <strong className="tangible-highlight">
                {auditEquiv.tonnes >= 1 ? `${auditEquiv.tonnes.toLocaleString()} tCO₂e saved` : `${Math.round(simulatedSavingsKg || deltaEmissionsKg).toLocaleString()} kg CO₂e saved`}
              </strong>
              <span className="tangible-equals"> = </span>
              <span>
                taking <strong>{auditEquiv.carsPerYear.toLocaleString()} passenger cars</strong> off the road for an entire year
              </span>
              <span className="tangible-or"> or </span>
              <span style={{ color: 'var(--emerald-deep)', fontWeight: 700 }}>
                planting {auditEquiv.treesPlanted.toLocaleString()} mature trees.
              </span>
            </div>
          </div>
        </div>

        {/* 4 Tangible Equivalent Tiles Grid */}
        <div className="tangible-tiles-grid">
          {/* Tile 1: Cars Off Road */}
          <div className="tangible-tile">
            <div className="tangible-tile-icon car-bg">
              <Car size={20} />
            </div>
            <div className="tangible-tile-content">
              <strong className="tangible-tile-number">{auditEquiv.carsPerYear.toLocaleString()}</strong>
              <span className="tangible-tile-label">Cars Removed</span>
              <small className="tangible-tile-sub">Annual passenger vehicle tailpipe emissions avoided</small>
            </div>
          </div>

          {/* Tile 2: Trees Planted */}
          <div className="tangible-tile">
            <div className="tangible-tile-icon tree-bg">
              <Trees size={20} />
            </div>
            <div className="tangible-tile-content">
              <strong className="tangible-tile-number" style={{ color: 'var(--emerald-deep)' }}>
                {auditEquiv.treesPlanted.toLocaleString()}
              </strong>
              <span className="tangible-tile-label">Trees Seeded</span>
              <small className="tangible-tile-sub">Urban tree seedlings grown for 10 full years</small>
            </div>
          </div>

          {/* Tile 3: Barrels of Crude Oil */}
          <div className="tangible-tile">
            <div className="tangible-tile-icon oil-bg">
              <Droplets size={20} />
            </div>
            <div className="tangible-tile-content">
              <strong className="tangible-tile-number" style={{ color: '#d97706' }}>
                {auditEquiv.barrelsOil.toLocaleString()}
              </strong>
              <span className="tangible-tile-label">Barrels of Oil Avoided</span>
              <small className="tangible-tile-sub">Virgin crude petroleum kept unextracted</small>
            </div>
          </div>

          {/* Tile 4: Home Electricity Burn */}
          <div className="tangible-tile">
            <div className="tangible-tile-icon power-bg">
              <Zap size={20} />
            </div>
            <div className="tangible-tile-content">
              <strong className="tangible-tile-number" style={{ color: '#0284c7' }}>
                {auditEquiv.homesElectricityMonths.toLocaleString()}
              </strong>
              <span className="tangible-tile-label">Home Months Powered</span>
              <small className="tangible-tile-sub">Average residential electricity bills offset</small>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. LIVE BEFORE / AFTER INTERACTIVE SLIDER & ANIMATED DUAL BAR CHARTS ── */}
      <div className="dash-card elite-card live-demo-card">
        <div className="live-demo-header">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge-pill-cyan">
                <Sliders size={11} /> LIVE DEMO BENCH
              </span>
              <span className="live-pulse-badge">
                <span className="live-dot-ping" /> Real-Time Dynamics
              </span>
            </div>
            <h3 style={{ margin: '6px 0 2px', fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Live "Before / After" Circular Transition Simulator
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Drag the slider from <strong>Linear Baseline (Virgin)</strong> to <strong>Closed-Loop (Recycled)</strong> and watch both emissions and monthly raw material spend plummet in real time.
            </p>
          </div>

          {/* Material Preset Selector */}
          <div className="demo-preset-pills">
            {Object.entries(PRESETS).map(([key, p]) => (
              <button
                key={key}
                type="button"
                className={`demo-preset-btn ${activeMaterialPreset === key ? 'preset-active' : ''}`}
                onClick={() => setActiveMaterialPreset(key)}
              >
                {key === 'pet' && 'PET → rPET'}
                {key === 'hdpe' && 'HDPE → PCR'}
                {key === 'steel' && 'Steel → EAF'}
                {key === 'aluminum' && 'Alum → Recycled'}
              </button>
            ))}
          </div>
        </div>

        {/* The Interactive Scrub Slider */}
        <div className="live-scrub-panel">
          <div className="scrub-status-bar">
            <div className="scrub-status-left">
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {currentPreset.title}
              </span>
              <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '11px' }}>
                Monthly Volume: {throughput.toLocaleString()} kg · Linear Baseline vs. Circular Blend
              </small>
            </div>
            <div className="scrub-ratio-badge">
              <span>Substitution Ratio: </span>
              <strong style={{ color: 'var(--mint-hover)', fontSize: '15px' }}>{transitionRatio}% Circular</strong>
            </div>
          </div>

          <div className="scrub-range-wrapper">
            <div className="scrub-track-markers">
              <span className="marker-label left">0% Virgin Baseline</span>
              <span className="marker-label mid">50% Blend</span>
              <span className="marker-label right">100% Closed Loop</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={transitionRatio}
              onChange={(e) => setTransitionRatio(Number(e.target.value))}
              className="live-interactive-slider"
              aria-label="Virgin to Recycled substitution ratio"
            />
          </div>

          {/* Dynamic Comparison Telemetry Cards */}
          <div className="live-delta-row">
            <div className="delta-stat-pill">
              <small>Emissions Avoided</small>
              <strong style={{ color: '#ef4444' }}>
                −{formatCO2e(deltaEmissionsKg)} /mo
              </strong>
              <span>({Math.round((deltaEmissionsKg / baseEmissionsKg) * 100)}% cut)</span>
            </div>
            <div className="delta-stat-pill">
              <small>Monthly Material Spend Saved</small>
              <strong style={{ color: 'var(--mint-hover)' }}>
                +{formatINR(deltaCostInr, true)} /mo
              </strong>
              <span>({formatINR(annualSavingsInr, true)} /year)</span>
            </div>
            <div className="delta-stat-pill">
              <small>Equivalent Cars Offset</small>
              <strong style={{ color: '#0284c7' }}>
                {liveEquiv.carsPerYear} Cars/yr
              </strong>
              <span>({liveEquiv.treesPlanted.toLocaleString()} trees)</span>
            </div>
          </div>
        </div>

        {/* ── Side-By-Side Animated Dual Bar Charts (Emissions vs Cost) ── */}
        <div className="live-charts-grid">
          {/* Chart 1: Carbon Emissions Bar Chart (Before vs After) */}
          <div className="live-chart-card">
            <div className="live-chart-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="chart-bullet" style={{ background: '#ef4444' }} />
                <strong>Monthly Carbon Footprint</strong>
              </div>
              <span className="chart-unit-tag">kg CO₂e / month</span>
            </div>

            <div className="chart-bars-wrap">
              {/* Baseline Bar */}
              <div className="chart-bar-col">
                <span className="chart-bar-value" style={{ color: '#64748b' }}>
                  {formatCO2e(baseEmissionsKg)}
                </span>
                <div className="chart-bar-tube">
                  <div className="chart-bar-fill base-fill" style={{ height: '100%' }}>
                    <span className="bar-inner-label">100%</span>
                  </div>
                </div>
                <span className="chart-col-label">
                  <strong>Before</strong>
                  <small>Virgin Linear</small>
                </span>
              </div>

              {/* Current Simulated Bar (Animated in Real Time) */}
              <div className="chart-bar-col">
                <span className="chart-bar-value" style={{ color: '#059669', fontWeight: 800 }}>
                  {formatCO2e(currentEmissionsKg)}
                </span>
                <div className="chart-bar-tube">
                  <div
                    className="chart-bar-fill active-emissions-fill"
                    style={{
                      height: `${Math.max(12, Math.round((currentEmissionsKg / baseEmissionsKg) * 100))}%`,
                      transition: 'height 0.15s ease-out'
                    }}
                  >
                    <span className="bar-inner-label">
                      {Math.round((currentEmissionsKg / baseEmissionsKg) * 100)}%
                    </span>
                  </div>
                </div>
                <span className="chart-col-label">
                  <strong style={{ color: 'var(--mint-hover)' }}>After</strong>
                  <small>{transitionRatio}% Recycled</small>
                </span>
              </div>
            </div>

            <div className="chart-footer-note">
              <TrendingDown size={14} color="#059669" />
              <span>
                Slashing emissions by <strong>{Math.round((deltaEmissionsKg / baseEmissionsKg) * 100)}%</strong> ({formatCO2e(deltaEmissionsKg)} avoided)
              </span>
            </div>
          </div>

          {/* Chart 2: Monthly Procurement Cost Bar Chart (Before vs After) */}
          <div className="live-chart-card">
            <div className="live-chart-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="chart-bullet" style={{ background: 'var(--mint-hover)' }} />
                <strong>Monthly Material Spend</strong>
              </div>
              <span className="chart-unit-tag">INR (₹) / month</span>
            </div>

            <div className="chart-bars-wrap">
              {/* Baseline Bar */}
              <div className="chart-bar-col">
                <span className="chart-bar-value" style={{ color: '#64748b' }}>
                  {formatINR(baseCostInr, true)}
                </span>
                <div className="chart-bar-tube">
                  <div className="chart-bar-fill base-cost-fill" style={{ height: '100%' }}>
                    <span className="bar-inner-label">Baseline</span>
                  </div>
                </div>
                <span className="chart-col-label">
                  <strong>Before</strong>
                  <small>₹{currentPreset.virgin_price_inr}/kg</small>
                </span>
              </div>

              {/* Current Simulated Bar (Animated in Real Time) */}
              <div className="chart-bar-col">
                <span className="chart-bar-value" style={{ color: 'var(--emerald-deep)', fontWeight: 800 }}>
                  {formatINR(currentCostInr, true)}
                </span>
                <div className="chart-bar-tube">
                  <div
                    className="chart-bar-fill active-cost-fill"
                    style={{
                      height: `${Math.max(12, Math.round((currentCostInr / baseCostInr) * 100))}%`,
                      transition: 'height 0.15s ease-out'
                    }}
                  >
                    <span className="bar-inner-label">
                      {Math.round((currentCostInr / baseCostInr) * 100)}%
                    </span>
                  </div>
                </div>
                <span className="chart-col-label">
                  <strong style={{ color: 'var(--emerald-deep)' }}>After</strong>
                  <small>₹{Math.round(currentCostInr / throughput)}/kg blend</small>
                </span>
              </div>
            </div>

            <div className="chart-footer-note" style={{ color: 'var(--emerald-deep)' }}>
              <CheckCircle2 size={14} color="var(--emerald-deep)" />
              <span>
                Saving <strong>{formatINR(deltaCostInr, true)}</strong> every month (<strong>{formatINR(annualSavingsInr, true)}/yr</strong> recurring)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

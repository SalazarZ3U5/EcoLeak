import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Zap, RefreshCw, Flame, TrendingUp } from 'lucide-react';
import { useTilt } from '../hooks/useTilt';

export default function Hero({ onOpenAssessment }) {
  const [closedLoopPercent, setClosedLoopPercent] = useState(85);
  const tilt = useTilt(10);

  const isClosed = closedLoopPercent >= 50;
  const savings = ((closedLoopPercent / 100) * 14.8).toFixed(1);
  const co2Cut = Math.round((closedLoopPercent / 100) * 42);

  return (
    <section className="hero-wrapper" id="top">
      <div className="container">
        <div className="hero-editorial-grid">
          {/* Headline & Pitch */}
          <div className="hero-text-col">
            <div className="section-tag">
              <span></span>
              CIRCULAR CARBON ECOSYSTEM
            </div>

            <h1>
              Find emissions.<br />
              <span className="gradient-text">Close the loop.</span><br />
              Keep the capital.
            </h1>

            <p className="hero-subtitle">
              Most factories lose 20% to 35% of their energy as unrecovered waste heat and process friction. CarbonLoop pinpoints your hidden leak points and discovers circular interventions that pay for themselves.
            </p>

            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={onOpenAssessment}>
                Calculate Facility Savings <ArrowRight size={18} />
              </button>
              <a href="#how" className="btn btn-secondary btn-lg">
                Explore the Concept
              </a>
            </div>

            <div className="hero-guarantee-line">
              <span><CheckCircle2 size={16} color="var(--mint)" />Zero hardware needed</span>
              <span><CheckCircle2 size={16} color="var(--mint)" />From utility bills</span>
              <span><CheckCircle2 size={16} color="var(--mint)" />Audit in 3 minutes</span>
            </div>
          </div>

          {/* 3D Tilting Workbench */}
          <div
            className="stream-workbench tilt-card"
            ref={tilt.ref}
            onMouseMove={tilt.onMouseMove}
            onMouseLeave={tilt.onMouseLeave}
          >
            <div className="stream-workbench-header">
              <div>
                <span className="stream-title">INTERACTIVE LOOP BALANCER</span>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Scrub to simulate closing your plant's waste streams:
                </div>
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight: 800,
                color: isClosed ? 'var(--mint-hover)' : 'var(--rose)',
                background: isClosed ? 'var(--mint-light)' : 'var(--rose-light)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                transition: 'all 0.25s ease'
              }}>
                {closedLoopPercent}% Loop Closed
              </span>
            </div>

            {/* Tactile Slider */}
            <div className="interactive-slider-track-wrap">
              <div className="slider-top-labels">
                <span style={{ color: 'var(--rose)', fontWeight: 700 }}>0% Linear Bleed</span>
                <span style={{ color: 'var(--mint-hover)', fontWeight: 700 }}>100% Fully Circular</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={closedLoopPercent}
                onChange={(e) => setClosedLoopPercent(Number(e.target.value))}
                className="scrub-range-slider"
              />
            </div>

            {/* Stream Flow Visual */}
            <div className="stream-flow-visual">
              <div className="stream-flow-station">
                <div className="station-icon-wrap mint">
                  <Zap size={20} color="var(--mint-hover)" />
                </div>
                <span className="station-label">Intake Node</span>
                <b className="station-name">Grid &amp; Fuel</b>
              </div>

              <div className="stream-connector-track">
                <div
                  className="stream-fluid-pulse"
                  style={{ background: isClosed ? 'var(--mint)' : 'var(--rose)' }}
                />
              </div>

              <div className="stream-flow-station">
                <div className={`station-icon-wrap ${isClosed ? 'mint' : 'rose'}`}>
                  {isClosed ? (
                    <RefreshCw size={20} color="var(--mint-hover)" className="spin-on-active" />
                  ) : (
                    <Flame size={20} color="var(--rose)" />
                  )}
                </div>
                <span className="station-label">{isClosed ? 'Recaptured' : 'Escaping'}</span>
                <b className="station-name" style={{ color: isClosed ? 'var(--mint-hover)' : 'var(--rose)' }}>
                  {isClosed ? 'Waste Heat Economizer' : 'Flue Exhaust Bleed'}
                </b>
              </div>

              <div className="stream-connector-track">
                <div
                  className="stream-fluid-pulse"
                  style={{ background: isClosed ? 'var(--mint)' : 'var(--rose)' }}
                />
              </div>

              <div className="stream-flow-station">
                <div className="station-icon-wrap emerald">
                  <TrendingUp size={20} color="var(--emerald-deep)" />
                </div>
                <span className="station-label">Balance Sheet</span>
                <b className="station-name" style={{ color: isClosed ? 'var(--emerald-deep)' : 'var(--text-muted)' }}>
                  {isClosed ? 'Recaptured Capital' : 'Wasted Cash'}
                </b>
              </div>
            </div>

            {/* Borderless Metrics Strip */}
            <div className="stream-metrics-strip">
              <div className="stream-metric-cell">
                <small>Carbon Abatement</small>
                <strong style={{ color: isClosed ? 'var(--mint-hover)' : 'var(--rose)' }}>
                  {isClosed ? `−${co2Cut}% CO₂` : '+482 tCO₂/yr'}
                </strong>
              </div>
              <div className="stream-metric-cell">
                <small>Annual Bottom Line</small>
                <strong style={{ color: isClosed ? 'var(--emerald-deep)' : 'var(--text-muted)' }}>
                  {isClosed ? `+₹${savings} Lakh` : '₹0 Saved'}
                </strong>
              </div>
              <div className="stream-metric-cell">
                <small>Circularity Score</small>
                <strong style={{ color: isClosed ? 'var(--mint-hover)' : 'var(--amber)' }}>
                  {closedLoopPercent}%
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

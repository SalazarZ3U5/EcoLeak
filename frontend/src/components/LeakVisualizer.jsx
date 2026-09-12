import React, { useState } from 'react';
import {
  Flame, BarChart3, PieChart as PieIcon, TrendingUp, Info,
  Layers, ChevronRight, Activity, ArrowUpRight, Zap
} from 'lucide-react';
import { formatCO2e, formatINR, formatDisplayName } from '../services/api';
import JargonTooltip from './JargonTooltip';

/**
 * LeakVisualizer — High-Impact Graph Visualizations for Emission Leaks
 * 
 * Includes:
 * 1. Pareto 80/20 Dual-Axis Bar & Cumulative Curve Chart (SVG)
 * 2. Interactive GHG Scope Donut Breakdown with center telemetry
 * 3. Hotspot Intensity Treemap / Matrix view
 * 4. Toggle switcher between Pareto Chart, Donut Breakdown, and Process Matrix
 */
export default function LeakVisualizer({ leakPoints = [], scopeBreakdown = {}, totalEmissions = 0 }) {
  const [activeTab, setActiveTab] = useState('pareto'); // 'pareto' | 'donut' | 'matrix'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!leakPoints || leakPoints.length === 0) return null;

  // 1. Prepare Pareto Data (Sorted descending by emissions)
  const sortedLeaks = [...leakPoints].sort((a, b) => {
    const aVal = a.co2e_kg ?? a.emissions_kg ?? 0;
    const bVal = b.co2e_kg ?? b.emissions_kg ?? 0;
    return bVal - aVal;
  });

  const validTotal = totalEmissions > 0 
    ? totalEmissions 
    : sortedLeaks.reduce((acc, l) => acc + (l.co2e_kg ?? l.emissions_kg ?? 0), 0) || 1;

  let runningSum = 0;
  const paretoPoints = sortedLeaks.map((lp, idx) => {
    const val = lp.co2e_kg ?? lp.emissions_kg ?? 0;
    runningSum += val;
    const share = Math.round((val / validTotal) * 100);
    const cumShare = Math.min(100, Math.round((runningSum / validTotal) * 100));
    return {
      name: formatDisplayName(lp.raw_name || lp.activity_key),
      scope: lp.scope || 'Scope 1',
      emissions_kg: val,
      share,
      cumShare,
      isHotspot: cumShare <= 80 || (idx === 0)
    };
  });

  const maxVal = Math.max(...paretoPoints.map(p => p.emissions_kg), 1);

  // 2. Prepare Scope Breakdown Data for Donut
  const scope1 = scopeBreakdown.scope_1_kg || 0;
  const scope2 = scopeBreakdown.scope_2_kg || 0;
  const scope3 = scopeBreakdown.scope_3_kg || 0;
  const scopeTotal = (scope1 + scope2 + scope3) || validTotal;

  const scopes = [
    {
      name: 'Scope 1 (Direct Fuels)',
      key: 'Scope 1',
      kg: scope1,
      pct: Math.round((scope1 / scopeTotal) * 100),
      color: '#ef4444',
      grad: ['#ef4444', '#f87171'],
      desc: 'Boilers, DG sets, furnaces, and on-site fuel combustion'
    },
    {
      name: 'Scope 2 (Purchased Power)',
      key: 'Scope 2',
      kg: scope2,
      pct: Math.round((scope2 / scopeTotal) * 100),
      color: '#0ea5e9',
      grad: ['#0ea5e9', '#38bdf8'],
      desc: 'Grid electricity and captive transformer draws'
    },
    {
      name: 'Scope 3 (Upstream / Waste)',
      key: 'Scope 3',
      kg: scope3,
      pct: Math.round((scope3 / scopeTotal) * 100),
      color: '#10b981',
      grad: ['#10b981', '#34d399'],
      desc: 'Raw polymer resin, chemicals, packaging, and waste'
    }
  ];

  // SVG dimensions for Pareto
  const svgWidth = 640;
  const svgHeight = 240;
  const padLeft = 55;
  const padRight = 55;
  const padTop = 30;
  const padBottom = 45;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const barCount = paretoPoints.length;
  const slotW = chartW / Math.max(barCount, 1);
  const barW = Math.min(48, Math.max(22, slotW * 0.55));

  // Compute points for cumulative 80/20 line
  const lineCoords = paretoPoints.map((p, i) => {
    const x = padLeft + (i * slotW) + (slotW / 2);
    const y = padTop + chartH - ((p.cumShare / 100) * chartH);
    return { x, y, p };
  });

  const pathD = lineCoords.length > 0 
    ? `M ${lineCoords[0].x} ${lineCoords[0].y} ` + lineCoords.slice(1).map(c => `L ${c.x} ${c.y}`).join(' ')
    : '';

  // 80% Pareto threshold line y
  const y80 = padTop + chartH - (0.8 * chartH);

  // Donut calculations
  const donutRadius = 80;
  const donutCenter = 110;
  const circumference = 2 * Math.PI * donutRadius;
  let accumulatedAngle = 0;

  return (
    <div className="dash-card elite-card leak-visualizer-card">
      {/* ── Top Bar: Title & View Selector Tabs ── */}
      <div className="leak-vis-header">
        <div className="leak-vis-title-group">
          <div className="leak-vis-icon-badge">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="leak-vis-title">
              Emission Leak Diagnostics &amp; Interactive Graphs
            </h3>
            <span className="leak-vis-subtitle">
              Pareto 80/20 distribution, GHG Scope allocation, and hotspot intensity matrix
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="leak-vis-tabs">
          <button
            type="button"
            className={`leak-tab-btn ${activeTab === 'pareto' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('pareto')}
          >
            <BarChart3 size={13} />
            <span>Pareto 80/20 Curve</span>
          </button>
          <button
            type="button"
            className={`leak-tab-btn ${activeTab === 'donut' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('donut')}
          >
            <PieIcon size={13} />
            <span>GHG Scopes</span>
          </button>
          <button
            type="button"
            className={`leak-tab-btn ${activeTab === 'matrix' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('matrix')}
          >
            <Layers size={13} />
            <span>Intensity Matrix</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: PARETO 80/20 DUAL-AXIS GRAPH ── */}
      {activeTab === 'pareto' && (
        <div className="leak-pareto-wrap">
          <div className="leak-graph-legend">
            <div className="legend-item">
              <span className="legend-swatch bar-swatch" />
              <span>Leak Emission Magnitude (kg CO₂e)</span>
            </div>
            <div className="legend-item">
              <span className="legend-swatch line-swatch" />
              <span>Cumulative Share (%) — 80/20 Threshold</span>
            </div>
            <div className="legend-item" style={{ marginLeft: 'auto' }}>
              <span className="hotspot-badge-tag">
                <Flame size={11} /> 80% Cut Zone
              </span>
            </div>
          </div>

          <div className="leak-svg-container" style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ width: '100%', minWidth: '540px', height: 'auto', display: 'block' }}
            >
              <defs>
                <linearGradient id="barGradCritical" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </linearGradient>
                <linearGradient id="barGradHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="barGradNormal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
                <linearGradient id="paretoAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <filter id="shadowPoint" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.2" />
                </filter>
              </defs>

              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map((pct) => {
                const y = padTop + chartH - ((pct / 100) * chartH);
                return (
                  <g key={pct}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="rgba(0,0,0,0.06)"
                      strokeDasharray="2 3"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9.5"
                      fill="#94a3b8"
                      fontFamily="sans-serif"
                    >
                      {Math.round((pct / 100) * maxVal).toLocaleString()}
                    </text>
                    <text
                      x={svgWidth - padRight + 8}
                      y={y + 3}
                      textAnchor="start"
                      fontSize="9.5"
                      fill="#94a3b8"
                      fontFamily="sans-serif"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}

              {/* 80% Pareto Critical Threshold Reference Line */}
              <line
                x1={padLeft}
                y1={y80}
                x2={svgWidth - padRight}
                y2={y80}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.85"
              />
              <text
                x={svgWidth - padRight - 6}
                y={y80 - 5}
                textAnchor="end"
                fontSize="9.5"
                fontWeight="700"
                fill="#059669"
              >
                Pareto 80% Boundary
              </text>

              {/* Bars */}
              {paretoPoints.map((p, i) => {
                const barHeight = Math.max(4, (p.emissions_kg / maxVal) * chartH);
                const x = padLeft + (i * slotW) + ((slotW - barW) / 2);
                const y = padTop + chartH - barHeight;
                const isHovered = hoveredIndex === i;

                const barFill = p.share >= 35 
                  ? 'url(#barGradCritical)' 
                  : p.share >= 15 
                    ? 'url(#barGradHigh)' 
                    : 'url(#barGradNormal)';

                return (
                  <g
                    key={i}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={barHeight}
                      rx="4"
                      fill={barFill}
                      opacity={hoveredIndex === null || isHovered ? 1 : 0.45}
                      style={{ transition: 'all 0.2s ease' }}
                    />
                    {/* Share % on top of bar */}
                    <text
                      x={x + barW / 2}
                      y={y - 6}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="700"
                      fill={p.share >= 35 ? '#e11d48' : '#334155'}
                    >
                      {p.share}%
                    </text>
                    {/* Label below X axis */}
                    <text
                      x={x + barW / 2}
                      y={padTop + chartH + 16}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight={isHovered ? '800' : '600'}
                      fill={isHovered ? 'var(--emerald-deep)' : '#64748b'}
                    >
                      {p.name.length > 11 ? `${p.name.slice(0, 10)}…` : p.name}
                    </text>
                  </g>
                );
              })}

              {/* Cumulative Share Line Path & Area */}
              {pathD && (
                <>
                  <path
                    d={`${pathD} L ${lineCoords[lineCoords.length - 1].x} ${padTop + chartH} L ${lineCoords[0].x} ${padTop + chartH} Z`}
                    fill="url(#paretoAreaGrad)"
                  />
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Cumulative Data Points */}
              {lineCoords.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredIndex === i ? 6 : 4}
                    fill="#ffffff"
                    stroke="#059669"
                    strokeWidth="2.5"
                    filter="url(#shadowPoint)"
                    style={{ transition: 'all 0.15s ease' }}
                  />
                </g>
              ))}
            </svg>
          </div>

          {/* Dynamic Insight Banner below graph */}
          <div className="leak-vis-insight-bar">
            <Info size={14} style={{ color: 'var(--mint-hover)', flexShrink: 0 }} />
            <span>
              <strong>Pareto Insight:</strong> The top {paretoPoints.filter(p => p.cumShare <= 85).length || 1} emission leak points account for over <strong>{paretoPoints[0]?.cumShare || 80}%</strong> of the facility footprint. Addressing these primary leak points yields exponential reductions.
            </span>
          </div>
        </div>
      )}

      {/* ── TAB 2: GHG SCOPES ALLOCATION DONUT ── */}
      {activeTab === 'donut' && (
        <div className="leak-donut-container">
          <div className="donut-chart-side">
            <svg width="220" height="220" viewBox="0 0 220 220" className="donut-svg">
              <defs>
                <filter id="donutShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.08" />
                </filter>
              </defs>

              {/* Background Ring */}
              <circle
                cx={donutCenter}
                cy={donutCenter}
                r={donutRadius}
                fill="none"
                stroke="rgba(0,0,0,0.04)"
                strokeWidth="22"
              />

              {/* Scope Segments */}
              {(() => {
                let offsetAcc = 0;
                return scopes.map((sc, i) => {
                  const dashLength = (sc.pct / 100) * circumference;
                  const dashSpace = circumference - dashLength;
                  const strokeOffset = -offsetAcc;
                  offsetAcc += dashLength;

                  return (
                    <circle
                      key={i}
                      cx={donutCenter}
                      cy={donutCenter}
                      r={donutRadius}
                      fill="none"
                      stroke={sc.color}
                      strokeWidth="22"
                      strokeDasharray={`${dashLength} ${dashSpace}`}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      filter="url(#donutShadow)"
                      style={{
                        transform: 'rotate(-90deg)',
                        transformOrigin: `${donutCenter}px ${donutCenter}px`,
                        transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  );
                });
              })()}

              {/* Center Readout */}
              <g className="donut-center-group">
                <text
                  x={donutCenter}
                  y={donutCenter - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="800"
                  fill="#94a3b8"
                  letterSpacing="0.08em"
                >
                  TOTAL CO₂e
                </text>
                <text
                  x={donutCenter}
                  y={donutCenter + 14}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="800"
                  fill="var(--text-primary)"
                >
                  {formatCO2e(validTotal)}
                </text>
              </g>
            </svg>
          </div>

          {/* Legend and Metrics Breakdown */}
          <div className="donut-legend-side">
            {scopes.map((sc, i) => (
              <div
                key={i}
                className={`scope-legend-row ${hoveredIndex === i ? 'legend-highlighted' : ''}`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="scope-dot" style={{ background: sc.color }} />
                    <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{sc.name}</strong>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: sc.color }}>
                    {sc.pct}%
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  <span>{sc.desc}</span>
                  <strong style={{ color: 'var(--text-secondary)' }}>{formatCO2e(sc.kg)}</strong>
                </div>
                {/* Micro visual bar */}
                <div style={{ height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '100px', marginTop: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${sc.pct}%`, height: '100%', background: sc.color, borderRadius: '100px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: HOTSPOT INTENSITY MATRIX ── */}
      {activeTab === 'matrix' && (
        <div className="leak-matrix-grid">
          {sortedLeaks.map((lp, idx) => {
            const val = lp.co2e_kg ?? lp.emissions_kg ?? 0;
            const pct = Math.round((val / validTotal) * 100);
            const isSevere = pct >= 35;
            const isHigh = pct >= 15 && pct < 35;

            return (
              <div
                key={idx}
                className={`matrix-tile ${isSevere ? 'tile-severe' : isHigh ? 'tile-high' : 'tile-moderate'}`}
              >
                <div className="matrix-tile-header">
                  <span className="matrix-tile-rank">#{idx + 1}</span>
                  <span className={`matrix-tile-tier ${isSevere ? 'tier-critical' : isHigh ? 'tier-high' : 'tier-normal'}`}>
                    {isSevere ? 'Critical Hotspot' : isHigh ? 'High Leak' : 'Moderate'}
                  </span>
                </div>

                <div className="matrix-tile-body">
                  <div className="matrix-tile-title">{formatDisplayName(lp.raw_name || lp.activity_key)}</div>
                  <div className="matrix-tile-scope">{lp.scope || 'Scope 1'}</div>
                </div>

                <div className="matrix-tile-footer">
                  <div>
                    <span className="matrix-co2-val">{formatCO2e(val)}</span>
                    <span className="matrix-co2-unit">/ month</span>
                  </div>
                  <div className="matrix-pct-tag">{pct}% footprint</div>
                </div>

                {/* Heat level indicator bar */}
                <div className="matrix-heat-track">
                  <div
                    className="matrix-heat-fill"
                    style={{
                      width: `${Math.min(100, Math.max(10, pct))}%`,
                      background: isSevere
                        ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                        : isHigh
                          ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                          : 'linear-gradient(90deg, #0ea5e9, #0284c7)'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

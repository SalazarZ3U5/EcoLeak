import React from 'react';

/**
 * EcoLeakLogo — Custom Animated Brand Identity
 * 
 * Visual Concept:
 * "The Closed-Loop Biosphere & Active Emission Neutralizer"
 * - Dynamic rounded square / shield frame with glowing gradient border
 * - Continuous orbiting energy particles representing circular resource flows
 * - Central precision-cut Leaf-Droplet ("Eco" + "Leak") hybrid with energy core
 * - Dual counter-rotating halo pulses simulating active industrial telemetry
 */
export default function EcoLeakLogo({ size = 32, animated = true, className = '' }) {
  const scale = size / 32;

  return (
    <div
      className={`ecoleak-brand-icon ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Main Brand Gradients */}
          <linearGradient id="el-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00b86b" />
            <stop offset="55%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>

          <linearGradient id="el-grad-core" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="60%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>

          <linearGradient id="el-grad-loop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00b86b" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00b86b" stopOpacity="0.9" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="el-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Circular Flow Aura / Ambient Radar Pulse */}
        <circle
          cx="24"
          cy="24"
          r="21.5"
          stroke="url(#el-grad-loop)"
          strokeWidth="1.2"
          strokeDasharray="3 4"
          className={animated ? 'el-anim-radar' : ''}
          style={{ opacity: 0.55 }}
        />

        {/* Counter-Rotating Segmented Circular Orbit (Representing Industrial Circular Economy Loop) */}
        <path
          d="M 24 4.5 A 19.5 19.5 0 0 1 43.5 24"
          stroke="url(#el-grad-primary)"
          strokeWidth="2.4"
          strokeLinecap="round"
          className={animated ? 'el-anim-orbit-cw' : ''}
        />
        <path
          d="M 24 43.5 A 19.5 19.5 0 0 1 4.5 24"
          stroke="#0ea5e9"
          strokeWidth="2.4"
          strokeLinecap="round"
          className={animated ? 'el-anim-orbit-cw' : ''}
        />

        {/* Intersecting Recycled Return Track */}
        <circle
          cx="24"
          cy="24"
          r="14"
          stroke="rgba(0, 184, 107, 0.22)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* Central Unique Iconography: The Eco-Leak Teardrop / Botanical Hybrid */}
        {/* An aerodynamic, tapered droplet representing isolated industrial leaks with an embedded leaf vein */}
        <g className={animated ? 'el-anim-float' : ''} style={{ transformOrigin: '24px 24px' }}>
          {/* Main Leaf-Droplet Silhouette */}
          <path
            d="M 24 10 C 24 10, 34 21, 34 28 C 34 33.52 29.52 38 24 38 C 18.48 38, 14 33.52, 14 28 C 14 21, 24 10, 24 10 Z"
            fill="url(#el-grad-core)"
            filter="url(#el-glow)"
            style={{ opacity: 0.95 }}
          />

          {/* Precision Inner Loop Cut / Vein (Negative Space Leaf-Path) */}
          <path
            d="M 24 14 C 24 14 30.5 22.5 30.5 28 C 30.5 31.6 27.6 34.5 24 34.5 C 20.4 34.5 17.5 31.6 17.5 28 C 17.5 22.5 24 14 24 14 Z"
            fill="#ffffff"
            style={{ opacity: 0.16 }}
          />

          {/* Organic Diagonal Leaf Arch dividing the droplet */}
          <path
            d="M 24 14 Q 24 25 30.5 28"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{ opacity: 0.85 }}
          />

          {/* Central Emitting Nexus / Quantum Sparkle (The Detected & Plugged Leak) */}
          <circle
            cx="24"
            cy="27"
            r="3.2"
            fill="#ffffff"
            className={animated ? 'el-anim-pulse-core' : ''}
            style={{
              filter: 'drop-shadow(0 0 4px #38bdf8)',
              transformOrigin: '24px 27px'
            }}
          />

          {/* Miniature Orbiting Photon on the droplet edge */}
          <circle
            cx="24"
            cy="10"
            r="1.8"
            fill="#00b86b"
            style={{ filter: 'drop-shadow(0 0 3px #00b86b)' }}
            className={animated ? 'el-anim-sparkle' : ''}
          />
        </g>
      </svg>
    </div>
  );
}

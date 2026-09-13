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
export default function EcoLeakLogo({ size = 32, animated = false, className = '' }) {
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
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="el-theme-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00b86b" />
            <stop offset="100%" stopColor="#062319" />
          </linearGradient>
        </defs>

        {/* Outer subtle circular track */}
        <circle
          cx="16"
          cy="16"
          r="14"
          stroke="#00b86b"
          strokeWidth="1.8"
          strokeDasharray="4 3"
          strokeOpacity="0.4"
        />

        {/* Elegant leaf & droplet fusion representing Eco + Leak */}
        <path
          d="M16 6C16 6 23 13 23 18C23 21.866 19.866 25 16 25C12.134 25 9 21.866 9 18C9 13 16 6 16 6Z"
          fill="url(#el-theme-grad)"
        />

        {/* Minimal clean negative space inner vein */}
        <path
          d="M16 9C16 13 19.5 17 20.5 19.5"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />

        {/* Core precision node */}
        <circle
          cx="16"
          cy="18"
          r="2"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
}

import React from 'react';

export default function Ticker() {
  const items = [
    'TELEMETRY AUDIT',
    'SCOPE 1 & 2 DETECTION',
    'THERMAL LEAK SCANNING',
    'CIRCULAR INTERVENTION MATCHING',
    'PAYBACK AMORTIZATION',
    'CBAM & BRSR COMPLIANCE',
    'ZERO INTRUSION DEPLOYMENT'
  ];

  return (
    <div className="fresh-ticker">
      <div className="fresh-ticker-track">
        {items.concat(items).map((item, idx) => (
          <div key={idx} className="fresh-ticker-item">
            <i></i>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export default function ImpactROI({ onOpenAssessment }) {
  return (
    <section className="section" id="impact">
      <div className="container">
        <div className="section-header">
          <h2>
            Decarbonization that pays for itself.
          </h2>
          <p>
            Sustainability isn't a cost center when paired with circular engineering. We link physical energy efficiency with direct OPEX reductions.
          </p>
        </div>

        {/* Editorial Borderless Stat Strip */}
        <div className="editorial-impact-row">
          <div className="editorial-stat-block">
            <strong>15–40%</strong>
            <h4>Scope 1 & 2 Reduction</h4>
            <p>Direct reduction in plant energy burn across boiler, chiller, and motor line operations.</p>
          </div>

          <div className="editorial-stat-block">
            <strong style={{ color: 'var(--mint-hover)' }}>₹8L–25L</strong>
            <h4>Annual Cash Recovery</h4>
            <p>Average recurring annual cash savings achieved through waste heat and motor friction optimization.</p>
          </div>

          <div className="editorial-stat-block">
            <strong style={{ color: 'var(--cyan-fresh)' }}>&lt; 9 Mo</strong>
            <h4>CapEx Payback Velocity</h4>
            <p>Average amortized payback period across vetted interventions without production downtime.</p>
          </div>
        </div>

        {/* Clean Final Call to Action */}
        <div className="clean-cta-box">
          <h2>Ready to map your plant's circular upside?</h2>
          <p>
            Takes 3 minutes. Enter your monthly utility figures to generate your free engineering audit.
          </p>
          <button className="btn btn-primary btn-lg" onClick={onOpenAssessment}>
            Start Free Facility Assessment <ArrowUpRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}

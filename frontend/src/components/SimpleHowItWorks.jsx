import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { CuteEcoBotIcon } from './EcoBotChat';

const steps = [
  {
    num: '01',
    title: 'Input Plant Process Data',
    desc: "Enter energy sources, raw materials, and waste streams, or drop last month's utility invoices. Zero sensor hardware needed.",
    tag: 'Takes 2 minutes',
    accent: 'var(--mint)',
  },
  {
    num: '02',
    title: 'Pinpoint Emission Leak Points',
    desc: 'Our Pareto hotspot engine isolates exactly where carbon and energy escape — virgin feedstock, flue gas, and line friction.',
    tag: 'Instant hotspot mapping',
    accent: 'var(--cyan-fresh)',
  },
  {
    num: '03',
    title: 'Adopt Circular Interventions',
    desc: 'Receive pre-engineered circular recommendations (recycled loops, alternative feedstocks, heat recovery) with estimated cost and CO₂ savings.',
    tag: '< 8 mo payback',
    accent: 'var(--mint-hover)',
  },
];

function StepCard({ s, idx }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`pipeline-step-card${hovered ? ' hovered' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ '--step-accent': s.accent }}
    >
      {/* Animated number */}
      <div className="pipeline-step-num-block">
        <span className="pipeline-step-index">{s.num}</span>
        <div className="pipeline-step-line" />
      </div>

      {/* Content */}
      <div className="pipeline-step-body">
        <h3>{s.title}</h3>
        <p>{s.desc}</p>
        <span className="pipeline-step-tag">{s.tag}</span>
      </div>

      {/* Glowing corner accent */}
      <div className="pipeline-step-glow" />
    </div>
  );
}

export default function SimpleHowItWorks({ onOpenAssessment, onOpenEcoBot, authUser }) {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-header">
          <h2>From plant process data to high-ROI circular alternatives.</h2>
          <p>
            No complex consulting fees. A guided intelligence tool designed for SMEs, factory operators, and consultants to pinpoint emission hotspots and quantify payback.
          </p>
        </div>

        {/* Exclusive AI Bot banner above workflow pipeline */}
        <div className="pipeline-exclusive-ai-strip">
          <div className="pipeline-ai-info">
            <span className="pipeline-ai-badge">EXCLUSIVE OPERATOR AI</span>
            <p>Need real-time engineering calculations or official Indian emission formula guidance?</p>
          </div>
          <button
            type="button"
            className={`pipeline-ai-cta-btn ${!authUser ? 'locked' : ''}`}
            onClick={onOpenEcoBot}
            title={authUser ? "Launch EcoBot AI Assistant" : "Sign In to Access EcoBot"}
          >
            <CuteEcoBotIcon size={18} isAnimated={Boolean(authUser)} />
            <span>Consult EcoBot AI</span>
            {!authUser && <Lock size={13} style={{ marginLeft: '4px' }} />}
          </button>
        </div>

        <div className="pipeline-steps-row">
          {steps.map((s, idx) => (
            <StepCard key={idx} s={s} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}

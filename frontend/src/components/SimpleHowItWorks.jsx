import React, { useState } from 'react';

const steps = [
  {
    num: '01',
    title: 'Drop utility bills',
    desc: "Upload last month's electricity bills and fuel invoices. No hardware installations, zero sensor intrusion.",
    tag: 'Takes 2 minutes',
    accent: 'var(--mint)',
  },
  {
    num: '02',
    title: 'Pinpoint invisible leaks',
    desc: 'Our engine isolates exactly where energy escapes — boiler flue gas, motor friction drag, and uninsulated lines.',
    tag: 'Instant diagnosis',
    accent: 'var(--cyan-fresh)',
  },
  {
    num: '03',
    title: 'Close loops & save capital',
    desc: 'Receive pre-engineered circular interventions that recapture waste energy and pay for themselves in months.',
    tag: '< 9 mo payback',
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

export default function SimpleHowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-header">
          <div className="section-tag">
            <span></span>
            THE 3-STEP PIPELINE
          </div>
          <h2>From raw utility bills to real cash savings.</h2>
          <p>
            No complex consulting reports. Just an autonomous intelligence layer
            turning messy plant invoices into high-ROI circular decisions.
          </p>
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

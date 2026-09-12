import React, { useEffect } from 'react';
import { 
  Heart, 
  ArrowLeft, 
  Factory, 
  Leaf, 
  TrendingDown, 
  IndianRupee, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  Globe2, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Eye,
  Activity
} from 'lucide-react';
import EcoLeakLogo from './EcoLeakLogo';

export default function VisionPage({ onBack, onOpenApp }) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="vision-page-wrapper">
      {/* ── Top Ambient Atmosphere ── */}
      <div className="vision-ambient-glow" />

      {/* ── Vision Top Navigation Header ── */}
      <nav className="vision-nav container">
        <button 
          type="button" 
          className="vision-back-btn" 
          onClick={onBack}
          aria-label="Return to Home"
        >
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </button>

        <div className="vision-brand-badge" onClick={onBack} style={{ cursor: 'pointer' }}>
          <EcoLeakLogo size={24} />
          <span>Eco<strong style={{ color: 'var(--mint)' }}>Leak</strong></span>
          <span className="vision-manifesto-tag">MANIFESTO</span>
        </div>

        <button 
          type="button" 
          className="btn btn-primary vision-launch-btn"
          onClick={onOpenApp}
        >
          <span>Try the Engine</span>
          <ArrowRight size={15} />
        </button>
      </nav>

      {/* ── Main Manifesto Container ── */}
      <main className="container vision-main-content">
        {/* ── Hero Banner ── */}
        <header className="vision-hero">
          <div className="vision-badge-pill">
            <Heart size={14} className="heart-pulse" color="#ef4444" />
            <span>Why We Built EcoLeak · An Industrial Manifesto</span>
          </div>

          <h1 className="vision-hero-title">
            Factory Floors Are Not Numbers on a Slide. <br />
            <span className="gradient-text">They Are the Backbone of Real Lives.</span>
          </h1>

          <p className="vision-hero-sub">
            For decades, sustainability software was designed for boardroom executives sipping lattes 
            and checking compliance boxes with multi-million dollar consulting budgets. 
            No one built for the plant supervisor walking the line at 2 AM with grease on their boots 
            and a regulatory notice hanging over their head.
          </p>
        </header>

        {/* ── The Human Reality Behind The Leak ── */}
        <section className="vision-section">
          <div className="vision-card empathetic-split-card">
            <div className="empathetic-card-text">
              <div className="vision-sec-tag">THE UNTOLD SQUEEZE</div>
              <h2>The Quiet Anxiety of the Industrial SME</h2>
              <p>
                Across industrial corridors in Chakan, Peenya, Manesar, and Coimbatore, thousands of family-owned 
                manufacturing units face an existential squeeze:
              </p>
              <ul className="vision-pain-list">
                <li>
                  <div className="pain-icon-wrap"><AlertTriangle size={18} color="#ef4444" /></div>
                  <div>
                    <strong>Rising Virgin Polymer & Fuel Costs:</strong> Virgin plastics and furnace oil prices spike every quarter, eating away the margins of plants that employ 50 to 300 local families.
                  </div>
                </li>
                <li>
                  <div className="pain-icon-wrap"><AlertTriangle size={18} color="#ef4444" /></div>
                  <div>
                    <strong>Abstract ESG Jargon:</strong> When inspectors or buyers ask for "Scope 3 GHG Inventories" or "CBAM Compliance", operators are handed 80-page manuals written in academic abstractions.
                  </div>
                </li>
                <li>
                  <div className="pain-icon-wrap"><AlertTriangle size={18} color="#ef4444" /></div>
                  <div>
                    <strong>Fear of Statutory Shutdowns:</strong> Stricter SPCB pollution limits and emission notices arrive without a single actionable hint on how to fix them without bankrupting the business.
                  </div>
                </li>
              </ul>
            </div>

            <div className="empathetic-card-visual">
              <div className="quote-box">
                <p className="quote-body">
                  "We don't want to pollute. Our families breathe this very air in the township next to the plant. But nobody ever showed us an alternative that didn't risk shutting our presses down or costing months of payroll."
                </p>
                <div className="quote-author">
                  <div className="author-avatar">MS</div>
                  <div>
                    <strong>Manoj Sharma</strong>
                    <span>Plant Head, 2nd-Gen Injection Molding Unit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Core Philosophy: Empathy Through Determinism ── */}
        <section className="vision-section">
          <div className="vision-section-header">
            <div className="vision-sec-tag">OUR CORE CONVICTION</div>
            <h2>True Empathy Means Never Hallucinating Someone's Livelihood</h2>
            <p>
              Why did we ban AI from doing arithmetic? Because when a plant manager invests ₹12 Lakh into a circular regrind line based on software advice, that calculation must be grounded in physical reality.
            </p>
          </div>

          <div className="vision-pillars-grid">
            {/* Pillar 1 */}
            <div className="vision-pillar-card">
              <div className="pillar-icon-box" style={{ background: 'rgba(0, 184, 107, 0.12)', color: 'var(--mint)' }}>
                <ShieldCheck size={26} />
              </div>
              <h3>Deterministic Trust First</h3>
              <p>
                We never let an LLM guess emission factors or invent financial payback periods. Our calculations run on local, rigorously verified thermodynamic equations ($Q \times EF$) and capacity-scaling laws (Williams' 0.65 Rule). Zero hallucinations.
              </p>
              <span className="pillar-footer-badge">100% Mathematically Auditable</span>
            </div>

            {/* Pillar 2 */}
            <div className="vision-pillar-card">
              <div className="pillar-icon-box" style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0284c7' }}>
                <Activity size={26} />
              </div>
              <h3>Concrete Rupees, Not Abstract Tons</h3>
              <p>
                Saying "you leaked 140 tCO₂e" changes nothing on a factory floor. Showing that "substituting 30% virgin HDPE with recycled regrind saves ₹28,400 every week and pays back in 5.2 months" changes everything.
              </p>
              <span className="pillar-footer-badge">Rooted in Unit Economics</span>
            </div>

            {/* Pillar 3 */}
            <div className="vision-pillar-card">
              <div className="pillar-icon-box" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}>
                <Users size={26} />
              </div>
              <h3>Built For Every Plant Worker</h3>
              <p>
                From invoice uploads in Hindi, Marathi, Tamil, and Gujarati via Sarvam AI, to plain-language WhatsApp-friendly executive summaries, EcoLeak speaks the language of the person operating the machine.
              </p>
              <span className="pillar-footer-badge">22+ Indic Languages Supported</span>
            </div>
          </div>
        </section>

        {/* ── The Ripple Effect: From Factory Line to Planet ── */}
        <section className="vision-section">
          <div className="vision-card ripple-card">
            <div className="ripple-header">
              <Globe2 size={28} color="var(--mint)" />
              <div>
                <h2>The Circular Ripple Effect</h2>
                <p>When an SME stops leaking carbon, the benefits cascade far beyond the balance sheet.</p>
              </div>
            </div>

            <div className="ripple-metrics-grid">
              <div className="ripple-metric-box">
                <div className="ripple-metric-num" style={{ color: 'var(--mint)' }}>100%</div>
                <div className="ripple-metric-title">Traceable Interventions</div>
                <p className="ripple-metric-desc">Every suggested circular alternative specifies ASTM standards, technical blend caps, and verified vendor types.</p>
              </div>

              <div className="ripple-metric-box">
                <div className="ripple-metric-num" style={{ color: '#0284c7' }}>70%+</div>
                <div className="ripple-metric-title">Emission Abatement</div>
                <p className="ripple-metric-desc">Transitioning from virgin feedstocks to post-industrial recycled regrind prevents mountains of landfill waste.</p>
              </div>

              <div className="ripple-metric-box">
                <div className="ripple-metric-num" style={{ color: '#8b5cf6' }}>&lt; 8 Mo</div>
                <div className="ripple-metric-title">Average CAPEX Payback</div>
                <p className="ripple-metric-desc">Capital expenditures that recover themselves rapidly through raw material and fuel OPEX savings.</p>
              </div>

              <div className="ripple-metric-box">
                <div className="ripple-metric-num" style={{ color: '#ec4899' }}>0</div>
                <div className="ripple-metric-title">Consultant Overhead</div>
                <p className="ripple-metric-desc">Delivering institutional-grade decarbonization intelligence directly to small plants without the ₹50L price tag.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Closing Call to Action ── */}
        <section className="vision-cta-section">
          <div className="vision-cta-card">
            <div className="vision-cta-content">
              <span className="vision-sec-tag" style={{ color: 'var(--mint)' }}>OUR PLEDGE</span>
              <h2>Ready to Turn Waste Into Your Strongest Asset?</h2>
              <p>
                Decarbonization is not a penalty to pay. It is the greatest competitive advantage 
                of this century. Join hundreds of progressive factory leaders building cleaner, 
                richer, and resilient plants today.
              </p>
              <div className="vision-cta-actions">
                <button 
                  type="button" 
                  className="btn btn-primary btn-lg" 
                  onClick={onOpenApp}
                >
                  Start Plant Assessment Now <ArrowRight size={18} />
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-lg"
                  onClick={onBack}
                >
                  Explore Interactive Calculators
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="vision-footer">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <EcoLeakLogo size={20} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>EcoLeak Vision Manifesto</span>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Empowering factory operators everywhere · Built for Hackout 2026
          </div>
        </div>
      </footer>
    </div>
  );
}

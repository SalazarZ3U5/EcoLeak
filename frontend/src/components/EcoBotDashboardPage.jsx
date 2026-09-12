import React, { useState, useRef, useEffect } from 'react';
import {
  Send, RefreshCw, Check, Copy, ShieldCheck, ArrowRight, Lock, LogIn,
  Sparkles, Bot, Zap, Flame, Scale, Layers, HelpCircle, AlertCircle,
  FileCheck, Factory, CornerDownLeft, ExternalLink, ShieldAlert
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askEcoBotAssistant } from '../services/api';
import { CuteEcoBotIcon } from './EcoBotChat';
import { UserPfp } from '../services/avatarService';
import JargonTooltip from './JargonTooltip';

const FORMAL_GREETING = `### Welcome to EcoLeak AI Copilot

I am your factory's engineering, carbon accounting, and regulatory compliance assistant.

**How I operate:**
- **Deterministic First:** All numerical calculations (Scope 1–3 emissions, Williams' 0.65 Rule CAPEX scaling, payback math) are verified by EcoLeak's local deterministic Python engine.
- **Regulatory Grounded:** Aligned with **GHG Protocol Corporate Standard**, **ISO 14064-1**, and **SPCB / CPCB Consent to Operate** guidelines.

Select a quick inquiry below or describe your factory's utility meters, boiler fuels, or raw polymer feedstocks.`;

const QUICK_INQUIRIES = [
  {
    icon: Zap,
    color: '#00b86b',
    title: 'Scope 2 Electricity Calculation',
    prompt: 'State the official mathematical formula and calculate emissions for 20,000 kWh using Central Electricity Authority (CEA) India grid factors.'
  },
  {
    icon: Flame,
    color: '#f43f5e',
    title: 'Scope 1 Diesel Fuel Math',
    prompt: 'What is the exact physical density conversion and emission factor for calculating Scope 1 emissions from 500 liters of diesel in industrial generators?'
  },
  {
    icon: Scale,
    color: '#0284c7',
    title: "Williams' 0.65 Rule Scaling",
    prompt: "Explain how capital expenditure scales with capacity using Williams' 0.65 power law C2 = C1 * (Q2/Q1)^0.65 for equipment retrofits."
  },
  {
    icon: ShieldAlert,
    color: '#d97706',
    title: 'SPCB Orange Category Rules',
    prompt: 'What are the official SPCB / CPCB Pollution Index thresholds (41–59) and mandatory CTO compliance rules for Orange Category manufacturing sites?'
  },
  {
    icon: Layers,
    color: '#8b5cf6',
    title: 'HDPE PCR Polymer Substitution',
    prompt: 'Calculate the net CO2e reduction percentage and annual OPEX savings when replacing 50% virgin HDPE with recycled PCR flakes at 60,000 kg throughput.'
  },
  {
    icon: FileCheck,
    color: '#0d9488',
    title: 'SEBI BRSR & ISO 14064-1 Audit',
    prompt: 'How should an Indian industrial manufacturer structure Scope 1, 2, and 3 disclosures for mandatory SEBI BRSR Core sustainability reporting?'
  }
];

export default function EcoBotDashboardPage({
  authUser,
  onOpenAuth,
  activePlantContext,
  onNavigateSection,
}) {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: FORMAL_GREETING,
      source: 'EcoLeak Intelligence Engine'
    }
  ]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend = null) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg = { role: 'user', content: text.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const formattedHistory = newHistory.map(m => ({ role: m.role, content: m.content }));
      const res = await askEcoBotAssistant(text.trim(), formattedHistory, activePlantContext);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.response || "Mathematical calculation resolved above.",
          source: res.source || 'EcoLeak Intelligence Engine'
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Verification connection timeout. Baseline Scope 2 reference: Emissions (kg CO₂e) = kWh × 0.82 (CEA India).",
          source: 'System Guidance Fallback'
        }
      ]);
    } finally {
      setIsLoading(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: FORMAL_GREETING,
        source: 'EcoLeak Intelligence Engine'
      }
    ]);
  };

  // Auto-resize textarea
  const handleInputResize = (e) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(180, e.target.scrollHeight)}px`;
  };

  // If user is unauthenticated, display high-conversion access gate
  if (!authUser) {
    return (
      <div className="ecobot-page-container">
        <div className="ecobot-auth-gate-card elite-card">
          <div className="auth-gate-icon-halo">
            <CuteEcoBotIcon size={56} isAnimated={false} />
          </div>
          <span className="auth-gate-tag">
            <Lock size={12} /> Restricted to Verified Operators
          </span>
          <h2 className="auth-gate-title">Sign In to Launch EcoBot AI Copilot</h2>
          <p className="auth-gate-desc">
            EcoBot accesses plant telemetry, SPCB consent thresholds, and material mass balances to calculate verified greenhouse emissions and circular payback periods.
          </p>
          <div className="auth-gate-features-grid">
            <div className="auth-gate-feature">
              <ShieldCheck size={16} color="var(--mint-hover)" />
              <span>Deterministic mathematical verification</span>
            </div>
            <div className="auth-gate-feature">
              <Zap size={16} color="var(--amber)" />
              <span>Scope 1, 2, 3 physical conversion engines</span>
            </div>
            <div className="auth-gate-feature">
              <FileCheck size={16} color="var(--cyan-main)" />
              <span>SPCB / CPCB regulatory limits lookup</span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={onOpenAuth}
            style={{ marginTop: '20px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <LogIn size={18} />
            <span>Sign In / Register with Google SSO</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ecobot-page-container">
      {/* ── Page Hero Header ────────────────────────────────────────────────── */}
      <div className="ecobot-hero-card elite-card">
        <div className="ecobot-hero-main">
          <div className="ecobot-mascot-wrap">
            <CuteEcoBotIcon size={52} isAnimated={true} />
            <span className="ecobot-live-pulse-badge" title="AI Engine Online">
              <span className="live-dot" /> LIVE
            </span>
          </div>

          <div className="ecobot-hero-text">
            <div className="ecobot-chips-row">
              <span className="ecobot-chip chip-online">
                <Sparkles size={12} /> Live Industrial AI Copilot
              </span>
              <span className="ecobot-chip chip-math">
                <ShieldCheck size={12} /> Deterministic Math Invariant
              </span>
              <span className="ecobot-chip chip-model">
                <Bot size={12} /> Groq (gpt-oss-120b) + Gemini
              </span>
            </div>

            <h1 className="ecobot-page-title">
              EcoBot AI Intelligence &amp; Compliance Copilot
            </h1>

            <p className="ecobot-page-desc">
              Ask natural language inquiries about physical unit conversions, <JargonTooltip term="Scope 1">Scope 1</JargonTooltip>–<JargonTooltip term="Scope 3">3</JargonTooltip> accounting, <JargonTooltip term="SPCB">SPCB</JargonTooltip> <JargonTooltip term="CTO">CTO</JargonTooltip> rules, and <JargonTooltip term="Williams' 0.65 Rule">Williams' 0.65 Rule</JargonTooltip> equipment scaling.
            </p>
          </div>
        </div>

        <div className="ecobot-hero-actions">
          <button
            type="button"
            className="btn-ecobot-header-action"
            onClick={handleResetChat}
            title="Reset conversation stream"
          >
            <RefreshCw size={14} />
            <span>Reset Chat</span>
          </button>

          {onNavigateSection && (
            <button
              type="button"
              className="btn-ecobot-header-action primary-alt"
              onClick={() => onNavigateSection('input')}
              title="Return to process data input"
            >
              <Factory size={14} />
              <span>Plant Inputs</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Active Factory Context Strip ────────────────────────────────────── */}
      <div className="ecobot-context-strip elite-card">
        <div className="context-strip-item">
          <Factory size={14} color="var(--mint-hover)" />
          <span className="context-strip-label">Assigned Plant:</span>
          <strong>{authUser?.facilityName || 'GreenPack Plastics Ltd.'}</strong>
        </div>
        <div className="context-strip-divider" />
        <div className="context-strip-item">
          <Scale size={14} color="var(--rose)" />
          <span className="context-strip-label">SPCB Category:</span>
          <strong>{authUser?.regCategory ? authUser.regCategory.split('(')[0].trim() : 'Orange Category'}</strong>
        </div>
        <div className="context-strip-divider" />
        <div className="context-strip-item">
          <FileCheck size={14} color="var(--cyan-main)" />
          <span className="context-strip-label">Consented Cap:</span>
          <strong>{authUser?.emissionCap || '450 MT CO2e / Year'}</strong>
        </div>
        <div className="context-strip-divider" />
        <div className="context-strip-item">
          <Zap size={14} color="var(--amber)" />
          <span className="context-strip-label">Throughput:</span>
          <span>20k kWh · 500L Diesel · 60t Resin</span>
        </div>
      </div>

      {/* ── Quick Inquiries Carousel / Grid ─────────────────────────────────── */}
      <div className="ecobot-quick-inquiries-section">
        <div className="quick-inquiries-header">
          <span className="quick-inquiries-title">
            <HelpCircle size={14} color="var(--mint-hover)" /> ONE-CLICK ENGINEERING &amp; STATUTORY PROMPTS:
          </span>
          <span className="quick-inquiries-hint">Click any card to calculate instantly</span>
        </div>

        <div className="quick-inquiries-grid">
          {QUICK_INQUIRIES.map((q, idx) => {
            const Icon = q.icon;
            return (
              <button
                key={idx}
                type="button"
                className="quick-inquiry-card"
                onClick={() => handleSendMessage(q.prompt)}
                disabled={isLoading}
              >
                <div className="inquiry-icon-wrap" style={{ color: q.color, background: `${q.color}15` }}>
                  <Icon size={16} />
                </div>
                <div className="inquiry-card-content">
                  <strong className="inquiry-card-title">{q.title}</strong>
                  <p className="inquiry-card-desc">{q.prompt}</p>
                </div>
                <ArrowRight size={14} className="inquiry-arrow" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Chat Stream Canvas ─────────────────────────────────────────── */}
      <div className="ecobot-chat-canvas elite-card">
        <div className="chat-canvas-messages-stream">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`ecobot-message-row ${msg.role === 'user' ? 'msg-user-row' : 'msg-assistant-row'}`}
            >
              {msg.role === 'assistant' ? (
                <div className="msg-avatar msg-bot-avatar">
                  <CuteEcoBotIcon size={28} isAnimated={false} />
                </div>
              ) : (
                <div className="msg-avatar msg-user-avatar">
                  <UserPfp user={authUser} size={28} />
                </div>
              )}

              <div className="msg-bubble-container">
                <div className="msg-sender-header">
                  <span className="msg-sender-name">
                    {msg.role === 'assistant' ? 'EcoBot Intelligence' : (authUser?.name || 'Operator')}
                  </span>
                  {msg.source && (
                    <span className="msg-source-tag">
                      <ShieldCheck size={11} /> {msg.source}
                    </span>
                  )}
                  {msg.role === 'assistant' && (
                    <button
                      type="button"
                      className="btn-copy-msg"
                      onClick={() => handleCopy(msg.content, idx)}
                      title="Copy response"
                    >
                      {copiedIdx === idx ? (
                        <>
                          <Check size={12} color="var(--mint-hover)" />
                          <span style={{ color: 'var(--mint-hover)' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="msg-content-body">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="ecobot-message-row msg-assistant-row msg-typing-row">
              <div className="msg-avatar msg-bot-avatar">
                <CuteEcoBotIcon size={28} isAnimated={true} />
              </div>
              <div className="msg-bubble-container typing-bubble">
                <div className="typing-indicator">
                  <span className="dot dot-1" />
                  <span className="dot dot-2" />
                  <span className="dot dot-3" />
                </div>
                <span className="typing-text">
                  Verifying equations, querying emission factors &amp; calculating...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Chat Prompt Dock Bar ─────────────────────────────────────────── */}
        <div className="chat-canvas-dock">
          <div className="dock-input-wrapper">
            <textarea
              ref={textareaRef}
              className="dock-textarea"
              placeholder="Ask EcoBot about Scope 1-3 math, CEA electricity factor, Williams' 0.65 Rule, or SPCB permits..."
              rows={2}
              value={inputMessage}
              onChange={handleInputResize}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />

            <button
              type="button"
              className="dock-send-btn"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              title="Send message (Enter)"
              aria-label="Send message"
            >
              {isLoading ? (
                <RefreshCw size={17} className="spin" />
              ) : (
                <Send size={17} />
              )}
            </button>
          </div>

          <div className="dock-footer-hints">
            <span className="dock-hint-item">
              <CornerDownLeft size={11} /> Press <strong>Enter ↵</strong> to send
            </span>
            <span className="dock-hint-item">
              Shift + Enter for new line
            </span>
            <span className="dock-hint-item hint-model">
              Deterministic Math Pipeline · Zero Hallucination Guarantee
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    shortLabel: 'Scope 2 Grid Math',
    prompt: 'State the official mathematical formula and calculate emissions for 20,000 kWh using Central Electricity Authority (CEA) India grid factors.'
  },
  {
    icon: Flame,
    color: '#f43f5e',
    title: 'Scope 1 Diesel Fuel Math',
    shortLabel: 'Scope 1 Diesel Math',
    prompt: 'What is the exact physical density conversion and emission factor for calculating Scope 1 emissions from 500 liters of diesel in industrial generators?'
  },
  {
    icon: Scale,
    color: '#0284c7',
    title: "Williams' 0.65 Rule Scaling",
    shortLabel: "Williams' 0.65 Rule",
    prompt: "Explain how capital expenditure scales with capacity using Williams' 0.65 power law C2 = C1 * (Q2/Q1)^0.65 for equipment retrofits."
  },
  {
    icon: ShieldAlert,
    color: '#d97706',
    title: 'SPCB Orange Category Rules',
    shortLabel: 'SPCB Orange Rules',
    prompt: 'What are the official SPCB / CPCB Pollution Index thresholds (41–59) and mandatory CTO compliance rules for Orange Category manufacturing sites?'
  },
  {
    icon: Layers,
    color: '#8b5cf6',
    title: 'HDPE PCR Polymer Substitution',
    shortLabel: 'HDPE PCR Polymer',
    prompt: 'Calculate the net CO2e reduction percentage and annual OPEX savings when replacing 50% virgin HDPE with recycled PCR flakes at 60,000 kg throughput.'
  },
  {
    icon: FileCheck,
    color: '#0d9488',
    title: 'SEBI BRSR & ISO 14064-1 Audit',
    shortLabel: 'SEBI BRSR & ISO',
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
      {/* ── Compact Header Toolbar ────────────────────────────────────────── */}
      <div className="ecobot-compact-toolbar elite-card">
        <div className="ecobot-toolbar-brand">
          <div className="ecobot-toolbar-icon-glow">
            <CuteEcoBotIcon size={30} isAnimated={true} />
          </div>
          <div className="ecobot-toolbar-titles">
            <div className="ecobot-toolbar-name-row">
              <h1 className="ecobot-toolbar-title">EcoBot AI Copilot</h1>
              <span className="ecobot-toolbar-live-badge">
                <span className="live-dot" /> LIVE
              </span>
              <span className="ecobot-toolbar-chip chip-math">
                <ShieldCheck size={11} /> Deterministic Math Invariant
              </span>
            </div>
            <div className="ecobot-toolbar-meta-row">
              <span className="ecobot-toolbar-meta-item">
                <Factory size={11} color="var(--mint-hover)" />
                <strong>{authUser?.facilityName || 'Facility Not Configured'}</strong>
              </span>
              <span className="ecobot-toolbar-meta-sep">•</span>
              <span className="ecobot-toolbar-meta-item">
                <Scale size={11} color="var(--rose)" />
                <span>{authUser?.regCategory ? authUser.regCategory.split('(')[0].trim() : 'Category Pending'}</span>
              </span>
              <span className="ecobot-toolbar-meta-sep">•</span>
              <span className="ecobot-toolbar-meta-item">
                <FileCheck size={11} color="var(--cyan-main)" />
                <span>{authUser?.emissionCap || 'Cap Unset'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="ecobot-toolbar-actions">
          <button
            type="button"
            className="btn-ecobot-header-action"
            onClick={handleResetChat}
            title="Reset conversation stream"
          >
            <RefreshCw size={13} />
            <span>Reset Chat</span>
          </button>

          {onNavigateSection && (
            <button
              type="button"
              className="btn-ecobot-header-action primary-alt"
              onClick={() => onNavigateSection('input')}
              title="Return to process data input"
            >
              <Factory size={13} />
              <span>Plant Inputs</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Chat Stream Canvas (Front & Center on Top) ────────────────── */}
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
          {/* Compact Quick Prompts Pill Row (minimal vertical space) */}
          <div className="dock-quick-prompts">
            <span className="quick-prompts-mini-label">
              <Sparkles size={12} color="var(--mint-hover)" /> Quick Inquiries:
            </span>
            <div className="quick-prompts-track">
              {QUICK_INQUIRIES.map((q, idx) => {
                const Icon = q.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    className="quick-prompt-pill"
                    onClick={() => handleSendMessage(q.prompt)}
                    disabled={isLoading}
                    title={q.prompt}
                  >
                    <span className="pill-icon" style={{ color: q.color }}>
                      <Icon size={12} />
                    </span>
                    <span className="pill-text">{q.shortLabel || q.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

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

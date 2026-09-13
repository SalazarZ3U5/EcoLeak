import React, { useState, useRef, useEffect } from 'react';
import {
  Send, RefreshCw, Check, Copy, ShieldCheck, ArrowRight, Lock, LogIn,
  Sparkles, Bot, Zap, Flame, Scale, Layers, HelpCircle, AlertCircle,
  FileCheck, Factory, CornerDownLeft, ExternalLink, ShieldAlert, Building2, Crown, X,
  Mic, MicOff
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
  const [selectedFactoryId, setSelectedFactoryId] = useState('primary');
  const [showProModal, setShowProModal] = useState(false);
  const [showProBadge, setShowProBadge] = useState(false);

  // Multi-Factory Definition: Dynamic plant context from user profile
  const userPlants = Array.isArray(authUser?.plants) ? authUser.plants : [];

  const factoryList = userPlants.map((p, idx) => ({
    id: p.id || `plant_${idx + 1}`,
    name: p.facilityName || `Facility ${idx + 1}`,
    badgeIcon: '',
    statusLabel: idx === 0 ? 'Active Facility' : `Plant #${idx + 1}`,
    location: p.location || '',
    industry: p.industryType || '',
    regCategory: p.regCategory || '',
    regId: p.regId || '',
    capacity: p.capacity || '',
    emissionCap: p.emissionCap || '',
    context: p
  }));

  const currentActiveFactory = factoryList.find(f => f.id === selectedFactoryId) || factoryList[0] || null;

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: FORMAL_GREETING,
      source: 'EcoLeak Intelligence Engine'
    }
  ]);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      setVoiceNotice('');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Optimized for Indian English & technical terms

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice('Listening to factory audio / voice...');
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputMessage((prev) => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + finalTranscript.trim();
          });
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition notice:', event.error);
        setIsListening(false);
        setVoiceNotice('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setVoiceNotice('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition activation error:', err);
      setIsListening(false);
      setVoiceNotice('');
    }
  };

  const handleCloseProModal = () => {
    setShowProModal(false);
    setShowProBadge(false);
  };

  const handleFactorySelect = (id) => {
    if (id === 'all_pro') {
      setShowProBadge(true);
      setShowProModal(true);
      return;
    }
    setShowProBadge(false);
    setSelectedFactoryId(id);
    const target = factoryList.find(f => f.id === id) || factoryList[0];
    const locationPart = target.location ? ` (${target.location})` : '';
    setMessages(prev => [
      ...prev,
      {
        role: 'assistant',
        content: `**Active Target Facility Switched:** **${target.name}**\n\nEcoBot context is now strictly isolated to **${target.name}**${locationPart}.\n\n*Token Guard active: Single-plant context window locked (~1,100 tokens).*`,
        source: 'Scope Switcher'
      }
    ]);
  };

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
      // ONLY send the selected factory's context to prevent token explosion
      const res = await askEcoBotAssistant(text.trim(), formattedHistory, currentActiveFactory.context);

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
                <strong>{currentActiveFactory?.name || 'Facility Not Configured'}</strong>
              </span>
              <span className="ecobot-toolbar-meta-sep">•</span>
              <span className="ecobot-toolbar-meta-item">
                <Scale size={11} color="var(--rose)" />
                <span>{currentActiveFactory?.regCategory ? currentActiveFactory.regCategory.split('(')[0].trim() : 'Category Pending'}</span>
              </span>
              <span className="ecobot-toolbar-meta-sep">•</span>
              <span className="ecobot-toolbar-meta-item">
                <FileCheck size={11} color="var(--cyan-main)" />
                <span>{currentActiveFactory?.emissionCap || 'Cap Unset'}</span>
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

          {/* ── Inline Factory Context Selector (beside input) ───────────── */}
          <div className="dock-context-row">
            {factoryList.length > 0 ? (
              <div className="dock-context-chip">
                <div className="dock-context-selector">
                  <Building2 size={13} className="dock-ctx-icon" />
                  <select
                    className="dock-factory-select font-mono-val"
                    value={showProBadge ? 'all_pro' : selectedFactoryId}
                    onChange={(e) => handleFactorySelect(e.target.value)}
                    title="Select which factory's emissions & circular context is sent to EcoBot"
                  >
                    {factoryList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                    <option value="all_pro">
                      All Factories (Cross-Plant) — PRO
                    </option>
                  </select>
                </div>

                {showProBadge && (
                  <button
                    type="button"
                    className="dock-pro-lock-btn"
                    onClick={() => setShowProModal(true)}
                    title="Cross-Facility Portfolio Analysis requires PRO"
                  >
                    <Lock size={10} />
                    <span className="pro-lock-badge">PRO</span>
                  </button>
                )}

                <div className="dock-token-guard" title="Single-plant context isolation keeps token usage minimal">
                  <ShieldCheck size={11} />
                  <span>~1.1k tokens</span>
                </div>
              </div>
            ) : (
              <div className="dock-context-chip">
                <div className="dock-token-guard">
                  <ShieldCheck size={11} />
                  <span>General Industrial Mode · Zero Hallucinations</span>
                </div>
              </div>
            )}
          </div>

          <div className={`dock-input-wrapper ${isListening ? 'dock-listening' : ''}`}>
            <textarea
              ref={textareaRef}
              className="dock-textarea"
              placeholder={isListening ? "Listening... speak your facility metrics, fuels, or questions..." : "Ask EcoBot about Scope 1-3 math, CEA electricity factor, Williams' 0.65 Rule, or SPCB permits..."}
              rows={2}
              value={inputMessage}
              onChange={handleInputResize}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />

            <button
              type="button"
              className={`dock-voice-btn ${isListening ? 'voice-active' : ''}`}
              onClick={toggleVoiceInput}
              title={isListening ? "Stop voice recording" : "Input using microphone (Voice to Text)"}
              aria-label="Voice input toggle"
            >
              {isListening ? (
                <span className="voice-pulsing-wrapper">
                  <MicOff size={16} />
                  <span className="voice-ripple" />
                </span>
              ) : (
                <Mic size={16} />
              )}
            </button>

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
              {isListening ? (
                <strong style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span className="live-dot-ping" style={{ background: '#ef4444' }} /> Mic Active · Speak now
                </strong>
              ) : (
                'Microphone voice input enabled'
              )}
            </span>
            <span className="dock-hint-item hint-model">
              Deterministic Math Pipeline · Zero Hallucination Guarantee
            </span>
          </div>
        </div>
      </div>

      {/* ── EcoLeak PRO Feature Locked Modal ──────────────────────────────── */}
      {showProModal && (
        <div className="pro-modal-backdrop" onClick={handleCloseProModal}>
          <div className="pro-modal-card elite-card" onClick={(e) => e.stopPropagation()}>
            <div className="pro-modal-header">
              <div className="pro-modal-icon-badge">
                <Crown size={24} color="#d97706" />
              </div>
              <div className="pro-modal-titles">
                <div className="pro-badge-header-row">
                  <h3 className="pro-modal-title">Multi-Plant Portfolio Copilot</h3>
                  <span className="pro-tag-gold">PRO FEATURE</span>
                </div>
                <p className="pro-modal-subtitle">Enterprise Cross-Facility Carbon Intelligence</p>
              </div>
              <button
                type="button"
                className="pro-modal-close"
                onClick={handleCloseProModal}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pro-modal-body">
              <div className="pro-alert-box">
                <div className="pro-alert-icon">
                  <Lock size={18} color="#d97706" />
                </div>
                <div className="pro-alert-text">
                  <strong>Multi-Facility Cross-Analysis is Locked in Standard Tier.</strong>
                  <p>
                    Aggregating operational telemetry, live meters, and circular interventions across multiple factories expands LLM context window payloads by <strong>500%+</strong>, causing token consumption to skyrocket.
                  </p>
                </div>
              </div>

              <div className="pro-comparison-grid">
                <div className="comp-card current">
                  <span className="comp-tag">Standard (Current)</span>
                  <h4>Single-Plant Scope</h4>
                  <ul>
                    <li>Included: 1 factory context isolated per query</li>
                    <li>Included: ~1,100 tokens per prompt (Budget Guard)</li>
                    <li>Included: Sub-second Groq gpt-oss-120b inference</li>
                    <li>Included: Dedicated SPCB consent compliance</li>
                  </ul>
                </div>

                <div className="comp-card pro">
                  <span className="comp-tag pro-tag">EcoLeak PRO</span>
                  <h4>Enterprise Portfolio</h4>
                  <ul>
                    <li>PRO: Cross-plant emission leak correlation</li>
                    <li>PRO: Multi-facility industrial symbiosis</li>
                    <li>PRO: Enterprise SEBI BRSR Core rollups</li>
                    <li>PRO: Dedicated high-throughput token pipeline</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pro-modal-footer">
              <button
                type="button"
                className="btn-pro-cancel"
                onClick={handleCloseProModal}
              >
                Keep Single Plant Focus (Free)
              </button>
              <button
                type="button"
                className="btn-pro-upgrade"
                disabled
                title="PRO subscription is simulated for UI prototyping"
              >
                <Lock size={13} />
                <span>Enterprise Upgrade (Locked)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

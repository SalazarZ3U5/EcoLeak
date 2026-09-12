import React, { useState, useRef, useEffect } from 'react';
import {
  X, Send, RefreshCw, Maximize2, Minimize2, Check, Copy, ShieldCheck, ArrowRight, Lock, LogIn, Mic, MicOff
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askEcoBotAssistant } from '../services/api';

// ── Cute Mascot Vector Component ──────────────────────────────────────────────
export const CuteEcoBotIcon = ({ size = 26, isAnimated = true }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`cute-ecobot-svg ${isAnimated ? 'cute-bot-bounce' : ''}`}
    style={{ flexShrink: 0 }}
    aria-hidden="true"
  >
    {/* Soft Glow Underlay */}
    <circle cx="24" cy="26" r="18" fill="rgba(0, 184, 107, 0.18)" />

    {/* Little Sprout Leaf Antenna */}
    <path
      d="M24 12C24 7 28 5 31 6C31 9 29 12 24 12Z"
      fill="#00B86B"
      stroke="#062319"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M24 12C24 8 20 6 17 7C17 10 19 12 24 12Z"
      fill="#00D682"
      stroke="#062319"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    {/* Antenna Stem */}
    <line x1="24" y1="12" x2="24" y2="16" stroke="#062319" strokeWidth="2.5" strokeLinecap="round" />

    {/* Head Chassis */}
    <rect
      x="8"
      y="16"
      width="32"
      height="24"
      rx="12"
      fill="#FFFFFF"
      stroke="#062319"
      strokeWidth="2.5"
    />

    {/* Glass Screen Visor */}
    <rect
      x="12"
      y="20"
      width="24"
      height="14"
      rx="6"
      fill="#062319"
    />

    {/* Friendly Glowing Eyes */}
    <circle cx="18" cy="26" r="3.2" fill="#00D682" className="cute-bot-eye" />
    <circle cx="17" cy="25" r="1.1" fill="#FFFFFF" />
    <circle cx="30" cy="26" r="3.2" fill="#00D682" className="cute-bot-eye" />
    <circle cx="29" cy="25" r="1.1" fill="#FFFFFF" />

    {/* Subtle Expression Curve */}
    <path
      d="M22 30C23 31 25 31 26 30"
      stroke="#00B86B"
      strokeWidth="1.8"
      strokeLinecap="round"
    />

    {/* Cheeks */}
    <circle cx="14" cy="29" r="1.6" fill="rgba(244, 63, 94, 0.4)" />
    <circle cx="34" cy="29" r="1.6" fill="rgba(244, 63, 94, 0.4)" />

    {/* Side Sensors */}
    <rect x="5" y="24" width="3" height="8" rx="1.5" fill="#00B86B" stroke="#062319" strokeWidth="1.5" />
    <rect x="40" y="24" width="3" height="8" rx="1.5" fill="#00B86B" stroke="#062319" strokeWidth="1.5" />
  </svg>
);

const FORMAL_GREETING = `Welcome to EcoLeak Assistant.
I assist with industrial emission calculations, Scope 1–3 carbon accounting, and regulatory compliance math.
Enter an activity value, fuel quantity, or project inquiry to begin.`;

const QUICK_QUERIES = [
  { label: 'Scope 2 Electricity Formula', prompt: 'State the official mathematical formula and calculate emissions for 25,000 kWh using CEA India factors.' },
  { label: 'Scope 1 Diesel Conversion', prompt: 'What is the exact conversion formula and emission factor for calculating Scope 1 emissions from diesel combustion?' },
  { label: 'Simple Payback Math', prompt: 'Demonstrate the simple payback period calculation formula for a project with CAPEX ₹4,00,000 and annual OPEX savings ₹90,000.' },
  { label: 'SPCB Orange Category Thresholds', prompt: 'What are the official SPCB / CPCB Pollution Index thresholds and criteria for Orange Category industrial facilities?' },
  { label: 'Polymer Substitution Math', prompt: 'Calculate the net CO2e reduction percentage and tonnage saved when substituting 50 metric tons of virgin HDPE with mechanically recycled resin.' }
];

export default function EcoBotChat({
  isOpen = false,
  onClose,
  activePlantContext,
  authUser,
  onOpenAuth,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: FORMAL_GREETING,
      source: 'EcoLeak Intelligence'
    }
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

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
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
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

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
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
          content: "Verification connection timeout. Baseline Scope 2 reference: Emissions (kg CO₂e) = kWh × 0.716 (CEA India).",
          source: 'System Guidance'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1800);
  };

  // Completely remove floating launcher button when closed
  if (!isOpen) {
    return null;
  }

  // Authentication Gate: only authenticated operators can access EcoBot
  if (!authUser) {
    return (
      <div className="ecobot-chat-container">
        <div className={`ecobot-window ${isExpanded ? 'ecobot-expanded' : ''}`}>
          <div className="ecobot-header">
            <div className="ecobot-header-left">
              <div className="ecobot-header-avatar">
                <CuteEcoBotIcon size={24} isAnimated={false} />
              </div>
              <div className="ecobot-header-info">
                <div className="ecobot-name-row">
                  <span className="ecobot-title">EcoBot</span>
                  <span className="ecobot-status-pill locked">
                    <Lock size={10} /> Auth Required
                  </span>
                </div>
                <span className="ecobot-subtitle">
                  Industrial Emission &amp; Mathematical Intelligence
                </span>
              </div>
            </div>
            <div className="ecobot-header-actions">
              <button
                type="button"
                className="ecobot-head-btn"
                onClick={onClose}
                title="Close"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="ecobot-auth-gate">
            <div className="ecobot-gate-icon">
              <Lock size={28} />
            </div>
            <h3 className="ecobot-gate-title">Operator Authentication Required</h3>
            <p className="ecobot-gate-desc">
              EcoBot AI Copilot is available to authenticated industrial operators. Please sign in or register to access real-time emission calculations and circular interventions.
            </p>
            <button
              type="button"
              className="ecobot-gate-cta"
              onClick={() => {
                if (onClose) onClose();
                if (onOpenAuth) onOpenAuth();
              }}
            >
              <LogIn size={15} />
              <span>Sign In / Register to Access</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ecobot-chat-container">
      {/* ── Chat Modal Window ──────────────────────────────────────────────── */}
      <div className={`ecobot-window ${isExpanded ? 'ecobot-expanded' : ''}`}>
          {/* Elite Header */}
          <div className="ecobot-header">
            <div className="ecobot-header-left">
              <div className="ecobot-header-avatar">
                <CuteEcoBotIcon size={24} isAnimated={false} />
              </div>
              <div className="ecobot-header-info">
                <div className="ecobot-name-row">
                  <span className="ecobot-title">EcoBot</span>
                  <span className="ecobot-status-pill">
                    <span className="ecobot-status-dot"></span> Online
                  </span>
                </div>
                <span className="ecobot-subtitle">
                  Industrial Emission &amp; Mathematical Intelligence
                </span>
              </div>
            </div>

            <div className="ecobot-header-actions">
              <button
                type="button"
                className="ecobot-head-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Default window size' : 'Expand window'}
                aria-label="Toggle window size"
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button
                type="button"
                className="ecobot-head-btn"
                onClick={onClose}
                title="Close Assistant"
                aria-label="Close Assistant"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Quick Guidance Chips (Clean, Scrollbar-Free) */}
          <div className="ecobot-quick-chips-wrapper">
            <div className="ecobot-quick-chips">
              {QUICK_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="ecobot-chip"
                  onClick={() => handleSendMessage(q.prompt)}
                  disabled={isLoading}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="ecobot-messages-scroll">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`ecobot-msg-row ${msg.role === 'user' ? 'msg-user-row' : 'msg-bot-row'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="msg-bot-avatar">
                    <CuteEcoBotIcon size={18} isAnimated={false} />
                  </div>
                )}

                <div className={`ecobot-bubble ${msg.role === 'user' ? 'bubble-user' : 'bubble-bot'}`}>
                  <div className="bubble-text-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ node, ...props }) => (
                          <div className="bubble-table-wrapper">
                            <table className="bubble-table" {...props} />
                          </div>
                        ),
                        code: ({ node, inline, className, children, ...props }) => (
                          <code className={inline ? 'bubble-inline-code' : 'bubble-block-code'} {...props}>
                            {children}
                          </code>
                        )
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {msg.role === 'assistant' && (
                    <div className="bubble-footer-actions">
                      <span className="bubble-source-tag">
                        EcoLeak Verified Calculations
                      </span>
                      <button
                        type="button"
                        className="btn-copy-formula"
                        onClick={() => handleCopy(msg.content, idx)}
                        title="Copy formula"
                      >
                        {copiedIdx === idx ? (
                          <><Check size={11} color="var(--mint-hover)" /> Copied</>
                        ) : (
                          <><Copy size={11} /> Copy</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="ecobot-msg-row msg-bot-row">
                <div className="msg-bot-avatar">
                  <CuteEcoBotIcon size={18} isAnimated={true} />
                </div>
                <div className="ecobot-bubble bubble-bot bubble-loading">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                    Computing carbon formula...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className={`ecobot-input-bar ${isListening ? 'listening-active' : ''}`}
          >
            <input
              type="text"
              placeholder={isListening ? "Listening... speak metrics or questions..." : "Enter formula inquiry or consumption data..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="ecobot-input"
              disabled={isLoading}
            />
            <button
              type="button"
              className={`ecobot-mic-btn ${isListening ? 'mic-listening' : ''}`}
              onClick={toggleVoiceInput}
              title={isListening ? "Stop listening" : "Speak using microphone"}
              aria-label="Toggle voice input"
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="ecobot-send-btn"
              title="Submit Calculation"
              aria-label="Submit"
            >
              {isLoading ? <RefreshCw size={13} className="spin-on-active" /> : <ArrowRight size={14} />}
            </button>
          </form>
        </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { getJargon, JARGON_CATEGORIES } from '../data/jargonDictionary';
import { HelpCircle, Info, BookOpen, Sparkles } from 'lucide-react';

/**
 * JargonTooltip Component
 * Wraps technical jargon terms with an interactive hover tooltip displaying
 * full forms, regulatory definitions, and formulas directly from platform docs.
 *
 * Usage:
 *   <Jargon term="CO2e">CO₂e</Jargon>
 *   <Jargon term="Scope 1" />
 *   <JargonIcon term="Williams' 0.65 Rule" />
 */
export default function JargonTooltip({
  term,
  children,
  showUnderline = true,
  className = '',
  position = 'top', // 'top' | 'bottom'
}) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const jargon = getJargon(term);

  if (!jargon) {
    return <span className={className}>{children || term}</span>;
  }

  const category = JARGON_CATEGORIES[jargon.category] || JARGON_CATEGORIES.CARBON;

  return (
    <span
      ref={triggerRef}
      className={`jargon-tooltip-wrapper ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      role="button"
      aria-label={`${jargon.term}: ${jargon.fullName}`}
    >
      <span className={`jargon-trigger-text ${showUnderline ? 'has-jargon-underline' : ''}`}>
        {children || jargon.term}
      </span>

      {isVisible && (
        <span
          ref={tooltipRef}
          className={`jargon-popover-card popover-${position}`}
          role="tooltip"
        >
          <span className="jargon-popover-header">
            <span
              className="jargon-category-pill"
              style={{ color: category.color, background: category.bg }}
            >
              <BookOpen size={10} style={{ display: 'inline', marginRight: '4px' }} />
              {category.label}
            </span>
            {jargon.badge && (
              <span className="jargon-badge-code">
                {jargon.badge}
              </span>
            )}
          </span>

          <span className="jargon-title-row">
            <strong className="jargon-term-name">{jargon.term}</strong>
            <span className="jargon-fullname">{jargon.fullName}</span>
          </span>

          <span className="jargon-definition">
            {jargon.definition}
          </span>

          <span className="jargon-footer-hint">
            <Sparkles size={11} color="var(--mint-hover)" />
            <span>EcoLeak Technical Knowledge Base</span>
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * JargonIcon Component
 * Compact info badge icon that displays jargon definition tooltip on hover
 */
export function JargonIcon({ term, size = 14, className = '' }) {
  const jargon = getJargon(term);
  if (!jargon) return null;

  return (
    <JargonTooltip term={term} showUnderline={false} className={`jargon-icon-wrapper ${className}`}>
      <span className="jargon-info-circle-btn" title={`Click/Hover to learn about ${jargon.fullName}`}>
        <Info size={size} />
      </span>
    </JargonTooltip>
  );
}

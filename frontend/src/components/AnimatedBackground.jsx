import React, { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    let checkTimer;
    let isMounted = true;

    const initVanta = () => {
      if (!isMounted || vantaEffect.current || !vantaRef.current) return;

      if (window.VANTA && window.VANTA.TOPOLOGY && window.p5) {
        try {
          // High performance parameters:
          // scale: 2.50 cuts rasterization by 84% on 4K/retina displays, eliminating any browser lag
          // Background: #f8faf8 (site root variable --bg) -> 0xf8faf8
          // Topological Lines: vibrant light mint green #22c55e -> 0x22c55e
          vantaEffect.current = window.VANTA.TOPOLOGY({
            el: vantaRef.current,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: 2.50,
            scaleMobile: 3.50,
            color: 0x22c55e,
            backgroundColor: 0xf8faf8,
          });
        } catch (err) {
          console.debug('Vanta topology initialization note:', err);
        }
      } else {
        // Retry shortly if p5 or vanta script is still loading
        checkTimer = setTimeout(initVanta, 100);
      }
    };

    initVanta();

    return () => {
      isMounted = false;
      if (checkTimer) clearTimeout(checkTimer);
      if (vantaEffect.current && typeof vantaEffect.current.destroy === 'function') {
        try {
          vantaEffect.current.destroy();
        } catch (e) {
          console.debug('Vanta destroy note:', e);
        }
        vantaEffect.current = null;
      }
    };
  }, []);

  return (
    <div className="animated-bg-wrapper">
      {/* Vanta Topology Interactive Element */}
      <div 
        ref={vantaRef} 
        id="vanta-topology-bg" 
        className="vanta-topology-container"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          opacity: 0.70,
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform',
          contain: 'strict'
        }}
      />
      {/* Continuous subtle scrolling dot-grid overlay */}
      <div className="continuous-scroll-grid" style={{ pointerEvents: 'none', opacity: 0.6 }} />
      {/* Diagonal cross-hatch accent line layer */}
      <div className="bg-hatch-layer" style={{ pointerEvents: 'none', opacity: 0.4 }} />
    </div>
  );
}


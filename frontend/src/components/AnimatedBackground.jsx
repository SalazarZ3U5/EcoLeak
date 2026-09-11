import React, { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);

    const onResize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    // ── Orbs (large, slow, blurry radial blobs) ──────────────────────────
    const orbs = Array.from({ length: 3 }, (_, i) => ({
      x: W * (0.2 + i * 0.3),
      y: H * (0.2 + i * 0.2),
      r: 240 + i * 80,
      vx: 0.12 * (i % 2 === 0 ? 1 : -1),
      vy: 0.09 * (i % 2 === 0 ? -1 : 1),
      hue: i === 1 ? 160 : 148,           // slightly varied greens
    }));

    // ── Fast particles (trail streams) ───────────────────────────────────
    const count = Math.min(60, Math.floor((W * H) / 22000));
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: 0.15 + Math.random() * 0.25,
      vy: 0.35 + Math.random() * 0.55,
      r: 1 + Math.random() * 2,
      alpha: 0.08 + Math.random() * 0.22,
      len: 18 + Math.random() * 40,
    }));

    // ── Static connection graph (thin lattice between fixed "hub" nodes) ──
    const hubCount = 8;
    const hubs = Array.from({ length: hubCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
    }));

    let t = 0;

    const render = () => {
      t += 0.008;
      ctx.clearRect(0, 0, W, H);

      // 1) Ambient orb blobs
      for (const orb of orbs) {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < -orb.r || orb.x > W + orb.r) orb.vx *= -1;
        if (orb.y < -orb.r || orb.y > H + orb.r) orb.vy *= -1;

        const g = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        g.addColorStop(0, `hsla(${orb.hue}, 76%, 42%, 0.055)`);
        g.addColorStop(0.5, `hsla(${orb.hue}, 60%, 60%, 0.022)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2) Slow hub lattice
      for (const hub of hubs) {
        hub.x += hub.vx;
        hub.y += hub.vy;
        if (hub.x < 0 || hub.x > W) hub.vx *= -1;
        if (hub.y < 0 || hub.y > H) hub.vy *= -1;
      }
      for (let i = 0; i < hubs.length; i++) {
        for (let j = i + 1; j < hubs.length; j++) {
          const d = Math.hypot(hubs[i].x - hubs[j].x, hubs[i].y - hubs[j].y);
          if (d < 260) {
            ctx.beginPath();
            ctx.moveTo(hubs[i].x, hubs[i].y);
            ctx.lineTo(hubs[j].x, hubs[j].y);
            ctx.strokeStyle = `rgba(0,184,107,${(1 - d / 260) * 0.07})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // 3) Stream particles + trails
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x > W + 60) p.x = -60;
        if (p.y > H + 60) p.y = -60;

        // Trail
        const g = ctx.createLinearGradient(
          p.x - p.vx * p.len, p.y - p.vy * p.len, p.x, p.y
        );
        g.addColorStop(0, `rgba(0,184,107,0)`);
        g.addColorStop(1, `rgba(0,184,107,${p.alpha})`);
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * p.len, p.y - p.vy * p.len);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Node head
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,184,107,${p.alpha * 1.8})`;
        ctx.fill();
      }

      // 4) Gentle top-right pulsing highlight
      const px = W * 0.82 + Math.sin(t * 0.55) * 60;
      const py = H * 0.18 + Math.cos(t * 0.4) * 40;
      const pulse = ctx.createRadialGradient(px, py, 0, px, py, W * 0.38);
      pulse.addColorStop(0, `rgba(0,184,107,${0.032 + 0.012 * Math.sin(t * 1.4)})`);
      pulse.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pulse;
      ctx.fillRect(0, 0, W, H);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="animated-bg-wrapper">
      {/* Continuous scrolling dot-grid layer */}
      <div className="continuous-scroll-grid" />
      {/* Diagonal cross-hatch accent line layer */}
      <div className="bg-hatch-layer" />
      <canvas ref={canvasRef} className="animated-bg-canvas" />
    </div>
  );
}

import { useRef, useCallback } from 'react';

/**
 * useTilt — returns ref + handlers for a 3D card-tilt effect.
 * Usage: const { ref, onMouseMove, onMouseLeave } = useTilt();
 * Then: <div ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} />
 */
export function useTilt(maxDeg = 10) {
  const ref = useRef(null);

  const onMouseMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rotX = (-dy * maxDeg).toFixed(2);
      const rotY = (dx * maxDeg).toFixed(2);
      el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.025,1.025,1.025)`;
    },
    [maxDeg]
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform =
      'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}

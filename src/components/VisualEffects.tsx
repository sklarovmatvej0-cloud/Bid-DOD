import React, { useEffect, useRef, useState } from 'react';

interface ConfettiBurstProps {
  active: boolean;
  intensity?: 'normal' | 'victory';
}

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  active,
  intensity = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ['#ffd66b', '#c41e2e', '#157a4f', '#135c75', '#38bdf8', '#fb7185'];
    const count = intensity === 'victory' ? 85 : 42;

    const particles = Array.from({ length: count }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const startX = intensity === 'victory' ? (fromLeft ? w * 0.25 : w * 0.75) : w * 0.5;
      const startY = intensity === 'victory' ? h * 0.48 : h * 0.42;
      const angle =
        intensity === 'victory'
          ? -Math.PI / 2 + (Math.random() - 0.5) * 1.45
          : -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
      const speed = (intensity === 'victory' ? 460 : 340) + Math.random() * 340;
      return {
        x: startX + (Math.random() - 0.5) * 60,
        y: startY + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 10,
        color: colors[i % colors.length],
        shape: i % 3,
        life: 0,
        maxLife: 1.45 + Math.random() * 0.7,
      };
    });

    let rafId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);

      let alive = false;
      for (const p of particles) {
        p.life += dt;
        if (p.life >= p.maxLife) continue;
        alive = true;

        p.vy += 680 * dt;
        p.vx *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vRot * dt;

        const alpha = Math.max(0, 1 - Math.pow(p.life / p.maxLife, 1.8));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 0) {
          ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
        } else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.42, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 0.5);
          ctx.lineTo(p.size * 0.45, p.size * 0.45);
          ctx.lineTo(-p.size * 0.45, p.size * 0.45);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      if (alive) {
        rafId = requestAnimationFrame(loop);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [active, intensity]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60] w-full h-full"
      aria-hidden="true"
    />
  );
};

interface AnimatedNumberProps {
  value: number;
  durationMs?: number;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  durationMs = 420,
  className = '',
}) => {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const startVal = prevRef.current;
    if (startVal === value) return;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      prevRef.current = value;
    };
  }, [value, durationMs]);

  return <span className={className}>{display}</span>;
};

import { useEffect, useRef } from "react";

const RINGS = [
  { rx: 320, ry: 120, rotation: -12, duration: 18, reverse: false, delay: 0, color: "#e84393", opacity: 0.35, width: 1.5, dashArray: "8 16" },
  { rx: 360, ry: 140, rotation: 8, duration: 24, reverse: true, delay: -6, color: "#6c5ce7", opacity: 0.3, width: 1.2, dashArray: "12 20" },
  { rx: 300, ry: 100, rotation: -30, duration: 15, reverse: false, delay: -3, color: "#e84393", opacity: 0.2, width: 1, dashArray: "6 24" },
  { rx: 380, ry: 160, rotation: 22, duration: 30, reverse: true, delay: -10, color: "#6c5ce7", opacity: 0.18, width: 0.8, dashArray: "4 32" },
  { rx: 280, ry: 90, rotation: 45, duration: 20, reverse: false, delay: -8, color: "#e783b3", opacity: 0.22, width: 1, dashArray: "10 18" },
];

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  angle: (i / 24) * Math.PI * 2,
  rx: 260 + Math.random() * 160,
  ry: 80 + Math.random() * 100,
  rotation: -20 + Math.random() * 40,
  speed: 12 + Math.random() * 20,
  size: 1.5 + Math.random() * 2,
  color: Math.random() > 0.5 ? "#e84393" : "#6c5ce7",
  opacity: 0.3 + Math.random() * 0.5,
  delay: Math.random() * -30,
}));

export default function HeroLogoAnimation({ children }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let running = true;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    function draw(t) {
      if (!running) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      ctx.clearRect(0, 0, w, h);
      const sec = t / 1000;

      for (const p of PARTICLES) {
        const elapsed = sec + p.delay;
        const angle = p.angle + (elapsed / p.speed) * Math.PI * 2;
        const rot = (p.rotation * Math.PI) / 180;
        const rawX = Math.cos(angle) * p.rx;
        const rawY = Math.sin(angle) * p.ry;
        const x = cx + rawX * Math.cos(rot) - rawY * Math.sin(rot);
        const y = cy + rawX * Math.sin(rot) + rawY * Math.cos(rot);
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2 + p.angle);
        const alpha = p.opacity * pulse;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="hero-logo-wrap" style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: 700 }}>
      {/* Glow pulse */}
      <div className="hero-logo-glow" aria-hidden="true" />
      {/* Orbital rings SVG */}
      <svg className="hero-logo-orbits" aria-hidden="true" viewBox="-420 -200 840 400" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
        <defs>
          <linearGradient id="orb-grad-pink" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e84393" stopOpacity="0" />
            <stop offset="50%" stopColor="#e84393" stopOpacity="1" />
            <stop offset="100%" stopColor="#e84393" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="orb-grad-purple" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6c5ce7" stopOpacity="0" />
            <stop offset="50%" stopColor="#6c5ce7" stopOpacity="1" />
            <stop offset="100%" stopColor="#6c5ce7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {RINGS.map((ring, i) => (
          <g key={i} transform={`rotate(${ring.rotation})`}>
            <ellipse
              cx="0"
              cy="0"
              rx={ring.rx}
              ry={ring.ry}
              fill="none"
              stroke={ring.color.includes("e843") ? "url(#orb-grad-pink)" : "url(#orb-grad-purple)"}
              strokeWidth={ring.width}
              strokeDasharray={ring.dashArray}
              opacity={ring.opacity}
              style={{
                transformOrigin: "center",
                animation: `${ring.reverse ? "hero-orbit-rev" : "hero-orbit"} ${ring.duration}s linear infinite`,
                animationDelay: `${ring.delay}s`,
              }}
            />
          </g>
        ))}
      </svg>
      {/* Canvas particles */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, pointerEvents: "none", width: "100%", height: "100%" }}
      />
      {/* Logo */}
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        {children}
      </div>
    </div>
  );
}

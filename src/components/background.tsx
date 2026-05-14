import { useMemo } from "react";

const PARTICLE_COUNT = 28;

export function Background() {
  const particles = useMemo(() =>
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 6 + Math.random() * 14,
      delay: -Math.random() * 20,
      opacity: 0.2 + Math.random() * 0.5,
      isCyan: Math.random() > 0.7,
    })), []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>

      {/* Top purple orb */}
      <div className="bg-orb bg-orb-top" />

      {/* Bottom-left cyan orb */}
      <div className="bg-orb bg-orb-bottom-left" />

      {/* Right-side faint purple orb */}
      <div className="bg-orb bg-orb-right" />

      {/* Dot grid */}
      <div className="bg-grid-dots" />

      {/* Scanline sweep */}
      <div className="scanline" />

      {/* Floating particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            background: p.isCyan
              ? "rgba(6,182,212,0.9)"
              : "rgba(167,139,250,0.9)",
            boxShadow: p.isCyan
              ? "0 0 6px 1px rgba(6,182,212,0.6)"
              : "0 0 6px 1px rgba(167,139,250,0.6)",
          }}
        />
      ))}
    </div>
  );
}

"use client";

import { useRef, useCallback, useState } from "react";

interface Ripple { id: number; x: number; y: number; size: number; }

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  strength?: number;
}

export default function MagneticButton({ children, strength = 0.3, style, onClick, ...props }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const onMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) * strength;
    const y = (e.clientY - top - height / 2) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }, [strength]);

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0,0)";
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const size = Math.max(width, height) * 2;
    const x = e.clientX - left - size / 2;
    const y = e.clientY - top - size / 2;
    const id = Date.now();
    setRipples(r => [...r, { id, x, y, size }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 620);
    onClick?.(e);
  }, [onClick]);

  return (
    <button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={handleClick}
      style={{ position: "relative", overflow: "hidden", transition: "transform .2s ease", ...style }}
      {...props}
    >
      {children}
      {ripples.map(rp => (
        <span
          key={rp.id}
          style={{
            position: "absolute",
            left: rp.x,
            top: rp.y,
            width: rp.size,
            height: rp.size,
            borderRadius: "50%",
            background: "rgba(255,255,255,.22)",
            pointerEvents: "none",
            animation: "ripple .6s ease-out forwards",
          }}
        />
      ))}
    </button>
  );
}

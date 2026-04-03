"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  score: number;       // 0–100
  size?: number;       // default 48
  strokeWidth?: number; // default 4
  color?: string;
}

function scoreToColor(score: number): string {
  // red at 0, gold at 100
  const r1 = 239, g1 = 68, b1 = 68;    // red
  const r2 = 209, g2 = 173, b2 = 56;   // gold
  const t = Math.min(Math.max(score / 100, 0), 1);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export default function ProgressRing({ score, size = 48, strokeWidth = 4, color }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const containerRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const clampedScore = Math.min(Math.max(score, 0), 100);
  const ringColor = color ?? scoreToColor(clampedScore);
  const dashoffset = active
    ? circumference - (clampedScore / 100) * circumference
    : circumference;

  return (
    <svg
      ref={containerRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={ringColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transition: "stroke-dashoffset 1.2s ease-out",
        }}
      />
    </svg>
  );
}

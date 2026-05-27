"use client";

type StructuroLogoProps = {
  size?: number;
};

export default function StructuroLogo({ size = 26 }: StructuroLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs>
        <clipPath id="stLogoClip">
          <circle cx="16" cy="16" r="15" />
        </clipPath>
        <linearGradient id="stLogoTeal" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#2BD9D9" />
          <stop offset="1" stopColor="#1B97D1" />
        </linearGradient>
      </defs>
      <g clipPath="url(#stLogoClip)">
        <rect x="0" y="0" width="16" height="32" fill="#0E1730" />
        <rect x="16" y="0" width="16" height="32" fill="url(#stLogoTeal)" />
        {[8, 14, 20, 26].map((y) => (
          <circle key={`r${y}`} cx={22} cy={y} r="0.8" fill="rgba(255,255,255,0.5)" />
        ))}
        {[10, 18, 24].map((y) => (
          <circle key={`l${y}`} cx={9} cy={y} r="0.8" fill="rgba(255,255,255,0.3)" />
        ))}
        <path d="M16 4 L16 28" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      </g>
      <circle
        cx="16"
        cy="16"
        r="15.4"
        fill="none"
        stroke="rgba(14,23,48,0.18)"
        strokeWidth="0.5"
      />
    </svg>
  );
}

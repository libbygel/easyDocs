import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import React from "react";

export const AnimatedCard: React.FC<{
  delay: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 180 } });
  const y = interpolate(s, [0, 1], [60, 0]);
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${y}px)`,
        background: "rgba(255,255,255,0.07)",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: undefined,
        padding: "24px 32px",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import React from "react";

export const StepNumber: React.FC<{ num: string; color: string; delay?: number }> = ({
  num,
  color,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 40,
        fontWeight: 800,
        color: "#fff",
        transform: `scale(${s})`,
        boxShadow: `0 8px 32px ${color}66`,
      }}
    >
      {num}
    </div>
  );
};

import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const PersistentBackground = () => {
  const frame = useCurrentFrame();
  const hue = interpolate(frame, [0, 1200], [215, 245]);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 40%, 10%) 0%, hsl(${hue + 15}, 35%, 6%) 100%)`,
      }}
    />
  );
};

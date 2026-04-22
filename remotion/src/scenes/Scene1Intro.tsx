import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const subS = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const lineW = interpolate(frame, [15, 65], [0, 600], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const badgeS = spring({ frame: frame - 50, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", direction: "rtl" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 110, fontWeight: 900, color: "#fff", opacity: titleS,
          transform: `scale(${interpolate(titleS, [0, 1], [0.6, 1])})`,
          fontFamily: "sans-serif", letterSpacing: -3,
        }}>
          EasyDocs
        </div>
        <div style={{
          width: lineW, height: 5,
          background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)",
          borderRadius: 2, margin: "24px auto",
        }} />
        <div style={{
          fontSize: 44, color: "rgba(255,255,255,0.8)", opacity: subS,
          transform: `translateY(${interpolate(subS, [0, 1], [30, 0])}px)`,
          fontFamily: "sans-serif",
        }}>
          ניהול מסמכים חכם ליועצי משכנתאות
        </div>
        <div style={{
          marginTop: 36, opacity: badgeS, transform: `scale(${badgeS})`,
          background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
          borderRadius: 30, padding: "14px 36px", display: "inline-block",
          fontSize: 26, color: "#60a5fa", fontFamily: "sans-serif",
        }}>
          ⚡ פשוט. מסודר. מקצועי.
        </div>
      </div>
    </AbsoluteFill>
  );
};

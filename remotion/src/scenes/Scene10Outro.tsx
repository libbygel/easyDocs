import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene10Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame: frame - 8, fps, config: { damping: 14 } });
  const textS = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const lineW = interpolate(frame, [20, 70], [0, 600], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const ctaS = spring({ frame: frame - 60, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", direction: "rtl" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontSize: 100, fontWeight: 900, color: "#fff", opacity: logoS,
          transform: `scale(${interpolate(logoS, [0, 1], [0.7, 1])})`,
          fontFamily: "sans-serif", letterSpacing: -3,
        }}>
          EasyDocs
        </div>
        <div style={{
          width: lineW, height: 5,
          background: "linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #ec4899)",
          borderRadius: 2, margin: "24px auto",
        }} />
        <div style={{
          fontSize: 36, color: "rgba(255,255,255,0.7)", opacity: textS,
          fontFamily: "sans-serif", lineHeight: 1.8,
        }}>
          ניהול מסמכים חכם ליועצי משכנתאות
        </div>
        <div style={{
          marginTop: 36, opacity: ctaS, transform: `translateY(${interpolate(ctaS, [0, 1], [20, 0])}px)`,
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          borderRadius: 30, padding: "16px 48px", display: "inline-block",
          fontSize: 30, fontWeight: 700, color: "#fff", fontFamily: "sans-serif",
          boxShadow: "0 8px 32px rgba(59,130,246,0.4)",
        }}>
          הירשמו עכשיו — חינם לחלוטין! 🚀
        </div>
      </div>
    </AbsoluteFill>
  );
};

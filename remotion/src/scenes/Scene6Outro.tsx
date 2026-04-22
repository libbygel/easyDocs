import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene6Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame: frame - 10, fps, config: { damping: 14 } });
  const textS = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const lineW = interpolate(frame, [25, 65], [0, 500], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", direction: "rtl" }}>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "#fff",
            opacity: logoS,
            transform: `scale(${interpolate(logoS, [0, 1], [0.8, 1])})`,
            fontFamily: "sans-serif",
          }}
        >
          EasyDocs
        </div>
        <div
          style={{
            width: lineW,
            height: 4,
            background: "linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6)",
            borderRadius: 2,
            margin: "20px auto",
          }}
        />
        <div
          style={{
            fontSize: 32,
            color: "rgba(255,255,255,0.7)",
            opacity: textS,
            fontFamily: "sans-serif",
            lineHeight: 1.8,
          }}
        >
          ניהול מסמכים חכם ליועצי משכנתאות
        </div>
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.4)",
            opacity: spring({ frame: frame - 50, fps, config: { damping: 20 } }),
            fontFamily: "sans-serif",
            marginTop: 20,
          }}
        >
          פשוט. מסודר. מקצועי.
        </div>
      </div>
    </AbsoluteFill>
  );
};

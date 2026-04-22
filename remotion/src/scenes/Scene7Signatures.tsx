import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene7Signatures = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });
  const sigProgress = interpolate(frame, [45, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const checkS = spring({ frame: frame - 110, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#ec4899",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 800, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
        }}>6</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          חתימה דיגיטלית
        </div>
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.5)", marginBottom: 36, fontFamily: "sans-serif", opacity: titleS }}>
        הלקוח חותם ישירות בפורטל — בלי הדפסה, בלי סריקה
      </div>

      <div style={{ display: "flex", gap: 50, alignItems: "center" }}>
        <div style={{
          flex: 1.2, background: "rgba(255,255,255,0.06)", borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)", padding: 32,
          opacity: spring({ frame: frame - 12, fps, config: { damping: 20 } }),
        }}>
          <div style={{ fontSize: 24, color: "#ec4899", fontWeight: 700, marginBottom: 16, fontFamily: "sans-serif" }}>
            📜 הצהרת לקוח
          </div>
          {[1, 2, 3].map((line) => (
            <div key={line} style={{
              height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 4, marginBottom: 12,
              width: `${95 - line * 12}%`,
            }} />
          ))}
          <div style={{
            marginTop: 24, border: "2px dashed rgba(236,72,153,0.3)", borderRadius: 12,
            padding: 20, height: 80, position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 6, right: 14, fontSize: 18, color: "rgba(255,255,255,0.3)", fontFamily: "sans-serif" }}>
              חתימה:
            </div>
            <svg width="100%" height="100%" viewBox="0 0 300 50" style={{ position: "absolute", top: 14, left: 0 }}>
              <path d="M 20 35 Q 50 8, 90 30 T 170 25 T 250 30" stroke="#ec4899" strokeWidth="3" fill="none"
                strokeDasharray="280" strokeDashoffset={interpolate(sigProgress, [0, 1], [280, 0])} strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div style={{ flex: 0.7 }}>
          <div style={{
            opacity: checkS, transform: `scale(${checkS})`,
            background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: 16, padding: "32px 28px", textAlign: "center",
          }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#34d399", fontFamily: "sans-serif", marginBottom: 10 }}>
              נחתם בהצלחה!
            </div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.45)", fontFamily: "sans-serif" }}>
              החתימה מוטמעת ב-PDF אוטומטית
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

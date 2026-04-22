import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { StepNumber } from "../components/StepNumber";

export const Scene5Signatures = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  // Signature animation
  const sigProgress = interpolate(frame, [50, 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const checkS = spring({ frame: frame - 105, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 160px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
        <StepNumber num="4" color="#ec4899" delay={0} />
        <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          חתימה דיגיטלית
        </div>
      </div>
      <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)", marginBottom: 40, fontFamily: "sans-serif", opacity: titleS }}>
        הלקוח חותם על מסמכי הצהרה ישירות מהפורטל
      </div>

      <div style={{ display: "flex", gap: 50, alignItems: "center" }}>
        {/* Document preview */}
        <div
          style={{
            flex: 1,
            background: "rgba(255,255,255,0.06)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.1)",
            padding: 32,
            opacity: spring({ frame: frame - 15, fps, config: { damping: 20 } }),
          }}
        >
          <div style={{ fontSize: 20, color: "#ec4899", fontWeight: 700, marginBottom: 16, fontFamily: "sans-serif" }}>
            📜 הצהרת לקוח
          </div>
          {[1, 2, 3].map((line) => (
            <div
              key={line}
              style={{
                height: 10,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 4,
                marginBottom: 12,
                width: `${90 - line * 10}%`,
              }}
            />
          ))}
          {/* Signature area */}
          <div
            style={{
              marginTop: 24,
              border: "2px dashed rgba(236,72,153,0.3)",
              borderRadius: 10,
              padding: 20,
              height: 80,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <svg width="100%" height="100%" viewBox="0 0 300 60" style={{ position: "absolute", top: 0, left: 0 }}>
              <path
                d="M 20 40 Q 60 10, 100 35 T 180 30 T 260 35"
                stroke="#ec4899"
                strokeWidth="3"
                fill="none"
                strokeDasharray="300"
                strokeDashoffset={interpolate(sigProgress, [0, 1], [300, 0])}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Status */}
        <div style={{ flex: 0.6 }}>
          <div
            style={{
              opacity: checkS,
              transform: `scale(${checkS})`,
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 16,
              padding: "32px 28px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#34d399", fontFamily: "sans-serif" }}>
              המסמך נחתם בהצלחה!
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

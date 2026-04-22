import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { StepNumber } from "../components/StepNumber";

const docs = [
  { name: "תלוש שכר", status: "הועלה", color: "#3b82f6" },
  { name: "צילום ת.ז", status: "תקין", color: "#10b981" },
  { name: "אישור יתרה", status: "חסר", color: "#ef4444" },
  { name: "דו״ח בנק", status: "חסר", color: "#ef4444" },
];

export const Scene4ClientPortal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 160px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
        <StepNumber num="3" color="#8b5cf6" delay={0} />
        <div style={{ fontSize: 48, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          פורטל הלקוח
        </div>
      </div>
      <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)", marginBottom: 36, fontFamily: "sans-serif", opacity: titleS }}>
        הלקוח מקבל לינק, רואה את המסמכים הנדרשים ומעלה אותם
      </div>

      {/* Mock portal */}
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.1)",
          padding: 32,
          maxWidth: 900,
        }}
      >
        {/* Progress bar */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 16, fontFamily: "sans-serif" }}>התקדמות</span>
            <span style={{ color: "#8b5cf6", fontSize: 16, fontWeight: 700, fontFamily: "sans-serif" }}>50%</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 8, height: 10, overflow: "hidden" }}>
            <div
              style={{
                width: `${interpolate(frame, [30, 70], [0, 50], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`,
                height: "100%",
                background: "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                borderRadius: 8,
              }}
            />
          </div>
        </div>

        {/* Document rows */}
        {docs.map((doc, i) => {
          const s = spring({ frame: frame - 25 - i * 12, fps, config: { damping: 18 } });
          return (
            <div
              key={doc.name}
              style={{
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                background: "rgba(255,255,255,0.04)",
                borderRadius: 10,
                marginBottom: 10,
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span style={{ fontSize: 20, color: "#fff", fontFamily: "sans-serif" }}>{doc.name}</span>
              <span
                style={{
                  fontSize: 15,
                  color: doc.color,
                  background: `${doc.color}1a`,
                  padding: "4px 14px",
                  borderRadius: 20,
                  fontWeight: 600,
                  fontFamily: "sans-serif",
                }}
              >
                {doc.status}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

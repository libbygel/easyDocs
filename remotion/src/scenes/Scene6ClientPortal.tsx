import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

const docs = [
  { name: "טופס 106", status: "הועלה", color: "#3b82f6" },
  { name: "תעודת זהות", status: "תקין", color: "#10b981" },
  { name: "אישורי ניכוי מס", status: "חסר", color: "#ef4444" },
  { name: "אישור הפקדות לפנסיה", status: "חסר", color: "#ef4444" },
  { name: "ייפוי כוח לרשויות המס", status: "ממתין לחתימה", color: "#f59e0b" },
];

export const Scene6ClientPortal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });
  const progress = interpolate(frame, [30, 90], [0, 40], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const notifS = spring({ frame: frame - 100, fps, config: { damping: 12 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#8b5cf6",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 800, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
        }}>5</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          פורטל הלקוח
        </div>
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.5)", marginBottom: 32, fontFamily: "sans-serif", opacity: titleS }}>
        הלקוח מקבל לינק → רואה מה נדרש → מעלה מסמכים
      </div>

      <div style={{ display: "flex", gap: 40 }}>
        <div style={{
          flex: 1.5, background: "rgba(255,255,255,0.05)", borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.1)", padding: 28,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 20, fontFamily: "sans-serif" }}>התקדמות</span>
            <span style={{ color: "#8b5cf6", fontSize: 20, fontWeight: 700, fontFamily: "sans-serif" }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 8, height: 10, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #8b5cf6, #a78bfa)", borderRadius: 8 }} />
          </div>
          {docs.map((doc, i) => {
            const s = spring({ frame: frame - 25 - i * 12, fps, config: { damping: 18 } });
            return (
              <div key={doc.name} style={{
                opacity: s, transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px)`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 18px", background: "rgba(255,255,255,0.04)",
                borderRadius: 10, marginBottom: 8, border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <span style={{ fontSize: 22, color: "#fff", fontFamily: "sans-serif" }}>{doc.name}</span>
                <span style={{
                  fontSize: 18, color: doc.color, background: `${doc.color}1a`,
                  padding: "4px 14px", borderRadius: 20, fontWeight: 600, fontFamily: "sans-serif",
                }}>{doc.status}</span>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 0.8, display: "flex", alignItems: "center" }}>
          <div style={{
            opacity: notifS, transform: `scale(${notifS})`,
            background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)",
            borderRadius: 16, padding: "28px 24px", textAlign: "center", width: "100%",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#a78bfa", fontFamily: "sans-serif", marginBottom: 10 }}>
              היועץ מקבל התראה!
            </div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.5)", fontFamily: "sans-serif", lineHeight: 1.6 }}>
              כשלקוח מעלה מסמך —
              <br />
              היועץ מיד יודע
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

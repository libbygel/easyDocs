import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

const caseTypes = [
  { name: "משכנתא חדשה", docs: ["תלוש שכר", "צילום ת.ז", "אישור יתרה", "דו״ח בנק"], color: "#f59e0b" },
  { name: "הלוואה שיקלית", docs: ["תלוש שכר", "צילום ת.ז", "אישור הכנסות"], color: "#3b82f6" },
  { name: "מחזור משכנתא", docs: ["נסח טאבו", "דו״ח יתרות", "תלוש שכר", "שומת נכס"], color: "#10b981" },
  { name: "רכישה מקבלן", docs: ["חוזה רכישה", "תלוש שכר", "צילום ת.ז"], color: "#8b5cf6" },
];

export const Scene2Templates = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#f59e0b",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 800, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
          boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
        }}>1</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          יצירת תבניות לפי סוגי תיקים
        </div>
      </div>
      <div style={{ fontSize: 28, color: "rgba(255,255,255,0.6)", opacity: titleS, lineHeight: 1.8, fontFamily: "sans-serif", marginBottom: 32 }}>
        לכל סוג תיק — תבנית עם רשימת מסמכים מוכנה מראש!
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {caseTypes.map((ct, i) => {
          const s = spring({ frame: frame - 20 - i * 12, fps, config: { damping: 18 } });
          return (
            <div key={ct.name} style={{
              opacity: s, transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
              background: `${ct.color}15`, border: `1px solid ${ct.color}40`,
              borderRadius: 16, padding: "20px 24px",
            }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: ct.color, fontFamily: "sans-serif", marginBottom: 12 }}>
                📁 {ct.name}
              </div>
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", fontFamily: "sans-serif", marginBottom: 8 }}>
                מסמכים נדרשים:
              </div>
              {ct.docs.map((doc, j) => (
                <div key={doc} style={{
                  fontSize: 20, color: "rgba(255,255,255,0.8)", fontFamily: "sans-serif",
                  padding: "4px 0", display: "flex", alignItems: "center", gap: 8,
                }}>
                  <span style={{ color: ct.color }}>📄</span> {doc}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

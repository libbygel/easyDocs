import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene4AddDocs = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  const templateDocs = ["טופס 106", "אישורי ניכוי מס", "תעודת זהות", "אישור הפקדות לפנסיה"];
  const extraDocs = [
    { name: "אישור תרומות", type: "בקשה מהלקוח" },
    { name: "ייפוי כוח לרשויות המס", type: "לחתימה" },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#6366f1",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 800, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
        }}>3</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          הוספת מסמכים נוספים לתיק
        </div>
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.55)", marginBottom: 36, fontFamily: "sans-serif", opacity: titleS }}>
        בתיק הלקוח הספציפי — אפשר להוסיף מסמכים מעבר לתבנית!
      </div>

      <div style={{ display: "flex", gap: 40 }}>
        {/* Template docs */}
        <div style={{ flex: 1, opacity: spring({ frame: frame - 15, fps, config: { damping: 20 } }) }}>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", marginBottom: 14, fontFamily: "sans-serif" }}>
            מסמכים מהתבנית (אוטומטי):
          </div>
          {templateDocs.map((doc) => (
            <div key={doc} style={{
              background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 18px",
              marginBottom: 8, fontSize: 22, color: "rgba(255,255,255,0.6)", fontFamily: "sans-serif",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <span>📄</span> {doc}
            </div>
          ))}
        </div>

        <div style={{
          display: "flex", alignItems: "center",
          opacity: spring({ frame: frame - 50, fps, config: { damping: 14 } }),
          fontSize: 48, color: "#818cf8",
        }}>+</div>

        {/* Extra docs */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", marginBottom: 14, fontFamily: "sans-serif" }}>
            מסמכים שנוספו ידנית:
          </div>
          {extraDocs.map((doc, i) => {
            const s = spring({ frame: frame - 60 - i * 14, fps, config: { damping: 15 } });
            return (
              <div key={doc.name} style={{
                opacity: s, transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
                background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: 12, padding: "14px 20px", marginBottom: 10,
              }}>
                <div style={{ fontSize: 24, color: "#a5b4fc", fontFamily: "sans-serif", fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
                  <span>➕</span> {doc.name}
                </div>
                <div style={{ fontSize: 18, color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif", marginTop: 4 }}>
                  סוג: {doc.type}
                </div>
              </div>
            );
          })}
          <div style={{
            opacity: spring({ frame: frame - 95, fps, config: { damping: 18 } }),
            fontSize: 20, color: "rgba(255,255,255,0.45)", marginTop: 16, fontFamily: "sans-serif",
            background: "rgba(99,102,241,0.08)", borderRadius: 10, padding: "12px 16px",
          }}>
            💡 גם מסמכים לחתימה וגם מסמכים להעלאה
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

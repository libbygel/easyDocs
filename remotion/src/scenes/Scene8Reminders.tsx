import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene8Reminders = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  const emails = [
    { client: "ישראל ישראלי", docs: "טופס 106, אישורי ניכוי מס", time: "לפני 3 ימים" },
    { client: "רחל כהן", docs: "אישור הפקדות לפנסיה", time: "לפני 5 ימים" },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#f97316",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 800, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
        }}>7</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          תזכורות אוטומטיות
        </div>
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.5)", marginBottom: 40, fontFamily: "sans-serif", opacity: titleS }}>
        המערכת שולחת תזכורות ללקוחות על מסמכים חסרים — בלי שתצטרכו לעקוב!
      </div>

      <div style={{ display: "flex", gap: 40 }}>
        <div style={{ flex: 1.3 }}>
          {emails.map((email, i) => {
            const s = spring({ frame: frame - 25 - i * 20, fps, config: { damping: 16 } });
            return (
              <div key={email.client} style={{
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [50, 0])}px)`,
                background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.25)",
                borderRadius: 16, padding: "24px 28px", marginBottom: 16,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: "#fb923c", fontFamily: "sans-serif" }}>
                    📧 תזכורת ל{email.client}
                  </span>
                  <span style={{ fontSize: 18, color: "rgba(255,255,255,0.35)", fontFamily: "sans-serif" }}>
                    לא העלה {email.time}
                  </span>
                </div>
                <div style={{ fontSize: 20, color: "rgba(255,255,255,0.55)", fontFamily: "sans-serif" }}>
                  מסמכים חסרים: {email.docs}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 0.7, display: "flex", alignItems: "center" }}>
          <div style={{
            opacity: spring({ frame: frame - 65, fps, config: { damping: 14 } }),
            background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)",
            borderRadius: 16, padding: "28px 24px", textAlign: "center", width: "100%",
          }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🤖</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#fb923c", fontFamily: "sans-serif", marginBottom: 10 }}>
              הכל אוטומטי!
            </div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.45)", fontFamily: "sans-serif", lineHeight: 1.6 }}>
              תזכורות נשלחות כשלקוח
              <br />
              לא העלה מסמכים
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

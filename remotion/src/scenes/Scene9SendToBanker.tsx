import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene9SendToBanker = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });
  const sendS = spring({ frame: frame - 85, fps, config: { damping: 14 } });

  const docs = ["טופס 106", "תעודת זהות", "אישורי ניכוי מס", "ייפוי כוח חתום"];

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#14b8a6",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 800, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
        }}>8</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          שליחה לביטוח לאומי / כל גורם
        </div>
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.5)", marginBottom: 36, fontFamily: "sans-serif", opacity: titleS }}>
        בחרו מסמכים → בחרו נמען (ביטוח לאומי, רו״ח, כל גורם) → שלחו מייל מסודר!
      </div>

      <div style={{ display: "flex", gap: 40 }}>
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)", padding: 28,
          opacity: spring({ frame: frame - 12, fps, config: { damping: 20 } }),
        }}>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", marginBottom: 14, fontFamily: "sans-serif" }}>
            בחירת מסמכים לשליחה:
          </div>
          {docs.map((doc, i) => {
            const checked = spring({ frame: frame - 20 - i * 10, fps, config: { damping: 18 } });
            return (
              <div key={doc} style={{
                opacity: checked, display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", background: "rgba(20,184,166,0.08)",
                borderRadius: 10, marginBottom: 8, border: "1px solid rgba(20,184,166,0.15)",
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 4, background: "#14b8a6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: "#fff",
                }}>✓</div>
                <span style={{ fontSize: 22, color: "rgba(255,255,255,0.8)", fontFamily: "sans-serif" }}>{doc}</span>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 0.8, display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
          <div style={{
            opacity: spring({ frame: frame - 60, fps, config: { damping: 20 } }),
            background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <div style={{ fontSize: 18, color: "rgba(255,255,255,0.4)", marginBottom: 8, fontFamily: "sans-serif" }}>
              נמען:
            </div>
            <div style={{ fontSize: 24, color: "#fff", fontFamily: "sans-serif" }}>
              ביטוח לאומי — claims@btl.gov.il
            </div>
          </div>

          <div style={{
            opacity: sendS, transform: `scale(${sendS})`,
            background: "rgba(20,184,166,0.2)", border: "1px solid rgba(20,184,166,0.4)",
            borderRadius: 16, padding: "28px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>📨</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#2dd4bf", fontFamily: "sans-serif" }}>
              נשלח בהצלחה!
            </div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.45)", fontFamily: "sans-serif", marginTop: 8 }}>
              4 קבצים צורפו למייל
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

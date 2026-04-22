import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene3CreateCase = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });
  const arrowS = spring({ frame: frame - 60, fps, config: { damping: 14 } });
  const resultS = spring({ frame: frame - 80, fps, config: { damping: 16 } });

  const autoDocs = ["תלוש שכר", "צילום ת.ז", "אישור יתרה", "דו״ח בנק"];

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 32 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#10b981",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 800, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
        }}>2</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          פתיחת תיק לקוח + בחירת תבנית
        </div>
      </div>
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        {/* Form */}
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)", padding: "28px 32px",
          opacity: spring({ frame: frame - 10, fps, config: { damping: 20 } }),
        }}>
          {[
            { label: "לקוח", value: "ישראל ישראלי" },
            { label: "סוג תיק (תבנית)", value: "🔽 משכנתא חדשה" },
            { label: "שם התיק", value: "משכנתא - ישראל" },
          ].map((item, i) => {
            const s = spring({ frame: frame - 15 - i * 10, fps, config: { damping: 20 } });
            return (
              <div key={item.label} style={{ opacity: s, marginBottom: 20 }}>
                <div style={{ fontSize: 20, color: "rgba(255,255,255,0.45)", marginBottom: 6, fontFamily: "sans-serif" }}>{item.label}</div>
                <div style={{
                  background: "rgba(255,255,255,0.08)", borderRadius: 8,
                  padding: "12px 18px", fontSize: 24, color: "#fff", fontFamily: "sans-serif",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}>{item.value}</div>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 52, color: "#10b981", opacity: arrowS, transform: `scale(${arrowS})` }}>←</div>

        {/* Result */}
        <div style={{
          flex: 1, opacity: resultS, background: "rgba(16,185,129,0.12)",
          border: "1px solid rgba(16,185,129,0.3)", borderRadius: 16, padding: "28px 24px",
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#34d399", marginBottom: 16, fontFamily: "sans-serif" }}>
            ✅ התיק נוצר!
          </div>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)", marginBottom: 14, fontFamily: "sans-serif" }}>
            מסמכים שנוצרו אוטומטית מהתבנית:
          </div>
          {autoDocs.map((doc, i) => {
            const ds = spring({ frame: frame - 90 - i * 6, fps, config: { damping: 18 } });
            return (
              <div key={doc} style={{
                opacity: ds, fontSize: 22, color: "rgba(255,255,255,0.8)",
                padding: "6px 0", fontFamily: "sans-serif", display: "flex", gap: 8, alignItems: "center",
              }}>
                <span style={{ color: "#34d399" }}>📄</span> {doc}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

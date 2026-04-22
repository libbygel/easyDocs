import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene5AdvisorUpload = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });
  const uploadProgress = interpolate(frame, [40, 75], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const autoSign = spring({ frame: frame - 85, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#0ea5e9",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 800, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
        }}>4</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          היועץ מעלה מסמך לחתימה
        </div>
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.55)", marginBottom: 40, fontFamily: "sans-serif", opacity: titleS }}>
        העלו PDF — המערכת מוסיפה אוטומטית עמוד חתימה!
      </div>

      <div style={{ display: "flex", gap: 50, alignItems: "center" }}>
        <div style={{
          flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)", padding: 28,
          opacity: spring({ frame: frame - 12, fps, config: { damping: 20 } }),
        }}>
          <div style={{ fontSize: 24, color: "#38bdf8", fontWeight: 600, marginBottom: 18, fontFamily: "sans-serif" }}>
            📎 העלאת הצהרת לקוח.pdf
          </div>
          <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, height: 12, overflow: "hidden" }}>
            <div style={{ width: `${uploadProgress}%`, height: "100%", background: "linear-gradient(90deg, #0ea5e9, #38bdf8)", borderRadius: 8 }} />
          </div>
          <div style={{ marginTop: 14, fontSize: 20, color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif", opacity: uploadProgress >= 100 ? 1 : 0 }}>
            ✅ הועלה בהצלחה
          </div>
        </div>

        <div style={{ fontSize: 48, color: "#0ea5e9", opacity: autoSign, transform: `scale(${autoSign})` }}>←</div>

        <div style={{
          flex: 1, opacity: autoSign,
          background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.3)",
          borderRadius: 16, padding: 28, textAlign: "center",
        }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🪄</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#38bdf8", marginBottom: 12, fontFamily: "sans-serif" }}>
            עמוד חתימה נוסף אוטומטית!
          </div>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, fontFamily: "sans-serif" }}>
            המסמך מוכן לחתימת הלקוח
            <br />
            דרך הפורטל האישי
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

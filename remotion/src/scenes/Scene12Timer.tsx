import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene12Timer = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  // Timer running counter — starts at frame 30, runs to frame 150.
  // Maps to 0:00 → 1:43:20 (display)
  const tSeconds = Math.max(0, Math.floor(interpolate(frame, [30, 160], [0, 6200], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const hh = Math.floor(tSeconds / 3600);
  const mm = Math.floor((tSeconds % 3600) / 60);
  const ss = tSeconds % 60;
  const formatted = `${hh}:${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;

  const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * 4);

  const entries = [
    { date: "12/04", desc: "הכנת דוח שנתי", dur: "1:45:00" },
    { date: "10/04", desc: "פגישה עם הלקוח", dur: "0:50:00" },
    { date: "08/04", desc: "סקירת מסמכים", dur: "0:35:00" },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#8b5cf6",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
          boxShadow: "0 8px 32px rgba(139,92,246,0.4)",
        }}>⏱</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          מעקב זמן עבודה
        </div>
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.5)", marginBottom: 30, opacity: titleS, fontFamily: "sans-serif" }}>
        טיימר ידני או אוטומטי לכל תיק — וחישוב כדאיות לפי תעריף שעתי
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 28 }}>
        {/* Live timer */}
        <div style={{
          background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: 18, padding: 28, textAlign: "center",
          opacity: spring({ frame: frame - 20, fps, config: { damping: 18 } }),
        }}>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", fontFamily: "sans-serif", marginBottom: 14 }}>
            טיימר פעיל — תיק החזר מס 2024
          </div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 16,
            marginBottom: 14,
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: "50%", background: "#ef4444",
              opacity: pulse, boxShadow: "0 0 16px #ef4444",
            }} />
            <span style={{ fontSize: 18, color: "#ef4444", fontFamily: "sans-serif" }}>● REC</span>
          </div>
          <div style={{
            fontSize: 96, fontWeight: 800, color: "#fff",
            fontVariantNumeric: "tabular-nums", letterSpacing: 2,
            fontFamily: "sans-serif",
          }}>
            {formatted}
          </div>
          <div style={{
            marginTop: 18, opacity: spring({ frame: frame - 100, fps, config: { damping: 20 } }),
            fontSize: 22, color: "rgba(255,255,255,0.7)", fontFamily: "sans-serif",
          }}>
            תעריף שעתי: ₪350 • שווי עבודה: <span style={{ color: "#4ade80", fontWeight: 700 }}>
              ₪{Math.round((tSeconds / 3600) * 350).toLocaleString()}
            </span>
          </div>
        </div>

        {/* History */}
        <div style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18, padding: 24,
          opacity: spring({ frame: frame - 60, fps, config: { damping: 20 } }),
        }}>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.5)", fontFamily: "sans-serif", marginBottom: 14 }}>
            רישומי זמן אחרונים
          </div>
          {entries.map((e, i) => {
            const s = spring({ frame: frame - 70 - i * 10, fps, config: { damping: 18 } });
            return (
              <div key={e.desc} style={{
                opacity: s, transform: `translateX(${interpolate(s, [0, 1], [-20, 0])}px)`,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div>
                  <div style={{ fontSize: 20, color: "#fff", fontFamily: "sans-serif" }}>{e.desc}</div>
                  <div style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif" }}>{e.date}/2025</div>
                </div>
                <div style={{ fontSize: 24, color: "#a78bfa", fontWeight: 700, fontVariantNumeric: "tabular-nums", fontFamily: "sans-serif" }}>
                  {e.dur}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
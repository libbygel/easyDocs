import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene13ClientArea = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  const tabs = [
    { label: "תיקים", icon: "📁" },
    { label: "סיכום פיננסי", icon: "💳" },
    { label: "זמן עבודה", icon: "⏱" },
    { label: "פעילות", icon: "📜" },
  ];
  // Cycle through tabs over time
  const activeTab = Math.min(3, Math.floor(Math.max(0, frame - 30) / 38));

  const cases = [
    { title: "החזר מס 2024", status: "בטיפול", pct: 75 },
    { title: "דוח שנתי שכיר", status: "פעיל", pct: 40 },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#06b6d4",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
          boxShadow: "0 8px 32px rgba(6,182,212,0.4)",
        }}>👁</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          פורטל לקוח — צפייה בלבד
        </div>
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.5)", marginBottom: 24, opacity: titleS, fontFamily: "sans-serif" }}>
        ללקוח — תצוגה מלאה של כל התיקים, ללא יכולת עריכה
      </div>

      {/* Browser-like card */}
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18, padding: 22,
        opacity: spring({ frame: frame - 15, fps, config: { damping: 20 } }),
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          {tabs.map((t, i) => {
            const isActive = i === activeTab;
            return (
              <div key={t.label} style={{
                flex: 1, textAlign: "center",
                padding: "12px 14px", borderRadius: 12,
                background: isActive ? "rgba(6,182,212,0.18)" : "rgba(255,255,255,0.04)",
                border: isActive ? "1px solid rgba(6,182,212,0.5)" : "1px solid rgba(255,255,255,0.06)",
                color: isActive ? "#67e8f9" : "rgba(255,255,255,0.5)",
                fontSize: 22, fontFamily: "sans-serif", fontWeight: isActive ? 700 : 400,
                transition: "none",
              }}>
                {t.icon} {t.label}
              </div>
            );
          })}
        </div>

        {/* Tab content area — show cases */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {cases.map((c, i) => {
            const s = spring({ frame: frame - 30 - i * 10, fps, config: { damping: 18 } });
            const pctVal = interpolate(frame, [40 + i * 10, 110 + i * 10], [0, c.pct], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={c.title} style={{
                opacity: s, transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, padding: 18,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 24, color: "#fff", fontWeight: 700, fontFamily: "sans-serif" }}>{c.title}</div>
                  <div style={{
                    fontSize: 16, padding: "4px 12px", borderRadius: 999,
                    background: "rgba(245,158,11,0.15)", color: "#fbbf24", fontFamily: "sans-serif",
                  }}>{c.status}</div>
                </div>
                <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pctVal}%`,
                    background: "linear-gradient(90deg,#06b6d4,#3b82f6)",
                  }} />
                </div>
                <div style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", marginTop: 8, fontFamily: "sans-serif" }}>
                  {Math.round(pctVal)}% הושלם
                </div>
              </div>
            );
          })}
        </div>

        {/* Mini summary row */}
        <div style={{
          marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
          opacity: spring({ frame: frame - 90, fps, config: { damping: 20 } }),
        }}>
          {[
            { label: "סה״כ חיובים", val: "₪2,900", color: "#60a5fa" },
            { label: "תשלומים", val: "₪2,300", color: "#4ade80" },
            { label: "זמן עבודה", val: "3:10:00", color: "#a78bfa" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", fontFamily: "sans-serif" }}>{s.label}</div>
              <div style={{ fontSize: 26, color: s.color, fontWeight: 700, fontFamily: "sans-serif", fontVariantNumeric: "tabular-nums" }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene14SmartCase = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });

  const tabs = [
    { label: "מסמכים", icon: "📄", count: 12 },
    { label: "משימות", icon: "✅", count: 4 },
    { label: "חיובים", icon: "💳", count: 3 },
    { label: "פעילות", icon: "📜", count: 27 },
  ];
  const activeTab = Math.min(3, Math.floor(Math.max(0, frame - 25) / 38));

  // Activity timeline items (RTL-safe)
  const activity = [
    { t: "10:42", txt: "הלקוח העלה תלוש שכר 11/2024", color: "#4ade80" },
    { t: "09:15", txt: "תזכורת אוטומטית נשלחה ללקוח", color: "#fbbf24" },
    { t: "אתמול", txt: "טופס 161 נחתם דיגיטלית", color: "#06b6d4" },
    { t: "אתמול", txt: "חיוב חדש: ₪850 — ייעוץ ראשוני", color: "#a78bfa" },
  ];

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14 }}>
        <div style={{
          width: 70, height: 70, borderRadius: 18, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
          boxShadow: "0 8px 32px rgba(59,130,246,0.45)",
        }}>🗂</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          ניהול תיקים חכם
        </div>
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.55)", marginBottom: 24, opacity: titleS, fontFamily: "sans-serif" }}>
        כל המידע של הלקוח במקום אחד — משימות, חיובים, מסמכים והיסטוריית פעילות.
      </div>

      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 18, padding: 22,
        opacity: spring({ frame: frame - 12, fps, config: { damping: 20 } }),
      }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
          {tabs.map((t, i) => {
            const isActive = i === activeTab;
            return (
              <div key={t.label} style={{
                flex: 1, textAlign: "center", padding: "12px 14px", borderRadius: 12,
                background: isActive ? "rgba(139,92,246,0.18)" : "rgba(255,255,255,0.04)",
                border: isActive ? "1px solid rgba(139,92,246,0.55)" : "1px solid rgba(255,255,255,0.06)",
                color: isActive ? "#c4b5fd" : "rgba(255,255,255,0.55)",
                fontSize: 22, fontFamily: "sans-serif", fontWeight: isActive ? 700 : 400,
              }}>
                {t.icon} {t.label} <span style={{ opacity: 0.6, fontSize: 18 }}>({t.count})</span>
              </div>
            );
          })}
        </div>

        {/* Two columns: KPIs + Activity */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 18 }}>
          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 14 }}>
            {[
              { label: "מסמכים שהתקבלו", val: "12 / 15", pct: 80, color: "#4ade80" },
              { label: "חיובים פתוחים", val: "₪1,400", pct: 35, color: "#fbbf24" },
            ].map((k, i) => {
              const s = spring({ frame: frame - 25 - i * 8, fps, config: { damping: 18 } });
              const pctVal = interpolate(frame, [35 + i * 10, 100 + i * 10], [0, k.pct], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={k.label} style={{
                  opacity: s, transform: `translateY(${interpolate(s, [0, 1], [16, 0])}px)`,
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14, padding: 18,
                }}>
                  <div style={{ fontSize: 20, color: "rgba(255,255,255,0.55)", fontFamily: "sans-serif", marginBottom: 6 }}>{k.label}</div>
                  <div style={{ fontSize: 36, color: k.color, fontWeight: 800, fontFamily: "sans-serif", fontVariantNumeric: "tabular-nums", marginBottom: 10 }}>{k.val}</div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pctVal}%`, background: k.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Activity list */}
          <div style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: 18,
          }}>
            <div style={{ fontSize: 22, color: "#fff", fontWeight: 700, marginBottom: 14, fontFamily: "sans-serif" }}>
              📜 היסטוריית פעילות
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activity.map((a, i) => {
                const s = spring({ frame: frame - 45 - i * 12, fps, config: { damping: 18 } });
                return (
                  <div key={i} style={{
                    opacity: s, transform: `translateX(${interpolate(s, [0, 1], [-20, 0])}px)`,
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 12px", borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.color, flexShrink: 0 }} />
                    <div style={{ fontSize: 18, color: a.color, fontFamily: "sans-serif", fontWeight: 600, minWidth: 60 }}>{a.t}</div>
                    <div style={{ fontSize: 20, color: "rgba(255,255,255,0.85)", fontFamily: "sans-serif" }}>{a.txt}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

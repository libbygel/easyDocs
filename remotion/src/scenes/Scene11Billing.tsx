import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const Scene11Billing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleS = spring({ frame: frame - 5, fps, config: { damping: 20 } });
  const balanceS = spring({ frame: frame - 90, fps, config: { damping: 14 } });

  const charges = [
    { desc: "יעוץ ראשוני", amt: 800 },
    { desc: "טיפול בדוח שנתי", amt: 1500 },
    { desc: "הגשה למס הכנסה", amt: 600 },
  ];
  const payments = [
    { desc: "העברה בנקאית", amt: 1500 },
    { desc: "אשראי", amt: 800 },
  ];
  const totalCharged = charges.reduce((s, c) => s + c.amt, 0);
  const totalPaid = payments.reduce((s, p) => s + p.amt, 0);
  const balance = totalCharged - totalPaid;

  const counter = (target: number, startFrame: number) =>
    Math.round(interpolate(frame, [startFrame, startFrame + 30], [0, target], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 100px", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#22c55e",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, color: "#fff",
          transform: `scale(${spring({ frame, fps, config: { damping: 12 } })})`,
          boxShadow: "0 8px 32px rgba(34,197,94,0.4)",
        }}>₪</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: "#fff", opacity: titleS, fontFamily: "sans-serif" }}>
          ניהול חיובים ותשלומים
        </div>
      </div>
      <div style={{ fontSize: 26, color: "rgba(255,255,255,0.5)", marginBottom: 30, opacity: titleS, fontFamily: "sans-serif" }}>
        רישום חיובים ותשלומים לכל תיק — יתרה מעודכנת בזמן אמת
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div style={{
          background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 16, padding: 22,
          opacity: spring({ frame: frame - 15, fps, config: { damping: 20 } }),
        }}>
          <div style={{ fontSize: 22, color: "#60a5fa", fontFamily: "sans-serif", marginBottom: 12 }}>📋 חיובים</div>
          {charges.map((c, i) => {
            const s = spring({ frame: frame - 25 - i * 8, fps, config: { damping: 18 } });
            return (
              <div key={c.desc} style={{
                opacity: s, display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 22, color: "rgba(255,255,255,0.85)", fontFamily: "sans-serif",
              }}>
                <span>{c.desc}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>₪{c.amt.toLocaleString()}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 12, fontSize: 24, fontWeight: 700, color: "#60a5fa", display: "flex", justifyContent: "space-between", fontFamily: "sans-serif" }}>
            <span>סה״כ</span><span style={{ fontVariantNumeric: "tabular-nums" }}>₪{totalCharged.toLocaleString()}</span>
          </div>
        </div>

        <div style={{
          background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 16, padding: 22,
          opacity: spring({ frame: frame - 50, fps, config: { damping: 20 } }),
        }}>
          <div style={{ fontSize: 22, color: "#4ade80", fontFamily: "sans-serif", marginBottom: 12 }}>✅ תשלומים</div>
          {payments.map((p, i) => {
            const s = spring({ frame: frame - 60 - i * 8, fps, config: { damping: 18 } });
            return (
              <div key={p.desc} style={{
                opacity: s, display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)",
                fontSize: 22, color: "rgba(255,255,255,0.85)", fontFamily: "sans-serif",
              }}>
                <span>{p.desc}</span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>₪{p.amt.toLocaleString()}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 12, fontSize: 24, fontWeight: 700, color: "#4ade80", display: "flex", justifyContent: "space-between", fontFamily: "sans-serif" }}>
            <span>סה״כ</span><span style={{ fontVariantNumeric: "tabular-nums" }}>₪{totalPaid.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div style={{
        opacity: balanceS, transform: `scale(${interpolate(balanceS, [0, 1], [0.85, 1])})`,
        background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)",
        borderRadius: 16, padding: "22px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 30, color: "#fff", fontWeight: 700, fontFamily: "sans-serif" }}>יתרה לתשלום</span>
        <span style={{ fontSize: 44, color: "#fbbf24", fontWeight: 800, fontVariantNumeric: "tabular-nums", fontFamily: "sans-serif" }}>
          ₪{counter(balance, 90).toLocaleString()}
        </span>
      </div>
    </AbsoluteFill>
  );
};
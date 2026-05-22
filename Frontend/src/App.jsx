import { useState, useEffect, useCallback } from "react";
import { predictWaterUsage, checkHealth, fetchHistory, fetchStats } from "./api";

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #060d0f;
    --surface:   #0c1a1e;
    --border:    #1a2e33;
    --border2:   #213a40;
    --text:      #d4eaed;
    --muted:     #4a7a82;
    --accent:    #00e5b0;
    --accent2:   #00b8d9;
    --warn:      #f59e0b;
    --danger:    #ef4444;
    --good:      #22c55e;
    --font-head: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
    --r:         12px;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-body); }

  input, select {
    background: #0a1a1e;
    border: 1.5px solid var(--border2);
    border-radius: 8px;
    color: var(--text);
    font-family: var(--font-body);
    font-size: 14px;
    padding: 11px 14px;
    width: 100%;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  input:focus, select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px #00e5b015;
  }
  input::placeholder { color: var(--muted); }
  select option { background: #0c1a1e; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(1);   opacity: .6; }
    100% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  @keyframes countUp {
    from { opacity: 0; transform: scale(0.7); }
    to   { opacity: 1; transform: scale(1); }
  }

  .fade-up { animation: fadeUp 0.4s ease forwards; }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
`;

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const FIELDS = [
  { key: "Number-Of-People",          label: "People in household",       icon: "👥", min: 1,  max: 20,  default: 3  },
  { key: "Number-Of-Showers",         label: "Showers in home",           icon: "🚿", min: 1,  max: 10,  default: 2  },
  { key: "Number-Of-Toilets",         label: "Toilets in home",           icon: "🚽", min: 1,  max: 10,  default: 2  },
  { key: "Showers-Per-Week",          label: "Showers per week (total)",  icon: "📅", min: 1,  max: 70,  default: 14 },
  { key: "Shower-Duration-Minutes",   label: "Avg shower duration (mins)",icon: "⏱️", min: 1,  max: 60,  default: 8  },
  { key: "Washing-Machine-Per-Week",  label: "Washing machine per week",  icon: "🧺", min: 0,  max: 21,  default: 4  },
  { key: "Dishwasher-Per-Week",       label: "Dishwasher uses per week",  icon: "🍽️", min: 0,  max: 21,  default: 3  },
  { key: "Boil-Water-Per-Week",       label: "Boiling water per week",    icon: "♨️", min: 0,  max: 50,  default: 7  },
  { key: "Bath-Frequency-Per-Week",   label: "Baths per week",            icon: "🛁", min: 0,  max: 14,  default: 1  },
];

const LEVEL_STYLES = {
  critical:  { color: "#ef4444", bg: "#ef444415", border: "#ef444430" },
  warning:   { color: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b30" },
  good:      { color: "#22c55e", bg: "#22c55e15", border: "#22c55e30" },
  excellent: { color: "#00e5b0", bg: "#00e5b015", border: "#00e5b030" },
};

/* ─────────────────────────────────────────────
   SHARED COMPONENTS
───────────────────────────────────────────── */
function Card({ children, style, glow }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: `1.5px solid ${glow ? "var(--accent)" : "var(--border)"}`,
      borderRadius: 16,
      boxShadow: glow ? "0 0 32px #00e5b018" : "none",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Pill({ children, color = "var(--accent)" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 99,
      background: `${color}18`, border: `1px solid ${color}40`,
      color, fontSize: 11, fontWeight: 600,
      letterSpacing: ".06em", fontFamily: "var(--font-head)",
    }}>
      {children}
    </span>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: "50%",
      border: "2px solid #ffffff30",
      borderTopColor: "var(--accent)",
      animation: "spin .7s linear infinite",
    }} />
  );
}

function Stat({ label, value, unit, color = "var(--accent)" }) {
  return (
    <div style={{
      background: "#0a1a1e", border: "1.5px solid var(--border)",
      borderRadius: 12, padding: "16px 18px",
    }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 6, letterSpacing: ".06em", fontFamily: "var(--font-head)" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "var(--font-head)", animation: "countUp .5s ease" }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 12, color: "var(--muted)" }}>{unit}</span>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NAV
───────────────────────────────────────────── */
function Nav({ page, setPage, apiStatus }) {
  const pages = ["Predict", "History", "About"];
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "#060d0fcc", backdropFilter: "blur(16px)",
      borderBottom: "1px solid var(--border)",
    }}>
      <div style={{
        maxWidth: 1100, margin: "0 auto",
        padding: "0 24px", height: 60,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 12, color: "#000",
          }}>AI</div>
          <div>
            <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
              WaterPredict
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>Yorkshire Water · SDG 12</div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {pages.map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              padding: "6px 16px", borderRadius: 8, border: "none",
              background: page === p ? "#00e5b018" : "transparent",
              color: page === p ? "var(--accent)" : "var(--muted)",
              fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 13,
              cursor: "pointer", transition: "all .15s",
              borderBottom: page === p ? "2px solid var(--accent)" : "2px solid transparent",
            }}>
              {p}
            </button>
          ))}

          {/* API status dot */}
          <div style={{
            marginLeft: 8, display: "flex", alignItems: "center", gap: 6,
            background: "var(--border)", borderRadius: 99, padding: "4px 10px",
          }}>
            <div style={{ position: "relative", width: 8, height: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: apiStatus === "running" ? "var(--good)" : apiStatus === "checking" ? "var(--warn)" : "var(--danger)",
              }} />
              {apiStatus === "running" && (
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "var(--good)",
                  animation: "pulse-ring 1.5s ease-out infinite",
                }} />
              )}
            </div>
            <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-head)", letterSpacing: ".05em" }}>
              {apiStatus === "running" ? "API LIVE" : apiStatus === "checking" ? "CHECKING" : "API DOWN"}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   PREDICT PAGE
───────────────────────────────────────────── */
function PredictPage() {
  const initForm = () => Object.fromEntries(FIELDS.map(f => [f.key, f.default]));
  const [form,    setForm]    = useState(initForm);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const handleChange = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, parseFloat(v)])
      );
      const data = await predictWaterUsage(payload);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => { setForm(initForm()); setResult(null); setError(null); };

  const lvlStyle = result ? (LEVEL_STYLES[result.recommendation?.level] || LEVEL_STYLES.good) : null;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      {/* Hero */}
      <div className="fade-up" style={{ marginBottom: 40, textAlign: "center" }}>
        <Pill>🔬 Random Forest · 94.2% R²</Pill>
        <h1 style={{
          fontFamily: "var(--font-head)", fontWeight: 800,
          fontSize: "clamp(28px, 5vw, 52px)", lineHeight: 1.1,
          marginTop: 16, marginBottom: 12,
        }}>
          Predict Your{" "}
          <span style={{ color: "var(--accent)" }}>Water Usage</span>
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 500, margin: "0 auto" }}>
          Enter your household details below. Our ML model estimates your yearly consumption and tells you how to save.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 24, alignItems: "start" }}>
        {/* ── Left: Form ─────────────────────────────────── */}
        <Card style={{ padding: 28 }}>
          <div style={{
            fontFamily: "var(--font-head)", fontWeight: 700,
            fontSize: 15, marginBottom: 24, color: "var(--text)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>🏠</span> Household Details
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label style={{
                  display: "block", fontSize: 12, fontWeight: 500,
                  color: "var(--muted)", marginBottom: 6,
                  fontFamily: "var(--font-head)", letterSpacing: ".04em",
                }}>
                  {f.icon} {f.label}
                </label>
                <input
                  type="number"
                  min={f.min}
                  max={f.max}
                  value={form[f.key]}
                  onChange={e => handleChange(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <button onClick={handleSubmit} disabled={loading} style={{
              flex: 1, padding: "13px 0",
              background: loading ? "var(--border2)" : "linear-gradient(135deg, var(--accent), var(--accent2))",
              border: "none", borderRadius: 10,
              color: loading ? "var(--muted)" : "#000",
              fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 14,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              transition: "all .2s",
            }}>
              {loading ? <><Spinner /> Predicting…</> : "Predict →"}
            </button>
            <button onClick={handleReset} style={{
              padding: "13px 20px", borderRadius: 10,
              background: "transparent", border: "1.5px solid var(--border2)",
              color: "var(--muted)", cursor: "pointer", fontSize: 13,
              fontFamily: "var(--font-body)", transition: "border-color .2s",
            }}>
              Reset
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: 16, padding: "12px 16px", borderRadius: 10,
              background: "#ef444415", border: "1px solid #ef444430",
              color: "#ef4444", fontSize: 13,
            }}>
              ⚠️ {error} — Is Flask running on port 5000?
            </div>
          )}
        </Card>

        {/* ── Right: Result ───────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {result ? (
            <>
              {/* Main result card */}
              <Card glow style={{ padding: 28, animation: "fadeUp .4s ease" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4, fontFamily: "var(--font-head)", letterSpacing: ".06em" }}>
                  PREDICTED YEARLY USAGE
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                  <span style={{
                    fontSize: 52, fontWeight: 800, color: "var(--accent)",
                    fontFamily: "var(--font-head)", lineHeight: 1,
                    animation: "countUp .5s ease",
                  }}>
                    {result.predicted_litres_yearly?.toLocaleString()}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 15 }}>litres</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                  <Stat label="PER DAY"   value={result.predicted_litres_daily?.toLocaleString()}   unit="L/day"   color="var(--accent2)" />
                  <Stat label="PER MONTH" value={result.predicted_litres_monthly?.toLocaleString()} unit="L/month" color="var(--accent2)" />
                </div>

                {/* vs average */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", borderRadius: 8, background: "#0a1a1e",
                  border: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>vs. UK average (120,000 L/yr)</span>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: (result.pct_vs_average > 0) ? "var(--danger)" : "var(--good)",
                  }}>
                    {result.pct_vs_average > 0 ? "+" : ""}{result.pct_vs_average}%
                  </span>
                </div>
              </Card>

              {/* Recommendation card */}
              {result.recommendation && (
                <Card style={{
                  padding: 22,
                  background: lvlStyle.bg,
                  border: `1.5px solid ${lvlStyle.border}`,
                  animation: "fadeUp .5s ease .1s both",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <span style={{ fontSize: 24 }}>{result.recommendation.icon}</span>
                    <div>
                      <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, color: lvlStyle.color, fontSize: 15 }}>
                        {result.recommendation.title}
                      </div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, marginBottom: 10 }}>
                    {result.recommendation.text}
                  </p>
                  <p style={{ fontSize: 12, color: lvlStyle.color, fontWeight: 600 }}>
                    💰 {result.recommendation.saving}
                  </p>
                </Card>
              )}
            </>
          ) : (
            /* Placeholder */
            <Card style={{ padding: 40, textAlign: "center", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ fontSize: 48, marginBottom: 4 }}>💧</div>
              <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 18, color: "var(--text)" }}>
                Ready to predict
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 220, lineHeight: 1.6 }}>
                Fill in your household details and click Predict to see your estimated water usage.
              </div>
            </Card>
          )}

          {/* How it works */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 13, marginBottom: 14, color: "var(--accent)" }}>
              HOW IT WORKS
            </div>
            {[
              ["Your inputs", "Sent to Flask API as JSON"],
              ["Pre-processing", "Scaled with StandardScaler"],
              ["Model", "Random Forest (100 trees)"],
              ["Output", "Yearly litres + recommendation"],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 0", borderBottom: "1px solid var(--border)",
                fontSize: 12,
              }}>
                <span style={{ color: "var(--muted)" }}>{k}</span>
                <span style={{ color: "var(--text)", fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HISTORY PAGE
───────────────────────────────────────────── */
function HistoryPage() {
  const [history, setHistory]   = useState([]);
  const [stats,   setStats]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [h, s] = await Promise.all([fetchHistory(), fetchStats()]);
        setHistory(h.history || []);
        setStats(s);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
      <Spinner />
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 32, marginBottom: 8 }}>
        Prediction History
      </h2>
      <p style={{ color: "var(--muted)", marginBottom: 32, fontSize: 14 }}>
        Past predictions stored in MongoDB Atlas
      </p>

      {error && (
        <Card style={{ padding: 24, marginBottom: 24, background: "#ef444410", border: "1px solid #ef444430" }}>
          <p style={{ color: "#ef4444", fontSize: 14 }}>
            ⚠️ {error} — Make sure MongoDB is connected in your <code>.env</code> file.
          </p>
        </Card>
      )}

      {/* Stats row */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          <Stat label="TOTAL PREDICTIONS" value={stats.total_predictions || 0} color="var(--accent)" />
          <Stat label="AVG YEARLY (L)"    value={(stats.avg_litres || 0).toLocaleString()} unit="L" color="var(--accent2)" />
          <Stat label="MIN USAGE (L)"     value={(stats.min_litres || 0).toLocaleString()} unit="L" color="var(--good)" />
          <Stat label="MAX USAGE (L)"     value={(stats.max_litres || 0).toLocaleString()} unit="L" color="var(--warn)" />
        </div>
      )}

      {/* Table */}
      {history.length === 0 ? (
        <Card style={{ padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, color: "var(--muted)" }}>
            No predictions yet
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>
            Make a prediction first, then come back here.
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1.5px solid var(--border)" }}>
                  {["Timestamp", "People", "Showers/wk", "Predicted (L/yr)", "Daily (L)", "Level"].map(h => (
                    <th key={h} style={{
                      padding: "14px 18px", textAlign: "left",
                      fontFamily: "var(--font-head)", fontWeight: 700,
                      fontSize: 11, color: "var(--muted)", letterSpacing: ".06em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row, i) => {
                  const lvl   = row.output?.recommendation?.level || "good";
                  const style = LEVEL_STYLES[lvl];
                  const ts    = row.output?.timestamp
                    ? new Date(row.output.timestamp).toLocaleString()
                    : "—";
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)", transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 18px", color: "var(--muted)", fontFamily: "monospace", fontSize: 11 }}>{ts}</td>
                      <td style={{ padding: "12px 18px" }}>{row.input?.["Number-Of-People"] ?? "—"}</td>
                      <td style={{ padding: "12px 18px" }}>{row.input?.["Showers-Per-Week"] ?? "—"}</td>
                      <td style={{ padding: "12px 18px", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-head)" }}>
                        {row.output?.predicted_litres_yearly?.toLocaleString() ?? "—"}
                      </td>
                      <td style={{ padding: "12px 18px" }}>{row.output?.predicted_litres_daily ?? "—"}</td>
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 99,
                          background: style.bg, color: style.color,
                          border: `1px solid ${style.border}`,
                          fontSize: 11, fontWeight: 600, fontFamily: "var(--font-head)",
                        }}>
                          {lvl}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ABOUT PAGE
───────────────────────────────────────────── */
function AboutPage() {
  const stack = [
    { icon: "🐍", name: "Python + Flask",      role: "Backend REST API",          color: "#3b82f6" },
    { icon: "🤖", name: "scikit-learn",         role: "Random Forest Regressor",   color: "#f59e0b" },
    { icon: "⚛️", name: "React + Vite",         role: "Frontend SPA",              color: "#61dafb" },
    { icon: "🍃", name: "MongoDB Atlas",        role: "Prediction storage",        color: "#22c55e" },
    { icon: "📊", name: "Pandas / NumPy",       role: "Data processing",           color: "#e879f9" },
    { icon: "☁️", name: "Render + Vercel",      role: "Cloud deployment",          color: "#00e5b0" },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div className="fade-up" style={{ marginBottom: 40, textAlign: "center" }}>
        <div style={{
          width: 72, height: 72, borderRadius: 18, margin: "0 auto 20px",
          background: "linear-gradient(135deg, var(--accent), var(--accent2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 24, color: "#000",
        }}>AI</div>
        <h1 style={{ fontFamily: "var(--font-head)", fontWeight: 800, fontSize: 36, marginBottom: 10 }}>
          About This Project
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 480, margin: "0 auto" }}>
          AI-based smart consumption and waste prediction system built for SDG Goal 12.
        </p>
      </div>

      {/* Info table */}
      <Card style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 14, marginBottom: 20, color: "var(--accent)" }}>
          PROJECT INFO
        </div>
        {[
          ["Student",       "Adithya Karmarkar G"],
          ["SRN",           "PES1PG25CA258"],
          ["Institution",   "PES University"],
          ["Dataset",       "Yorkshire Water Consumer Habits (7.8 MB, 13,748 rows)"],
          ["SDG Goal",      "Goal 12 — Responsible Consumption & Production"],
          ["ML Model",      "Random Forest Regressor (100 estimators)"],
          ["Accuracy",      "R² ≈ 0.942 on test set"],
          ["Features",      "97 behavioural & structural features"],
        ].map(([k, v]) => (
          <div key={k} style={{
            display: "flex", justifyContent: "space-between", alignItems: "flex-start",
            padding: "11px 0", borderBottom: "1px solid var(--border)",
            gap: 20, fontSize: 14,
          }}>
            <span style={{ color: "var(--muted)", minWidth: 120 }}>{k}</span>
            <span style={{ color: "var(--text)", fontWeight: 500, textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </Card>

      {/* Tech stack */}
      <Card style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 14, marginBottom: 20, color: "var(--accent)" }}>
          TECH STACK
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {stack.map(s => (
            <div key={s.name} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "#0a1a1e", border: "1.5px solid var(--border)",
              borderRadius: 10, padding: "14px 16px",
            }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: s.color }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.role}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* API reference */}
      <Card style={{ padding: 28 }}>
        <div style={{ fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 14, marginBottom: 20, color: "var(--accent)" }}>
          API ENDPOINTS
        </div>
        {[
          ["GET",  "/",        "Health check — returns model status"],
          ["POST", "/predict", "Send household JSON → get prediction"],
          ["GET",  "/history", "Last 20 predictions from MongoDB"],
          ["GET",  "/stats",   "Aggregate stats (count, avg, min, max)"],
        ].map(([method, path, desc]) => (
          <div key={path} style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13,
          }}>
            <span style={{
              minWidth: 44, textAlign: "center", padding: "2px 8px", borderRadius: 5,
              background: method === "GET" ? "#22c55e18" : "#3b82f618",
              color:      method === "GET" ? "#22c55e"   : "#60a5fa",
              fontFamily: "var(--font-head)", fontWeight: 700, fontSize: 10, letterSpacing: ".05em",
            }}>{method}</span>
            <code style={{ color: "var(--accent)", fontFamily: "monospace", minWidth: 90 }}>{path}</code>
            <span style={{ color: "var(--muted)" }}>{desc}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────── */
export default function App() {
  const [page,      setPage]      = useState("Predict");
  const [apiStatus, setApiStatus] = useState("checking");

  // Check API health on mount
  useEffect(() => {
    (async () => {
      const h = await checkHealth();
      setApiStatus(h.status === "running" ? "running" : "down");
    })();
  }, []);

  const PAGE = { Predict: PredictPage, History: HistoryPage, About: AboutPage };
  const CurrentPage = PAGE[page];

  return (
    <>
      <style>{CSS}</style>
      <Nav page={page} setPage={setPage} apiStatus={apiStatus} />
      <CurrentPage />
    </>
  );
}

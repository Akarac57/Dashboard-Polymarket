import { useState, useEffect, useCallback } from "react";

const GAMMA_API = "/api/polymarket";

// Couleurs Polymarket officielles par catégorie
const categoryColors = {
  Politics: "#ff4d4f",
  Crypto: "#1890ff",
  Sports: "#52c41a",
  Science: "#722ed1",
  Business: "#fa8c16",
  default: "#6b7280",
};

// Couleurs fallback par rang si chartColor absent
const fallbackColors = [
  "#1890ff", // bleu (démocrate style)
  "#ff4d4f", // rouge (républicain style)
  "#52c41a", // vert
  "#fa8c16", // orange
  "#722ed1", // violet
  "#13c2c2", // cyan
];

function formatPct(price) {
  return Math.round(parseFloat(price) * 100);
}

// Filtre les markets valides : actifs, acceptant les ordres, pas de faux candidats
function getValidMarkets(markets = []) {
  return markets.filter((m) => {
    if (m.closed || m.archived) return false;
    if (!m.active) return false;
    // Exclure les slots vides type "Person AA", "Person AB", "Option A"...
    const label = (m.groupItemTitle || m.question || "").trim();
    if (/^(person|option|candidate|slot)\s+[a-z]{1,2}$/i.test(label)) return false;
    if (/^[A-Z]{2,3}$/.test(label)) return false;
    return true;
  });
}

function parseEvent(event) {
  const markets = getValidMarkets(event.markets || []);

  if (markets.length === 0) return [];

  // Multi-outcomes : chaque market = une option (ex: Démocrate, Républicain)
  if (markets.length > 1) {
    return markets.map((m, i) => {
      const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
      const label = m.groupItemTitle || m.question || "?";
      // Utilise chartColor de Polymarket si dispo, sinon fallback
      const color = m.chartColor || fallbackColors[i % fallbackColors.length];
      return {
        label,
        pct: formatPct(prices[0]),
        color,
      };
    }).sort((a, b) => b.pct - a.pct);
  }

  // Marché binaire simple (Oui/Non)
  const m = markets[0];
  const outcomes = JSON.parse(m.outcomes || '["Yes","No"]');
  const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
  const isBinary = outcomes[0] === "Yes" || outcomes[0] === "YES";
  return [
    { label: isBinary ? "OUI" : outcomes[0], pct: formatPct(prices[0]), color: "#1890ff" },
    { label: isBinary ? "NON" : outcomes[1], pct: formatPct(prices[1]), color: "#ff4d4f" },
  ];
}

function EventCard({ event, onRemove, prevData }) {
  const outcomes = parseEvent(event);
  const cat = event.category || "default";
  const catColor = categoryColors[cat] || categoryColors.default;

  const prevFirst = prevData?.[event.id]?.firstPct;
  const currentFirst = outcomes[0]?.pct;
  const diff = prevFirst !== undefined && currentFirst !== undefined ? currentFirst - prevFirst : 0;

  if (outcomes.length === 0) return null;

  return (
    <div
      style={{
        background: "rgba(15,15,25,0.9)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "20px 22px",
        position: "relative",
        transition: "transform 0.2s, box-shadow 0.2s",
        backdropFilter: "blur(12px)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Category badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div
          style={{
            display: "inline-block",
            background: catColor + "22",
            border: `1px solid ${catColor}55`,
            color: catColor,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "2px 8px",
            borderRadius: 20,
          }}
        >
          {cat}
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(event.id)}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            width: 24,
            height: 24,
            borderRadius: "50%",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239,68,68,0.2)";
            e.currentTarget.style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "rgba(255,255,255,0.3)";
          }}
        >
          ×
        </button>
      </div>

      {/* Event title */}
      <p
        style={{
          color: "rgba(255,255,255,0.92)",
          fontSize: 13.5,
          fontWeight: 600,
          lineHeight: 1.5,
          margin: "0 0 14px",
          fontFamily: "'Georgia', serif",
        }}
      >
        {event.title}
      </p>

      {/* Variation badge */}
      {diff !== 0 && (
        <div style={{ marginBottom: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: diff > 0 ? "#52c41a" : "#ff4d4f",
              background: diff > 0 ? "rgba(82,196,26,0.1)" : "rgba(255,77,79,0.1)",
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}% depuis dernier refresh
          </span>
        </div>
      )}

      {/* Barres horizontales avec couleurs Polymarket */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {outcomes.map((outcome, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: outcome.color, flexShrink: 0 }} />
                <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 12.5 }}>{outcome.label}</span>
              </div>
              <span style={{ color: outcome.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>
                {outcome.pct}%
              </span>
            </div>
            <div
              style={{
                height: 7,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${outcome.pct}%`,
                  height: "100%",
                  background: outcome.color,
                  borderRadius: 4,
                  transition: "width 0.6s ease",
                  opacity: 0.85,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Volume */}
      {event.volume && (
        <div style={{ marginTop: 14, color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
          Vol: ${parseFloat(event.volume).toLocaleString("en", { maximumFractionDigits: 0 })}
        </div>
      )}
    </div>
  );
}

function SearchModal({ onClose, onAdd, watchedIds }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const url = `${GAMMA_API}/public-search?q=${encodeURIComponent(q)}&limit_per_type=20&events_status=active`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.events || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 400);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    const loadTrending = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${GAMMA_API}/events?active=true&closed=false&limit=20&order=volume&ascending=false`
        );
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    };
    loadTrending();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#0d0d1a",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 580,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Ajouter un event</span>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}
            >
              ×
            </button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (ex: Texas Senate, Bitcoin, Trump...)"
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "white",
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {results.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {query ? `${results.length} résultat(s) pour "${query}"` : `${results.length} events populaires`}
            </div>
          )}
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "8px 12px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)" }}>
              Chargement...
            </div>
          )}
          {!loading && results.length === 0 && query && (
            <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)" }}>
              Aucun résultat pour "{query}"
            </div>
          )}
          {results.map((event) => {
            const already = watchedIds.includes(event.id);
            const validMarkets = getValidMarkets(event.markets || []);
            const firstMarket = validMarkets[0];
            const firstPct = firstMarket
              ? formatPct(JSON.parse(firstMarket.outcomePrices || '["0.5","0.5"]')[0])
              : null;
            const firstColor = firstMarket?.chartColor || fallbackColors[0];

            return (
              <div
                key={event.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  cursor: already ? "default" : "pointer",
                  opacity: already ? 0.4 : 1,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!already) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                onClick={() => {
                  if (!already) { onAdd(event); onClose(); }
                }}
              >
                <div
                  style={{
                    minWidth: 44, height: 44, borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {event.image
                    ? <img src={event.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ fontSize: 20 }}>📊</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {event.title}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>
                    {event.category || "General"} · {validMarkets.length} option{validMarkets.length > 1 ? "s" : ""}
                  </div>
                </div>
                {firstPct !== null && (
                  <div style={{ textAlign: "right", minWidth: 44 }}>
                    <div style={{ color: firstColor, fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
                      {firstPct}%
                    </div>
                  </div>
                )}
                {already && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>✓</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PolymarketDashboard() {
  const [watched, setWatched] = useState(() => {
    try {
      const saved = localStorage.getItem("polymarket-watched-events");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [prevData, setPrevData] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    localStorage.setItem("polymarket-watched-events", JSON.stringify(watched));
  }, [watched]);

  const refreshPrices = useCallback(async () => {
    if (watched.length === 0) return;
    setRefreshing(true);
    try {
      const updated = await Promise.all(
        watched.map(async (ev) => {
          try {
            const res = await fetch(`${GAMMA_API}/events/${ev.id}`);
            const data = await res.json();
            return data || ev;
          } catch {
            return ev;
          }
        })
      );
      const prev = {};
      watched.forEach((ev) => {
        const outcomes = parseEvent(ev);
        prev[ev.id] = { firstPct: outcomes[0]?.pct };
      });
      setPrevData(prev);
      setWatched(updated);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    }
    setRefreshing(false);
  }, [watched]);

  useEffect(() => {
    if (watched.length === 0) return;
    const interval = setInterval(refreshPrices, 30000);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  const addEvent = (event) => {
    setWatched((prev) => [event, ...prev]);
    setLastUpdate(new Date());
  };

  const removeEvent = (id) => {
    setWatched((prev) => prev.filter((ev) => ev.id !== id));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07070f",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        color: "white",
        backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.12) 0%, transparent 100%)",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "18px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          background: "rgba(7,7,15,0.92)",
          backdropFilter: "blur(12px)",
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #a78bfa)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}
          >
            📈
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
              Polymarket Dashboard
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {watched.length} event{watched.length !== 1 ? "s" : ""} suivis
              {lastUpdate && (
                <> · Mis à jour{" "}
                  {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {watched.length > 0 && (
            <button
              onClick={refreshPrices}
              disabled={refreshing}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
                padding: "8px 14px", borderRadius: 8, fontSize: 12,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none" }}>⟳</span>
              Actualiser
            </button>
          )}
          <button
            onClick={() => setShowSearch(true)}
            style={{
              background: "linear-gradient(135deg, #6366f1, #a78bfa)",
              border: "none", color: "white", padding: "9px 18px",
              borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              boxShadow: "0 4px 15px rgba(99,102,241,0.35)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            + Ajouter un event
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px" }}>
        {watched.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 48 }}>📊</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
              Aucun event suivi
            </div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 360, lineHeight: 1.6 }}>
              Cliquez sur <strong>+ Ajouter un event</strong> pour rechercher et suivre des paris Polymarket en temps réel.
            </div>
            <button
              onClick={() => setShowSearch(true)}
              style={{
                marginTop: 8,
                background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                border: "none", color: "white", padding: "12px 28px",
                borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
              }}
            >
              Parcourir les events populaires
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
            {watched.map((ev) => (
              <EventCard key={ev.id} event={ev} onRemove={removeEvent} prevData={prevData} />
            ))}
          </div>
        )}
      </div>

      {watched.length > 0 && (
        <div
          style={{
            position: "fixed", bottom: 20, right: 20,
            background: "rgba(15,15,25,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: "8px 14px",
            fontSize: 11, color: "rgba(255,255,255,0.35)",
            backdropFilter: "blur(8px)",
          }}
        >
          🔄 Auto-refresh toutes les 30s
        </div>
      )}

      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onAdd={addEvent}
          watchedIds={watched.map((ev) => ev.id)}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>
    </div>
  );
}

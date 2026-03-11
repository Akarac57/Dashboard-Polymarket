import { useState, useEffect, useCallback } from "react";

const GAMMA_API = "/api/polymarket";

const categoryColors = {
  Politics: "#f59e0b",
  Crypto: "#3b82f6",
  Sports: "#10b981",
  Science: "#8b5cf6",
  Business: "#ef4444",
  default: "#6b7280",
};

function formatPct(price) {
  return Math.round(parseFloat(price) * 100);
}

function PriceBar({ yes, no }) {
  const yesPct = formatPct(yes);
  const noPct = formatPct(no);
  return (
    <div style={{ width: "100%", display: "flex", gap: 4, marginTop: 8 }}>
      <div
        style={{
          flex: yesPct,
          height: 6,
          background: "linear-gradient(90deg, #10b981, #34d399)",
          borderRadius: 3,
          transition: "flex 0.6s ease",
        }}
      />
      <div
        style={{
          flex: noPct,
          height: 6,
          background: "linear-gradient(90deg, #f87171, #ef4444)",
          borderRadius: 3,
          transition: "flex 0.6s ease",
        }}
      />
    </div>
  );
}

function MarketCard({ market, onRemove, prevPrices }) {
  const prices = JSON.parse(market.outcomePrices || '["0.5","0.5"]');
  const yesPct = formatPct(prices[0]);
  const noPct = formatPct(prices[1]);

  const prevYes = prevPrices?.[market.id]?.yes;
  const yesDiff = prevYes !== undefined ? yesPct - prevYes : 0;

  const cat = market.category || "default";
  const catColor = categoryColors[cat] || categoryColors.default;

  return (
    <div
      style={{
        background: "rgba(15,15,25,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "20px 22px",
        position: "relative",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "default",
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
          marginBottom: 10,
        }}
      >
        {cat}
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(market.id)}
        style={{
          position: "absolute",
          top: 14,
          right: 14,
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

      {/* Question */}
      <p
        style={{
          color: "rgba(255,255,255,0.92)",
          fontSize: 13.5,
          fontWeight: 500,
          lineHeight: 1.5,
          margin: "0 0 16px",
          fontFamily: "'Georgia', serif",
        }}
      >
        {market.question}
      </p>

      {/* Prices */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#10b981", fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>
              {yesPct}%
            </span>
            {yesDiff !== 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: yesDiff > 0 ? "#10b981" : "#ef4444",
                  background: yesDiff > 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                  padding: "1px 6px",
                  borderRadius: 4,
                }}
              >
                {yesDiff > 0 ? "+" : ""}{yesDiff}
              </span>
            )}
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>OUI</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#ef4444", fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>
            {noPct}%
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>NON</div>
        </div>
      </div>

      <PriceBar yes={prices[0]} no={prices[1]} />

      {/* Volume */}
      {market.volume && (
        <div style={{ marginTop: 10, color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
          Vol: ${parseFloat(market.volume).toLocaleString("en", { maximumFractionDigits: 0 })}
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
      const markets = (data.events || []).flatMap((e) => e.markets || []);
      setResults(markets);
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
          `${GAMMA_API}/markets?active=true&closed=false&limit=20&order=volume&ascending=false`
        );
        const data = await res.json();
        setResults(data || []);
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
        background: "rgba(0,0,0,0.8)",
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
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Ajouter un marché</span>
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
            placeholder="Rechercher (ex: Bitcoin, Election, Trump...)"
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
              {query ? `${results.length} résultat(s) pour "${query}"` : `${results.length} marchés populaires`}
            </div>
          )}
        </div>

        {/* Results */}
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
          {results.map((m) => {
            const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
            const yes = formatPct(prices[0]);
            const already = watchedIds.includes(m.id);
            return (
              <div
                key={m.id}
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
                  if (!already) {
                    onAdd(m);
                    onClose();
                  }
                }}
              >
                <div
                  style={{
                    minWidth: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {m.image ? (
                    <img src={m.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 20 }}>📊</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.88)",
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.question}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 }}>
                    {m.category || "General"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#10b981", fontWeight: 700, fontSize: 15, fontFamily: "monospace" }}>
                    {yes}%
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>OUI</div>
                </div>
                {already && (
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>✓</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function PolymarketDashboard() {
  // ✅ Chargement depuis localStorage au démarrage
  const [watched, setWatched] = useState(() => {
    try {
      const saved = localStorage.getItem("polymarket-watched");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [prevPrices, setPrevPrices] = useState({});
  const [showSearch, setShowSearch] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Sauvegarde automatique dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem("polymarket-watched", JSON.stringify(watched));
  }, [watched]);

  const refreshPrices = useCallback(async () => {
    if (watched.length === 0) return;
    setRefreshing(true);
    try {
      const updated = await Promise.all(
        watched.map(async (m) => {
          try {
            const res = await fetch(`${GAMMA_API}/markets/${m.id}`);
            const data = await res.json();
            return data || m;
          } catch {
            return m;
          }
        })
      );

      const prev = {};
      watched.forEach((m) => {
        const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
        prev[m.id] = { yes: formatPct(prices[0]) };
      });
      setPrevPrices(prev);
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

  const addMarket = (market) => {
    setWatched((prev) => [market, ...prev]);
    setLastUpdate(new Date());
  };

  const removeMarket = (id) => {
    setWatched((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#07070f",
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        color: "white",
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.12) 0%, transparent 100%)",
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
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #6366f1, #a78bfa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            📈
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
              Polymarket Dashboard
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {watched.length} marché{watched.length !== 1 ? "s" : ""} suivis
              {lastUpdate && (
                <> · Mis à jour{" "}
                  {lastUpdate.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
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
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              >
                ⟳
              </span>
              Actualiser
            </button>
          )}
          <button
            onClick={() => setShowSearch(true)}
            style={{
              background: "linear-gradient(135deg, #6366f1, #a78bfa)",
              border: "none",
              color: "white",
              padding: "9px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 15px rgba(99,102,241,0.35)",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            + Ajouter un marché
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "32px" }}>
        {watched.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 48 }}>📊</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
              Aucun marché suivi
            </div>
            <div
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.35)",
                maxWidth: 340,
                lineHeight: 1.6,
              }}
            >
              Cliquez sur <strong>+ Ajouter un marché</strong> pour rechercher et suivre des paris
              Polymarket en temps réel.
            </div>
            <button
              onClick={() => setShowSearch(true)}
              style={{
                marginTop: 8,
                background: "linear-gradient(135deg, #6366f1, #a78bfa)",
                border: "none",
                color: "white",
                padding: "12px 28px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
              }}
            >
              Parcourir les marchés populaires
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {watched.map((m) => (
              <MarketCard
                key={m.id}
                market={m}
                onRemove={removeMarket}
                prevPrices={prevPrices}
              />
            ))}
          </div>
        )}
      </div>

      {watched.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            background: "rgba(15,15,25,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "8px 14px",
            fontSize: 11,
            color: "rgba(255,255,255,0.35)",
            backdropFilter: "blur(8px)",
          }}
        >
          🔄 Auto-refresh toutes les 30s
        </div>
      )}

      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onAdd={addMarket}
          watchedIds={watched.map((m) => m.id)}
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

import React, { useState, useEffect, useCallback } from "react";

const GAMMA_API = "/api/polymarket";

// ── Supabase ─────────────────────────────────────────────────────
const SUPABASE_URL = "https://wumsxpqwermshwtaeajk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1bXN4cHF3ZXJtc2h3dGFlYWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTUxOTksImV4cCI6MjA4OTUzMTE5OX0.ZP5hp2Pcu9qZ5HgnG2LYjC7cVi8bhmWLFcUJ-MPq6sE";

async function dbGet(key) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/dashboard_data?key=eq.${key}&select=value`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
    return rows?.[0]?.value ?? null;
  } catch { return null; }
}

async function dbSet(key, value) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/dashboard_data`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ key, value }),
    });
  } catch (e) { console.error("Supabase write error:", e); }
}

// Cache localStorage en lecture rapide, Supabase pour la persistance réelle
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Onglets thématiques ──────────────────────────────────────────
const DEFAULT_TABS = [
  { id: "all", label: "Tous", emoji: "📊" },
  { id: "politics", label: "Politique", emoji: "🏛️" },
  { id: "crypto", label: "Crypto", emoji: "₿" },
  { id: "sports", label: "Sport", emoji: "⚽" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "business", label: "Business", emoji: "💼" },
];

// ── Mapping catégorie Polymarket → couleur ───────────────────────
const CAT_COLORS = {
  politics: "#ff4d4f",
  crypto: "#1890ff",
  sports: "#52c41a",
  science: "#722ed1",
  tech: "#722ed1",
  business: "#fa8c16",
  finance: "#fa8c16",
  entertainment: "#eb2f96",
  culture: "#eb2f96",
  default: "#6b7280",
};

const CAT_LABELS = {
  politics: "Politique",
  crypto: "Crypto",
  sports: "Sport",
  science: "Science / Tech",
  tech: "Science / Tech",
  business: "Business",
  finance: "Business",
  entertainment: "Culture",
  culture: "Culture",
  default: "Général",
};

// Tag IDs officiels Polymarket
const TAG_ID_MAP = {
  2:      "politics",
  21:     "crypto",
  100639: "sports",
  1401:   "tech",
  596:    "culture",
  120:    "finance",
  100265: "politics", // geopolitics → politics
};

// Détermine la catégorie depuis les tags (prioritaire) puis le champ category
function normalizeCat(event) {
  // 1) Cherche dans le tableau tags
  const tags = event.tags || [];
  for (const tag of tags) {
    const id = Number(tag.id);
    if (TAG_ID_MAP[id]) return TAG_ID_MAP[id];
    // Fallback sur le label du tag
    const label = (tag.label || tag.slug || "").toLowerCase();
    if (label.includes("sport") || label.includes("soccer") || label.includes("football") || label.includes("nba") || label.includes("nfl") || label.includes("tennis") || label.includes("ucl") || label.includes("champions")) return "sports";
    if (label.includes("crypto") || label.includes("bitcoin") || label.includes("defi")) return "crypto";
    if (label.includes("polit") || label.includes("election")) return "politics";
    if (label.includes("tech") || label.includes("ai") || label.includes("science")) return "tech";
    if (label.includes("finance") || label.includes("business") || label.includes("economy")) return "finance";
    if (label.includes("culture") || label.includes("entertain") || label.includes("pop")) return "culture";
  }
  // 2) Fallback sur le champ category
  const cat = (event.category || "").toLowerCase().trim();
  if (!cat || cat === "default") return "default";
  if (cat.includes("sport") || cat.includes("soccer") || cat.includes("football")) return "sports";
  if (cat.includes("crypto") || cat.includes("bitcoin")) return "crypto";
  if (cat.includes("polit") || cat.includes("election")) return "politics";
  if (cat.includes("tech") || cat.includes("ai") || cat.includes("science")) return "tech";
  if (cat.includes("finance") || cat.includes("business")) return "finance";
  if (cat.includes("culture") || cat.includes("entertain")) return "culture";
  return "default";
}

function getCatColor(cat) {
  return CAT_COLORS[cat] || CAT_COLORS.default;
}

const fallbackColors = ["#1890ff", "#ff4d4f", "#52c41a", "#fa8c16", "#722ed1", "#13c2c2"];

// ── Galerie d'emojis pour les onglets ───────────────────────────
const EMOJI_GALLERY = [
  "📊","🏛️","⚽","₿","🔬","💼","🌍","🎯","🔥","⚡",
  "🏆","🎲","💰","📈","🗳️","🇺🇸","🇫🇷","🇬🇧","🇩🇪","🇪🇸",
  "🏀","🎾","🏈","⚾","🏒","🎱","🏇","🥊","🏊","🚀",
  "🤖","💊","🧬","🌱","☀️","🌊","🎬","🎵","📱","🏠",
  "✈️","🚗","🛢️","💎","🪙","📉","🌐","🎭","🧠","⚖️",
];


const PERIODS = [
  { id: "1h",  label: "1h",  ms: 60 * 60 * 1000 },
  { id: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { id: "3d",  label: "72h", ms: 3 * 24 * 60 * 60 * 1000 },
];

// ── Historique des prix ──────────────────────────────────────────
const HISTORY_KEY = "polymarket-price-history";
const MAX_HISTORY_MS = 7 * 24 * 60 * 60 * 1000;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}"); }
  catch { return {}; }
}
function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}
function pushHistory(eventId, outcomes) {
  const h = loadHistory();
  if (!h[eventId]) h[eventId] = [];
  const now = Date.now();
  h[eventId].push({ ts: now, outcomes });
  h[eventId] = h[eventId].filter(e => now - e.ts <= MAX_HISTORY_MS);
  saveHistory(h);
}
function getDelta(eventId, label, periodMs) {
  const h = loadHistory();
  const entries = h[eventId] || [];
  if (entries.length < 2) return null;
  const now = Date.now();
  const cutoff = now - periodMs;
  const old = entries.filter(e => e.ts <= cutoff).slice(-1)[0] || entries[0];
  const current = entries[entries.length - 1];
  if (!old || !current || old === current) return null;
  const o = old.outcomes.find(x => x.label === label);
  const c = current.outcomes.find(x => x.label === label);
  if (!o || !c) return null;
  return c.pct - o.pct;
}

// ── Parsing ──────────────────────────────────────────────────────
function formatPct(price) {
  return Math.round(parseFloat(price) * 100);
}
function getValidMarkets(markets = []) {
  return markets.filter((m) => {
    if (m.closed || m.archived) return false;
    if (!m.active) return false;
    const label = (m.groupItemTitle || m.question || "").trim();
    if (/^(person|option|candidate|slot)\s+[a-z]{1,2}$/i.test(label)) return false;
    if (/^[A-Z]{2}$/.test(label)) return false;
    return true;
  });
}
function parseEvent(event) {
  const markets = getValidMarkets(event.markets || []);
  if (markets.length === 0) return [];
  if (markets.length > 1) {
    return markets.map((m, i) => {
      const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
      const rawLabel = m.groupItemTitle || m.question || "?";
      const label = /draw/i.test(rawLabel) ? "Draw" : rawLabel;
      // Couleurs fixes pour partis politiques US
      let color;
      if (/democrat/i.test(rawLabel)) color = "#1890ff";
      else if (/republican/i.test(rawLabel)) color = "#ff4d4f";
      else color = m.chartColor || fallbackColors[i % fallbackColors.length];
      return { label, pct: formatPct(prices[0]), color };
    }).sort((a, b) => b.pct - a.pct);
  }
  const m = markets[0];
  const outcomes = JSON.parse(m.outcomes || '["Yes","No"]');
  const prices = JSON.parse(m.outcomePrices || '["0.5","0.5"]');
  const isBinary = outcomes[0] === "Yes" || outcomes[0] === "YES";
  return [
    { label: isBinary ? "OUI" : outcomes[0], pct: formatPct(prices[0]), color: "#1890ff" },
    { label: isBinary ? "NON" : outcomes[1], pct: formatPct(prices[1]), color: "#ff4d4f" },
  ];
}

function getEventTab(event) {
  const cat = normalizeCat(event);
  if (["politics","crypto","sports","tech","science","finance","business","culture","entertainment"].includes(cat)) {
    if (cat === "tech" || cat === "science") return "science";
    if (cat === "finance") return "business";
    if (cat === "culture" || cat === "entertainment") return "all";
    return cat;
  }
  return "all";
}

// ── EventCard ────────────────────────────────────────────────────
function EventCard({ event, onRemove, onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isOver }) {
  const [activePeriod, setActivePeriod] = useState("24h");

  const outcomes = parseEvent(event);
  const slug = event.slug || event.id;
  const periodMs = PERIODS.find(p => p.id === activePeriod)?.ms || PERIODS[1].ms;

  if (outcomes.length === 0) return null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        background: isOver ? "rgba(99,102,241,0.07)" : "rgba(15,15,25,0.9)",
        border: isOver ? "1.5px dashed rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "18px 20px 14px",
        position: "relative",
        transition: "transform 0.15s, box-shadow 0.15s, opacity 0.15s, border-color 0.15s",
        backdropFilter: "blur(12px)",
        opacity: isDragging ? 0.4 : 1,
        cursor: "grab",
      }}
      onMouseEnter={(e) => { if (!isDragging) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.4)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Drag handle */}
      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 3, opacity: 0.18, pointerEvents: "none" }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 14, height: 2, background: "white", borderRadius: 1 }} />)}
      </div>

      {/* Badge + actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 8, paddingLeft: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <a
            href={`https://polymarket.com/event/${slug}`}
            target="_blank" rel="noopener noreferrer"
            title="Voir sur Polymarket"
            onClick={(e) => e.stopPropagation()}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", textDecoration: "none", transition: "all 0.2s", flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.25)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
          <button
            onClick={() => onRemove(event.id)}
            style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "rgba(255,255,255,0.3)", width: 24, height: 24, borderRadius: "50%", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
          >×</button>
        </div>
      </div>

      {/* Title */}
      <p style={{ color: "rgba(255,255,255,0.92)", fontSize: 13, fontWeight: 600, lineHeight: 1.5, margin: "0 0 10px", fontFamily: "'Georgia', serif", paddingLeft: 18 }}>
        {event.title}
      </p>

      {/* Period selector */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, paddingLeft: 18 }}>
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={(e) => { e.stopPropagation(); setActivePeriod(p.id); }}
            style={{
              background: activePeriod === p.id ? "rgba(255,255,255,0.09)" : "transparent",
              border: `1px solid ${activePeriod === p.id ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.07)"}`,
              color: activePeriod === p.id ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.28)",
              fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
              cursor: "pointer", letterSpacing: "0.05em", transition: "all 0.15s",
            }}
          >{p.label}</button>
        ))}
      </div>

      {/* Outcomes avec delta */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {outcomes.map((outcome, i) => {
          const delta = getDelta(event.id, outcome.label, periodMs);
          return (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: outcome.color, flexShrink: 0 }} />
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{outcome.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {delta !== null ? (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                      color: delta > 0 ? "#52c41a" : delta < 0 ? "#ff4d4f" : "rgba(255,255,255,0.3)",
                      background: delta > 0 ? "rgba(82,196,26,0.12)" : delta < 0 ? "rgba(255,77,79,0.12)" : "rgba(255,255,255,0.06)",
                    }}>
                      {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "= 0"}%
                    </span>
                  ) : (
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.15)" }} title="Pas encore assez d'historique">—</span>
                  )}
                  <span style={{ color: outcome.color, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{outcome.pct}%</span>
                </div>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${outcome.pct}%`, height: "100%", background: outcome.color, borderRadius: 3, transition: "width 0.6s ease", opacity: 0.85 }} />
              </div>
            </div>
          );
        })}
      </div>

      {event.volume && (
        <div style={{ marginTop: 12, color: "rgba(255,255,255,0.2)", fontSize: 10 }}>
          Vol: ${parseFloat(event.volume).toLocaleString("en", { maximumFractionDigits: 0 })}
        </div>
      )}
    </div>
  );
}

// ── SearchModal ──────────────────────────────────────────────────
function SearchModal({ onClose, onAddMultiple, watchedIds, activeTab, tabs }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const url = `${GAMMA_API}/public-search?q=${encodeURIComponent(q)}&limit_per_type=20&events_status=active`;
      const res = await fetch(url);
      const data = await res.json();
      setResults(data.events || []);
    } catch { setResults([]); }
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
        const res = await fetch(`${GAMMA_API}/events?active=true&closed=false&limit=20&order=volume&ascending=false`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch { setResults([]); }
      setLoading(false);
    };
    loadTrending();
  }, []);

  const toggleSelect = (event) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(event.id) ? next.delete(event.id) : next.add(event.id);
      return next;
    });
  };

  const handleConfirm = () => {
    const toAdd = results.filter(e => selected.has(e.id) && !watchedIds.includes(e.id));
    onAddMultiple(toAdd);
    onClose();
  };

  const activeTabLabel = tabs.find(t => t.id === activeTab)?.label;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, width: "100%", maxWidth: 580, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>Ajouter des events</span>
              {activeTab !== "all" && (
                <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  → onglet {activeTabLabel}
                </span>
              )}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}>×</button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (ex: Texas Senate, Bitcoin, Champions League...)"
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 14px", color: "white", fontSize: 14, outline: "none", boxSizing: "border-box" }}
          />
          {results.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {query ? `${results.length} résultat(s)` : `${results.length} events populaires`}
              {selected.size > 0 && <span style={{ marginLeft: 8, color: "#a78bfa", fontWeight: 700 }}> · {selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>}
            </div>
          )}
        </div>

        {/* Results list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 12px" }}>
          {loading && <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)" }}>Chargement...</div>}
          {!loading && results.length === 0 && query && <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)" }}>Aucun résultat pour "{query}"</div>}
          {results.map((event) => {
            const already = watchedIds.includes(event.id);
            const isSelected = selected.has(event.id);
            const validMarkets = getValidMarkets(event.markets || []);
            const firstMarket = validMarkets[0];
            const firstPct = firstMarket ? formatPct(JSON.parse(firstMarket.outcomePrices || '["0.5","0.5"]')[0]) : null;
            const firstColor = firstMarket?.chartColor || fallbackColors[0];
            return (
              <div
                key={event.id}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 12px", borderRadius: 10, cursor: already ? "default" : "pointer", opacity: already ? 0.4 : 1, transition: "background 0.15s", background: isSelected ? "rgba(99,102,241,0.1)" : "transparent", border: isSelected ? "1px solid rgba(99,102,241,0.25)" : "1px solid transparent", marginBottom: 2 }}
                onMouseEnter={(e) => { if (!already && !isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                onClick={() => { if (!already) toggleSelect(event); }}
              >
                {/* Checkbox */}
                <div style={{ width: 18, height: 18, borderRadius: 5, border: already ? "1.5px solid rgba(255,255,255,0.15)" : isSelected ? "1.5px solid #6366f1" : "1.5px solid rgba(255,255,255,0.2)", background: already ? "transparent" : isSelected ? "#6366f1" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                  {already && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>✓</span>}
                  {isSelected && !already && <span style={{ fontSize: 10, color: "white" }}>✓</span>}
                </div>
                <div style={{ minWidth: 40, height: 40, borderRadius: 8, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {event.image ? <img src={event.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 18 }}>📊</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: already ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</div>
                  <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2 }}>{event.category || "General"} · {validMarkets.length} option{validMarkets.length > 1 ? "s" : ""}</div>
                </div>
                {firstPct !== null && (
                  <div style={{ textAlign: "right", minWidth: 40, flexShrink: 0 }}>
                    <div style={{ color: already ? "rgba(255,255,255,0.3)" : firstColor, fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>{firstPct}%</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer confirm button */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
            {selected.size === 0 ? "Cochez des events à ajouter" : `${selected.size} event${selected.size > 1 ? "s" : ""} sélectionné${selected.size > 1 ? "s" : ""}`}
          </span>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            style={{ background: selected.size > 0 ? "linear-gradient(135deg, #6366f1, #a78bfa)" : "rgba(255,255,255,0.07)", border: "none", color: selected.size > 0 ? "white" : "rgba(255,255,255,0.3)", padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: selected.size > 0 ? "pointer" : "default", transition: "all 0.2s", boxShadow: selected.size > 0 ? "0 4px 15px rgba(99,102,241,0.35)" : "none" }}
          >
            Ajouter {selected.size > 0 ? `${selected.size} pari${selected.size > 1 ? "s" : ""}` : ""}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── SectionedContent ─────────────────────────────────────────────
// Affiche toutes les sections visibles en même temps (pas de filtrage par clic)
function SectionedContent({ sections, eventsInTab, onRemove, onAddSection, onRemoveSection, onReorderSection, onAssign, onClearSection, onAddEvent, tabId, dragId, setDragId, overId, setOverId, reorderEvents, assignSubSection, editMode }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [overSection, setOverSection] = useState(null);

  const handleAdd = () => {
    if (newName.trim()) { onAddSection(newName.trim()); setNewName(""); }
    setAdding(false);
  };

  const unsorted = eventsInTab.filter(ev =>
    !ev._subSection || !sections.find(s => s.id === ev._subSection)
  );

  const cardGrid = (events) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
      {events.map(ev => (
        <EventCard
          key={ev.id}
          event={ev}
          onRemove={onRemove}
          isDragging={dragId === ev.id}
          isOver={overId === ev.id && dragId !== ev.id}
          onDragStart={() => setDragId(ev.id)}
          onDragOver={() => setOverId(ev.id)}
          onDrop={() => { reorderEvents(dragId, ev.id); setDragId(null); setOverId(null); }}
          onDragEnd={() => { setDragId(null); setOverId(null); }}
        />
      ))}
    </div>
  );

  // Pas de sections : grille classique + bouton créer une section
  if (sections.length === 0) {
    return (
      <div>
        {eventsInTab.length > 0 && cardGrid(eventsInTab)}
        {eventsInTab.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 48 }}>📊</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>Aucun event dans cet onglet</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", maxWidth: 360, lineHeight: 1.6 }}>Cliquez sur <strong>+ Ajouter un event</strong> pour en ajouter un.</div>
            <button onClick={onAddEvent} style={{ marginTop: 8, background: "linear-gradient(135deg, #6366f1, #a78bfa)", border: "none", color: "white", padding: "12px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}>+ Ajouter un event</button>
          </div>
        )}
        {tabId !== "all" && editMode && (
          <div style={{ marginTop: 24 }}>
            {adding ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }} placeholder="Nom de la section..." style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 12px", color: "white", fontSize: 13, outline: "none", width: 200 }} />
                <button onClick={handleAdd} style={{ background: "rgba(99,102,241,0.3)", border: "none", color: "white", padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>OK</button>
                <button onClick={() => { setAdding(false); setNewName(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 16, cursor: "pointer" }}>×</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)} style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)", padding: "8px 18px", borderRadius: 8, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
              >+ Créer une section</button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Avec sections : affichage en blocs empilés
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* Sections nommées */}
      {sections.map(section => {
        const sectionEvents = eventsInTab.filter(ev => ev._subSection === section.id);
        const isDropTarget = overSection === section.id && dragId;
        return (
          <div key={section.id}>
            {/* Section header */}
            <div
              onDragOver={e => { e.preventDefault(); setOverSection(section.id); }}
              onDragLeave={() => setOverSection(null)}
              onDrop={() => { if (dragId) { assignSubSection(dragId, section.id); setOverSection(null); setDragId(null); } }}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, padding: "8px 12px", borderRadius: 8, background: isDropTarget ? "rgba(99,102,241,0.1)" : "transparent", border: isDropTarget ? "1px dashed rgba(99,102,241,0.4)" : "1px solid transparent", transition: "all 0.15s" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.05em", textTransform: "uppercase" }}>{section.label}</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.06)", padding: "1px 7px", borderRadius: 8, fontWeight: 600 }}>{sectionEvents.length}</span>
                {isDropTarget && <span style={{ fontSize: 11, color: "rgba(99,102,241,0.8)" }}>← Déposer ici</span>}
              </div>
              {editMode && (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {/* Flèches réordonnement */}
                  <button
                    onClick={() => onReorderSection(section.id, -1)}
                    disabled={sections.indexOf(section) === 0}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: sections.indexOf(section) === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)", width: 22, height: 22, borderRadius: 4, cursor: sections.indexOf(section) === 0 ? "default" : "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                    onMouseEnter={e => { if (sections.indexOf(section) > 0) { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = sections.indexOf(section) === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)"; }}
                  >↑</button>
                  <button
                    onClick={() => onReorderSection(section.id, 1)}
                    disabled={sections.indexOf(section) === sections.length - 1}
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: sections.indexOf(section) === sections.length - 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)", width: 22, height: 22, borderRadius: 4, cursor: sections.indexOf(section) === sections.length - 1 ? "default" : "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                    onMouseEnter={e => { if (sections.indexOf(section) < sections.length - 1) { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}}
                    onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = sections.indexOf(section) === sections.length - 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)"; }}
                  >↓</button>
                  <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
                  {sectionEvents.length > 0 && (
                    <button onClick={() => { if (window.confirm(`Supprimer les ${sectionEvents.length} pari(s) de "${section.label}" ?`)) onClearSection(section.id); }} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.4)", fontSize: 11, cursor: "pointer", padding: "2px 6px" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(239,68,68,0.4)"}
                    >🗑</button>
                  )}
                  <button onClick={() => onRemoveSection(section.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", fontSize: 12, cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.color = "#ff4d4f"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
                  >× Supprimer</button>
                </div>
              )}
            </div>

            {sectionEvents.length > 0
              ? cardGrid(sectionEvents)
              : (
                <div
                  onDragOver={e => { e.preventDefault(); setOverSection(section.id); }}
                  onDragLeave={() => setOverSection(null)}
                  onDrop={() => { if (dragId) { assignSubSection(dragId, section.id); setOverSection(null); setDragId(null); } }}
                  style={{ border: "1.5px dashed rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.18)", fontSize: 12 }}
                >Glisse un pari ici</div>
              )
            }
          </div>
        );
      })}

      {/* Non classés */}
      {unsorted.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "8px 12px" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.05em", textTransform: "uppercase", fontStyle: "italic" }}>Non classés</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)", padding: "1px 7px", borderRadius: 8, fontWeight: 600 }}>{unsorted.length}</span>
          </div>
          {cardGrid(unsorted)}
        </div>
      )}

      {/* Ajouter une section — seulement en mode édition */}
      {tabId !== "all" && editMode && (
        <div>
          {adding ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }} placeholder="Nom de la section..." style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 12px", color: "white", fontSize: 13, outline: "none", width: 200 }} />
              <button onClick={handleAdd} style={{ background: "rgba(99,102,241,0.3)", border: "none", color: "white", padding: "7px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 600 }}>OK</button>
              <button onClick={() => { setAdding(false); setNewName(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", fontSize: 16, cursor: "pointer" }}>×</button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)", padding: "8px 18px", borderRadius: 8, fontSize: 12, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.3)"; }}
            >+ Ajouter une section</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── App principal ────────────────────────────────────────────────
export default function PolymarketDashboard() {
  const [synced, setSynced] = useState(false); // true une fois chargé depuis Supabase

  const [watched, setWatched] = useState(() => {
    const saved = lsGet("polymarket-watched-events", []);
    return saved.map(ev => ({
      ...ev,
      _tab: (ev._tab && ev._tab !== "all") ? ev._tab : getEventTab(ev),
    }));
  });

  const [tabs, setTabs] = useState(() => lsGet("polymarket-tabs", DEFAULT_TABS));
  const [activeTab, setActiveTab] = useState("all");
  const [subSections, setSubSections] = useState(() => lsGet("polymarket-subsections", {}));
  const [hiddenTabs, setHiddenTabs] = useState(() => lsGet("polymarket-hidden-tabs", []));

  // ── Chargement initial depuis Supabase ───────────────────────
  useEffect(() => {
    const load = async () => {
      const [w, t, s, h] = await Promise.all([
        dbGet("watched"), dbGet("tabs"), dbGet("subsections"), dbGet("hidden-tabs"),
      ]);
      if (w && w.length > 0) {
        const migrated = w.map(ev => ({
          ...ev,
          _tab: (ev._tab && ev._tab !== "all") ? ev._tab : getEventTab(ev),
        }));
        setWatched(migrated);
        lsSet("polymarket-watched-events", migrated);
      }
      if (t && t.length > 0) { setTabs(t); lsSet("polymarket-tabs", t); }
      if (s && Object.keys(s).length > 0) { setSubSections(s); lsSet("polymarket-subsections", s); }
      if (h) { setHiddenTabs(h); lsSet("polymarket-hidden-tabs", h); }
      setSynced(true);
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sauvegarde vers Supabase + localStorage (cache) ─────────
  const slimEvent = (ev) => ({
    id: ev.id, slug: ev.slug, title: ev.title, category: ev.category,
    tags: ev.tags, volume: ev.volume, image: ev.image,
    markets: (ev.markets || []).map(m => ({
      id: m.id, active: m.active, closed: m.closed, archived: m.archived,
      groupItemTitle: m.groupItemTitle, question: m.question,
      outcomes: m.outcomes, outcomePrices: m.outcomePrices, chartColor: m.chartColor,
    })),
    _tab: ev._tab, _subSection: ev._subSection,
  });

  useEffect(() => {
    if (!synced) return;
    const slim = watched.map(slimEvent);
    lsSet("polymarket-watched-events", slim);
    dbSet("watched", slim);
  }, [watched, synced]);

  useEffect(() => {
    if (!synced) return;
    lsSet("polymarket-tabs", tabs);
    dbSet("tabs", tabs);
  }, [tabs, synced]);

  useEffect(() => {
    if (!synced) return;
    lsSet("polymarket-subsections", subSections);
    dbSet("subsections", subSections);
  }, [subSections, synced]);

  useEffect(() => {
    if (!synced) return;
    lsSet("polymarket-hidden-tabs", hiddenTabs);
    dbSet("hidden-tabs", hiddenTabs);
  }, [hiddenTabs, synced]);
  const [showSearch, setShowSearch] = useState(false);
  const [showTabManager, setShowTabManager] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [newTabEmoji, setNewTabEmoji] = useState("🏷️");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  const toggleHideTab = (id) => {
    setHiddenTabs(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
    if (hiddenTabs.includes(id) === false && activeTab === id) setActiveTab("all");
  };

  const eventsInTab = watched.filter((ev) => {
    if (activeTab === "all") return true;
    return (ev._tab || getEventTab(ev)) === activeTab;
  });

  const currentSections = subSections[activeTab] || [];

  const addSubSection = (tabId, label) => {
    if (!label.trim()) return;
    const id = `${tabId}__${label.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}__${Date.now()}`;
    setSubSections(prev => ({
      ...prev,
      [tabId]: [...(prev[tabId] || []), { id, label: label.trim() }],
    }));
  };

  const removeSubSection = (tabId, sectionId) => {
    setWatched(prev => prev.map(ev => ev._subSection === sectionId ? { ...ev, _subSection: null } : ev));
    setSubSections(prev => ({ ...prev, [tabId]: (prev[tabId] || []).filter(s => s.id !== sectionId) }));
  };

  const reorderSubSection = (tabId, sectionId, dir) => {
    setSubSections(prev => {
      const arr = [...(prev[tabId] || [])];
      const idx = arr.findIndex(s => s.id === sectionId);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...prev, [tabId]: arr };
    });
  };

  const assignSubSection = (eventId, sectionId) => {
    setWatched(prev => prev.map(ev => ev.id === eventId ? { ...ev, _subSection: sectionId } : ev));
  };

  const watchedRef = React.useRef(watched);
  useEffect(() => { watchedRef.current = watched; }, [watched]);

  const refreshPrices = useCallback(async () => {
    const current = watchedRef.current;
    if (current.length === 0) return;
    setRefreshing(true);
    try {
      const updated = await Promise.all(
        current.map(async (ev) => {
          try {
            const res = await fetch(`${GAMMA_API}/events/${ev.id}`);
            const data = await res.json();
            if (data) {
              const outcomes = parseEvent(data);
              if (outcomes.length > 0) pushHistory(ev.id, outcomes);
              const tab = ev._tab && ev._tab !== "all" ? ev._tab : getEventTab(data);
              return { ...data, _tab: tab, _subSection: ev._subSection ?? null };
            }
            return ev;
          } catch { return ev; }
        })
      );
      setWatched(updated);
      setLastUpdate(new Date());
    } catch (e) { console.error(e); }
    setRefreshing(false);
  }, []); // stable — lit watched via ref

  useEffect(() => {
    const interval = setInterval(refreshPrices, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshPrices]); // ne se relance plus en boucle

  const addEvent = (event) => {
    const tab = activeTab !== "all" ? activeTab : getEventTab(event);
    const withTab = { ...event, _tab: tab };
    const outcomes = parseEvent(withTab);
    if (outcomes.length > 0) pushHistory(event.id, outcomes);
    setWatched((prev) => [withTab, ...prev]);
    setLastUpdate(new Date());
  };

  const addMultiple = (events) => {
    const toAdd = events.map(event => {
      const tab = activeTab !== "all" ? activeTab : getEventTab(event);
      const withTab = { ...event, _tab: tab };
      const outcomes = parseEvent(withTab);
      if (outcomes.length > 0) pushHistory(event.id, outcomes);
      return withTab;
    });
    setWatched(prev => [...toAdd, ...prev]);
    setLastUpdate(new Date());
  };

  const removeEvent = (id) => {
    setWatched((prev) => prev.filter((ev) => ev.id !== id));
  };

  const reorderTab = (id, dir) => {
    setTabs(prev => {
      const arr = [...prev];
      const idx = arr.findIndex(t => t.id === id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const reorderEvents = (fromId, toId) => {
    if (fromId === toId) return;
    setWatched((prev) => {
      const arr = [...prev];
      const fromIdx = arr.findIndex((e) => e.id === fromId);
      const toIdx = arr.findIndex((e) => e.id === toId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  };

  const addTab = () => {
    if (!newTabName.trim()) return;
    const id = newTabName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (tabs.find(t => t.id === id)) return;
    setTabs((prev) => [...prev, { id, label: newTabName.trim(), emoji: newTabEmoji }]);
    setNewTabName("");
    setNewTabEmoji("🏷️");
  };

  const removeTab = (id) => {
    if (id === "all") return;
    setTabs((prev) => prev.filter(t => t.id !== id));
    if (activeTab === id) setActiveTab("all");
  };

  const tabCount = (tabId) => {
    if (tabId === "all") return watched.length;
    return watched.filter(ev => (ev._tab || getEventTab(ev)) === tabId).length;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#07070f", fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: "white", backgroundImage: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.12) 0%, transparent 100%)" }}>

      {!synced && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(7,7,15,0.95)", zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,0.3)", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Chargement depuis Supabase...</div>
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(7,7,15,0.92)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📈</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>Polymarket Dashboard</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {watched.length} event{watched.length !== 1 ? "s" : ""} suivis
              {lastUpdate && <> · Mis à jour {lastUpdate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {watched.length > 0 && (
            <button onClick={refreshPrices} disabled={refreshing} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", padding: "8px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none" }}>⟳</span>
              Actualiser
            </button>
          )}
          <button onClick={() => setShowTabManager(!showTabManager)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", padding: "8px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
            ⚙️ Onglets
          </button>
          <button
            onClick={() => setShowSearch(true)}
            style={{ background: "linear-gradient(135deg, #6366f1, #a78bfa)", border: "none", color: "white", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 15px rgba(99,102,241,0.35)" }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            + Ajouter un event
          </button>
        </div>
      </div>

      {/* Tab Manager */}
      {showTabManager && (
        <div style={{ background: "rgba(10,10,20,0.98)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "20px 32px" }}>

          {/* Existing tabs with eye toggle */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 12 }}>Onglets existants</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tabs.map(tab => {
                const hidden = hiddenTabs.includes(tab.id);
                return (
                  <div key={tab.id} style={{ display: "flex", alignItems: "center", gap: 0, background: hidden ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.06)", border: `1px solid ${hidden ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.12)"}`, borderRadius: 8, overflow: "hidden", opacity: hidden ? 0.5 : 1, transition: "all 0.2s" }}>
                    <span style={{ padding: "5px 10px", fontSize: 13, color: hidden ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)" }}>{tab.emoji} {tab.label}</span>
                    {/* Arrow reorder */}
                    <button
                      onClick={() => reorderTab(tab.id, -1)}
                      disabled={tabs.indexOf(tab) === 0}
                      style={{ background: "rgba(255,255,255,0.04)", border: "none", borderLeft: "1px solid rgba(255,255,255,0.07)", color: tabs.indexOf(tab) === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.35)", padding: "5px 7px", cursor: tabs.indexOf(tab) === 0 ? "default" : "pointer", fontSize: 11, transition: "all 0.15s", display: "flex", alignItems: "center" }}
                      onMouseEnter={(e) => { if (tabs.indexOf(tab) > 0) { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = tabs.indexOf(tab) === 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.35)"; }}
                    >←</button>
                    <button
                      onClick={() => reorderTab(tab.id, 1)}
                      disabled={tabs.indexOf(tab) === tabs.length - 1}
                      style={{ background: "rgba(255,255,255,0.04)", border: "none", borderLeft: "1px solid rgba(255,255,255,0.07)", color: tabs.indexOf(tab) === tabs.length - 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.35)", padding: "5px 7px", cursor: tabs.indexOf(tab) === tabs.length - 1 ? "default" : "pointer", fontSize: 11, transition: "all 0.15s", display: "flex", alignItems: "center" }}
                      onMouseEnter={(e) => { if (tabs.indexOf(tab) < tabs.length - 1) { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; } }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = tabs.indexOf(tab) === tabs.length - 1 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.35)"; }}
                    >→</button>
                    {/* Eye toggle */}
                    <button
                      onClick={() => toggleHideTab(tab.id)}
                      title={hidden ? "Afficher cet onglet" : "Masquer cet onglet"}
                      style={{ background: "rgba(255,255,255,0.04)", border: "none", borderLeft: "1px solid rgba(255,255,255,0.07)", color: hidden ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.45)", padding: "5px 8px", cursor: "pointer", fontSize: 13, transition: "all 0.15s", display: "flex", alignItems: "center" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = hidden ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.45)"; }}
                    >{hidden ? "🙈" : "👁"}</button>
                    {/* Delete (not for "all") */}
                    {tab.id !== "all" && (
                      <button onClick={() => removeTab(tab.id)} style={{ background: "rgba(255,255,255,0.04)", border: "none", borderLeft: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,77,79,0.5)", padding: "5px 8px", cursor: "pointer", fontSize: 13, transition: "all 0.15s", display: "flex", alignItems: "center" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,77,79,0.12)"; e.currentTarget.style.color = "#ff4d4f"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "rgba(255,77,79,0.5)"; }}
                      >×</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Create new tab */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 12 }}>Créer un onglet</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div>
                {/* Emoji gallery */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 320, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, marginBottom: 8 }}>
                  {EMOJI_GALLERY.map(em => (
                    <button
                      key={em}
                      onClick={() => setNewTabEmoji(em)}
                      style={{ width: 28, height: 28, borderRadius: 6, border: newTabEmoji === em ? "1.5px solid rgba(99,102,241,0.6)" : "1px solid transparent", background: newTabEmoji === em ? "rgba(99,102,241,0.2)" : "transparent", fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}
                    >{em}</button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 0 }}>
                  Emoji sélectionné : <span style={{ fontSize: 16 }}>{newTabEmoji}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTab()}
                  placeholder="Nom de l'onglet..."
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 13, outline: "none", width: 200 }}
                />
                <button onClick={addTab} style={{ background: "rgba(99,102,241,0.3)", border: "1px solid rgba(99,102,241,0.5)", color: "white", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  + Créer l'onglet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs — only visible (non-hidden) tabs */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 32px", display: "flex", gap: 4, overflowX: "auto" }}>
        {tabs.filter(tab => !hiddenTabs.includes(tab.id)).map((tab) => {
          const count = tabCount(tab.id);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ background: "none", border: "none", borderBottom: isActive ? "2px solid #6366f1" : "2px solid transparent", color: isActive ? "white" : "rgba(255,255,255,0.45)", padding: "14px 16px", cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 400, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", transition: "all 0.2s" }}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              {count > 0 && (
                <span style={{ background: isActive ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)", color: isActive ? "#a78bfa" : "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sub-sections bar — only shown when current tab has sections */}

      {/* Content */}
      <div style={{ padding: "32px" }}>
        <SectionedContent
          sections={currentSections}
          eventsInTab={eventsInTab}
          onRemove={removeEvent}
          onAddSection={(label) => addSubSection(activeTab, label)}
          onRemoveSection={(sectionId) => removeSubSection(activeTab, sectionId)}
          onReorderSection={(sectionId, dir) => reorderSubSection(activeTab, sectionId, dir)}
          onAssign={assignSubSection}
          onClearSection={(sectionId) => {
            const ids = new Set(eventsInTab.filter(ev => ev._subSection === sectionId).map(ev => ev.id));
            setWatched(prev => prev.filter(ev => !ids.has(ev.id)));
          }}
          onAddEvent={() => setShowSearch(true)}
          tabId={activeTab}
          dragId={dragId}
          setDragId={setDragId}
          overId={overId}
          setOverId={setOverId}
          reorderEvents={reorderEvents}
          assignSubSection={assignSubSection}
          editMode={showTabManager}
        />
      </div>

      {watched.length > 0 && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: "rgba(15,15,25,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 14px", fontSize: 11, color: "rgba(255,255,255,0.35)", backdropFilter: "blur(8px)" }}>
          🔄 Auto-refresh toutes les 15 min
        </div>
      )}

      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onAddMultiple={addMultiple}
          watchedIds={watched.map((ev) => ev.id)}
          activeTab={activeTab}
          tabs={tabs}
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

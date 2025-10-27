import React, { useMemo, useState } from "react";

/* ---------- CSV utils (you already had these) ---------- */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let insideQuotes = false;
  const endCell = () => { row.push(cur); cur = ""; };
  const endRow = () => { rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (insideQuotes && text[i + 1] === '"') { cur += '"'; i++; }
      else { insideQuotes = !insideQuotes; }
    } else if (ch === ',' && !insideQuotes) {
      endCell();
    } else if ((ch === '\n' || ch === '\r') && !insideQuotes) {
      if (cur !== "" || row.length) { endCell(); endRow(); }
      if (ch === '\r' && text[i + 1] === '\n') i++; // swallow CRLF pair
    } else {
      cur += ch;
    }
  }
  if (cur !== "" || row.length) { endCell(); endRow(); }
  return rows;
}

function csvToObjects(rows) {
  if (!rows || rows.length === 0) return [];
  const headers = rows[0].map((h) => String(h || "").trim());
  return rows.slice(1).map((
    r) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] != null ? r[i] : ""; });
    return obj;
  });
}

/* ---------- Schedule mapper (you already had this) ---------- */
function toScheduleRows(objs) {
  if (!objs || objs.length === 0) return [];
  const groups = new Map();

  for (const o of objs) {
    const day = (o.Day || o.DAY || o.day || "").trim();
    if (!day) continue;

    const time = (o.Time || o.TIME || o.time || "").trim();
    const raw =
      o.Item || o.ITEM || o.item ||
      o.Event || o.EVENT || o.event ||
      o.Activity || o.ACTIVITY || o.activity || "";

    const line = time ? `${time} ${String(raw).trim()}`.trim() : String(raw).trim();
    if (!groups.has(day)) groups.set(day, []);
    if (line) groups.get(day).push(line);
  }

  const arr = Array.from(groups.entries()).map(([day, items]) => ({ day, items }));

  // Optional: if your sheet has a Sort column (lower = earlier), respect it
  const hasSort = objs.some((o) => o.Sort || o.SORT || o.sort);
  if (hasSort) {
    const order = new Map();
    for (const o of objs) {
      const d = (o.Day || o.day || "").trim();
      const s = Number(o.Sort || o.sort || Infinity);
      if (!d) continue;
      if (!order.has(d) || s < order.get(d)) order.set(d, s);
    }
    arr.sort((a, b) => (order.get(a.day) ?? 1e9) - (order.get(b.day) ?? 1e9));
  }

  return arr;
}

/* ---------- NEW: Contacts mapper (case-insensitive headers) ---------- */
function toContacts(objs) {
  if (!objs || objs.length === 0) return [];
  const pick = (o, ...keys) => {
    for (const k of keys) {
      if (o[k] != null && String(o[k]).trim() !== "") return String(o[k]).trim();
    }
    return "";
  };
  return objs
    .map((o) => ({
      name:  pick(o, "Name", "NAME", "name"),
      role:  pick(o, "Role", "ROLE", "role"),
      phone: pick(o, "Phone", "PHONE", "phone"),
      email: pick(o, "Email", "EMAIL", "email"),
    }))
    .filter((r) => r.name );
}

/* ---------- App Data ---------- */
const DATA = {
  schedule: [ /* …yours… */ ],
  dining: [
    { meal: "Breakfast", items: ["Pancakes", "Scrambled Eggs", "Fruit", "Milk/Juice"] },
    { meal: "Lunch",     items: ["Taco Bar", "Rice", "Salad", "Cookies"] },
    { meal: "Dinner",    items: ["Spaghetti", "Garlic Bread", "Green Beans", "Ice Cream"] },
  ],
  map: {
    imageUrl: "https://www.campshenandoah.org/wp-content/uploads/2025/01/camp-shenandoah-map-2022.pdf",
    notes: ["Tap to zoom"],
  },
  contacts: [
    { name: "Camp Office",   role: "Main Line",   phone: "+1-540-555-0123", email: "office@campshenandoah.org" },
    { name: "Camp Director", role: "Leadership",  phone: "+1-540-555-0456", email: "director@campshenandoah.org" },
  ],
  tradingPost: [],
  program: [],
};

/* ---------- Existing Schedule CSV ---------- */
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRtlaZ-xFkl4DWcBjTTLNUSNdMS7LuJVR3LDp-QPjNaY8i7ffqsDgScj03g3lpu8O6LDKkhtXnqZ3Ir/pub?output=csv";

/* ---------- NEW: Contacts CSV (publish your sheet as CSV and paste here) ---------- */
// Example sheet columns: Name, Role, Phone, Email  (exact headers recommended)
const CONTACTS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSE5hkCpEnoVAVTUZE4RmqX0xnnyY9pgfBelP-sTURTe2di57NrpCIRbES1NIN77drrH1NZG3-BcJ9l/pub?output=csv"; // 🔗 CONTACTS CSV

/* ---------- Misc ---------- */
const APP_VERSION = "2025.10.26-1"; // update anytime you deploy

const S = {
  app: {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif",
    background: "#295133",
    minHeight: "100vh",
    color: "#1a1a1a",
  },
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "24px" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
    color: "#fff",
  },
  title: { fontSize: 28, fontWeight: 800, letterSpacing: 0.3 },
  subtitle: { opacity: 0.85, fontSize: 14 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#f7a200",
    color: "#000",
    border: "2px solid rgba(0,0,0,0.2)",
    borderRadius: 16,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
    transition: "transform 120ms ease, box-shadow 120ms ease",
  },
  cardHover: { transform: "translateY(-3px)", boxShadow: "0 10px 26px rgba(0,0,0,0.35)" },
  cardTitle: { fontWeight: 700, fontSize: 18 },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#295133",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    opacity: 0.9,
  },
  panel: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 40,
  },
  sheet: {
    width: "min(980px, 96vw)",
    maxHeight: "88vh",
    overflow: "auto",
    background: "#f7a200",
    color: "#1a1a1a",
    border: "2px solid rgba(0,0,0,0.2)",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
  },
  sheetHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sheetTitle: { fontSize: 22, fontWeight: 800 },
  closeBtn: {
    appearance: "none",
    background: "#295133",
    border: "none",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 10,
    cursor: "pointer",
  },
  note: { opacity: 0.8, fontSize: 13 },
  badgeRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  badgelite: { background: "#ffffff", color: "#000", borderRadius: 999, padding: "4px 10px", fontSize: 12, border: "1px solid rgba(0,0,0,0.15)" },
  button: { background: "#ffffff", color: "#000", border: "1px solid rgba(0,0,0,0.2)", borderRadius: 10, padding: "8px 12px", cursor: "pointer" },
};

function Card({ icon, title, onClick, styleOverride = {}, chipStyle = {} }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ ...S.card, ...(hover ? S.cardHover : {}), ...styleOverride }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      role="button"
      aria-label={`${title} – open`}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={S.cardTitle}>{title}</div>
    </div>
  );
}

function Panel({ title, onClose, children }) {
  return (
    <div style={S.panel} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={S.sheetHeader}>
          <div style={S.sheetTitle}>{title}</div>
          <button style={S.closeBtn} onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SchedulePanel({ open, onClose, schedule = [] }) {
  const [selected, setSelected] = React.useState(null); // day object or null
  if (!open) return null;

  return (
    <Panel
      title={selected ? `Schedule – ${selected.day}` : "Camp Schedule"}
      onClose={() => { setSelected(null); onClose(); }}
    >
      {!selected ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {schedule.map((d) => (
            <div
              key={d.day}
              role="button"
              onClick={() => setSelected(d)}
              style={{
                ...S.card,
                cursor: "pointer",
                background: "#ffffff",
                color: "#000",
                border: "1px solid rgba(0,0,0,0.15)"
              }}
            >
              <div style={{ fontSize: 24 }}>🗓️</div>
              <div style={{ ...S.cardTitle, fontSize: 16 }}>{d.day}</div>
              <div style={{ ...S.note, marginTop: 6 }}>{d.items?.[0]}</div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <button
            style={{ ...S.closeBtn, marginBottom: 12 }}
            onClick={() => setSelected(null)}
            aria-label="Back to all days"
          >
            ← Back to all days
          </button>

          <div style={{ display: "grid", gap: 10 }}>
            {(selected.items || []).map((line, idx) => (
              <div
                key={idx}
                style={{
                  background: "#fff",
                  color: "#000",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.2)"
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function MenuPanel({ open, onClose, dining = [] }) {
  if (!open) return null;
  return (
    <Panel title="Dining Hall Menu" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        {dining.length === 0 && (
          <div style={{ ...S.badgelite }}>Menu coming soon. Check back closer to camp week!</div>
        )}
        {dining.map((m) => (
          <div
            key={m.meal}
            style={{
              background: "#fff",
              color: "#000",
              borderRadius: 12,
              padding: 12,
              border: "1px solid rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ fontWeight: 800 }}>{m.meal}</div>
            <ul>{m.items?.map((it, i) => <li key={i}>{it}</li>)}</ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function MapPanel({ open, onClose, map }) {
  if (!open) return null;
  return (
    <Panel title="Camp Map" onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 8, border: "1px solid rgba(0,0,0,0.15)" }}>
          <img
            src={map?.imageUrl}
            alt="Camp Shenandoah map"
            style={{ width: "100%", height: "auto", display: "block", borderRadius: 8 }}
          />
        </div>
        {map?.notes?.length ? <div style={S.note}>Notes: {map.notes.join(" • ")}</div> : null}
      </div>
    </Panel>
  );
}

/* ---------- UPDATED: ContactsPanel shows status and uses injected data ---------- */
function ContactsPanel({ open, onClose, contacts = [], status = "idle" }) {
  if (!open) return null;
  return (
    <Panel title="Contacts" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        {status === "loading" && <div style={S.badgelite}>Loading contacts…</div>}
        {status === "error" && <div style={{ ...S.badgelite, background: "#fff5c7" }}>Couldn’t load live contacts. Showing last saved.</div>}
        {contacts.length === 0 && status !== "loading" && <div style={{ ...S.badgelite }}>Contacts will appear here.</div>}
        {contacts.map((c) => (
          <div
            key={`${c.name}-${c.email || c.phone || ""}`}
            style={{
              background: "#fff",
              color: "#000",
              borderRadius: 12,
              padding: 12,
              border: "1px solid rgba(0,0,0,0.15)",
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontWeight: 800 }}>{c.name}</div>
            {c.role && <div style={{ ...S.note }}>{c.role}</div>}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {c.phone && (
                <a href={`tel:${c.phone}`} style={{ ...S.button, textDecoration: "none" }} aria-label={`Call ${c.name}`}>
                  📞 {c.phone}
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} style={{ ...S.button, textDecoration: "none" }} aria-label={`Email ${c.name}`}>
                  ✉️ {c.email}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function CampShenandoahApp() {
  const [open, setOpen] = useState(null);

  // Schedule (existing)
  const [liveSchedule, setLiveSchedule] = React.useState(DATA.schedule);
  const [schedStatus, setSchedStatus] = React.useState("idle");

  React.useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setSchedStatus("loading");
        const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const rows = parseCsv(text);
        const objs = csvToObjects(rows);
        const grouped = toScheduleRows(objs);
        if (isMounted && grouped.length) {
          setLiveSchedule(grouped);
          setSchedStatus("idle");
        } else if (isMounted) {
          setSchedStatus("error");
        }
      } catch (e) {
        console.error("Schedule fetch failed:", e);
        if (isMounted) setSchedStatus("error");
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  // 🔗 CONTACTS CSV: live contacts + status
  const [liveContacts, setLiveContacts] = useState(DATA.contacts);
  const [contactsStatus, setContactsStatus] = useState("idle");

  React.useEffect(() => {
    let isMounted = true;
    async function loadContacts() {
      // Skip if not configured yet
      if (!CONTACTS_CSV_URL || CONTACTS_CSV_URL.includes("REPLACE_ME")) return;
      try {
        setContactsStatus("loading");
        const res = await fetch(CONTACTS_CSV_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const rows = parseCsv(text);
        const objs = csvToObjects(rows);
        const mapped = toContacts(objs);
        if (isMounted && mapped.length) {
          setLiveContacts(mapped);
          setContactsStatus("idle");
        } else if (isMounted) {
          setContactsStatus("error");
        }
      } catch (e) {
        console.error("Contacts fetch failed:", e);
        if (isMounted) setContactsStatus("error");
      }
    }
    loadContacts();
    return () => { isMounted = false; };
  }, []);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);



  React.useEffect(() => {
    const onOff = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', onOff);
    window.addEventListener('offline', onOff);
    return () => {
      window.removeEventListener('online', onOff);
      window.removeEventListener('offline', onOff);
    };
  }, []);

  return (
    <div style={S.app}>
      <div style={S.wrap}>
        <header style={S.header}>
          <div>
            <div style={S.title}>Camp Shenandoah</div>
            <div style={S.subtitle}>Camper First • Welcome Home</div>
          </div>
          <div style={S.badgeRow}>
            <span style={S.chip}>MVP</span>
            <span style={S.badgelite}>v{APP_VERSION}</span>
            {isOffline ? (
              <span style={{ ...S.badgelite, background: '#fff5c7' }}>Offline</span>
            ) : (
              <span style={S.badgelite}>Online</span>
            )}
           
          </div>
        </header>

        <main>
          <div style={S.grid}>
            <Card
              icon="🗓️"
              title="Camp Schedule"
              onClick={() => setOpen("schedule")}
              styleOverride={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.15)" }}
              chipStyle={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.12)" }}
            />
            <Card
              icon="🍽️"
              title="Dining Hall Menu"
              onClick={() => setOpen("menu")}
              styleOverride={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.15)" }}
              chipStyle={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.12)" }}
            />
            <Card
              icon="🗺️"
              title="Camp Map"
              onClick={() => setOpen("map")}
              styleOverride={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.15)" }}
              chipStyle={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.12)" }}
            />
            <Card
              icon="☎️"
              title="Contacts"
              onClick={() => setOpen("contacts")}
              styleOverride={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.15)" }}
              chipStyle={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.12)" }}
            />
            <Card
              icon="🏪"
              title="Trading Post"
              onClick={() => setOpen("trading")}
              styleOverride={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.15)" }}
              chipStyle={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.12)" }}
            />
            <Card
              icon="🎯"
              title="Program"
              onClick={() => setOpen("program")}
              styleOverride={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.15)" }}
              chipStyle={{ background: "#ffffff", color: "#000000", border: "1px solid rgba(0,0,0,0.12)" }}
            />
          </div>
        </main>
      </div>

      <SchedulePanel open={open === "schedule"} onClose={() => setOpen(null)} schedule={liveSchedule} status={schedStatus}/>
      <MenuPanel  open={open === "menu"}  onClose={() => setOpen(null)}  dining={DATA.dining}/>
      <MapPanel   open={open === "map"}   onClose={() => setOpen(null)}   map={DATA.map}/>
      {/* 🔗 CONTACTS CSV: pass liveContacts + status */}
      <ContactsPanel open={open === "contacts"} onClose={() => setOpen(null)} contacts={liveContacts} status={contactsStatus}/>
    </div>
  );
}

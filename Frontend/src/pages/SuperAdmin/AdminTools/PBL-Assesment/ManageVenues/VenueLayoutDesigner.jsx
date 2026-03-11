import { useState, useCallback, useMemo } from "react";

/* ══════════════════════════════════════════════════════════════════════
   CONFIG & PALETTE — Isometric Blueprint Theme
   ══════════════════════════════════════════════════════════════════════ */
const SZ = 15; // seat size
const GAP = 4;
const ISO_DEPTH = 6;

const P = {
  // Blueprint tones
  bgDark: "#0a1628",
  bgMid: "#0f1f38",
  blueprint: "#1a3a6a",
  gridLine: "rgba(60,140,255,0.07)",
  gridLineBold: "rgba(60,140,255,0.14)",
  // Furniture
  tableWood: "linear-gradient(145deg,#b8935a 0%,#8c6d3f 40%,#6b4f28 100%)",
  tableShadow: "#3a2a10",
  tableBorder: "#5a4020",
  tableEdge: "#4a3518",
  // Seats
  seatEmpty: "#e8d5b0",
  seatHover: "#ffd280",
  seatAssigned: "#34d399",
  seatBorder: "#9a7d52",
  // Sections
  zones: [
    { bg:"rgba(255,200,80,0.06)", border:"#d4a04a", accent:"#f0c050" },
    { bg:"rgba(80,180,255,0.06)", border:"#4a9ad4", accent:"#50b0f0" },
    { bg:"rgba(80,220,140,0.06)", border:"#3ab870", accent:"#50e090" },
    { bg:"rgba(255,140,80,0.06)", border:"#d4784a", accent:"#f09050" },
    { bg:"rgba(160,100,240,0.06)", border:"#9a60d4", accent:"#b080f0" },
  ],
  wall: "#2a4a7a",
  wallThick: "#1a3060",
  door: "#e74c3c",
  space: "repeating-linear-gradient(45deg,rgba(100,160,220,0.08) 0,rgba(100,160,220,0.08) 3px,transparent 3px,transparent 8px)",
};

/* ══════════════════════════════════════════════════════════════════════
   SEAT DATA BUILDER
   ══════════════════════════════════════════════════════════════════════ */
let _seatNum = 1;
const seats = (tid, cfg) => {
  const r = { top:[], bottom:[], left:[], right:[] };
  Object.entries(cfg).forEach(([side, n]) => {
    for (let i = 0; i < n; i++) r[side].push({ id:`${tid}_${side}_${i}`, no: _seatNum++ });
  });
  return r;
};

const buildHall = () => {
  _seatNum = 1;
  return [
    { id:"Z1", name:"Block A", zIdx:0, rows:[
      [
        { id:"T01", w:52, h:56, c: seats("T01",{top:3,left:3}), label:"T1" },
        { id:"T02", w:44, h:68, c: seats("T02",{left:4,right:4}), label:"T2" },
        { id:"T03", w:44, h:68, c: seats("T03",{left:4,right:4}), label:"T3" },
        { id:"T04", w:44, h:68, c: seats("T04",{left:4,right:4}), label:"T4" },
        { id:"T05", w:44, h:68, c: seats("T05",{left:4,right:4}), label:"T5" },
        { id:"T06", w:44, h:68, c: seats("T06",{left:4,right:4}), label:"T6" },
      ],
      [
        { id:"T07", w:52, h:56, c: seats("T07",{bottom:3,left:3}), label:"T7" },
      ],
    ]},
    { id:"Z2", name:"Block B", zIdx:1, hasSpace:true, rows:[[
      { id:"T08", w:38, h:38, c: seats("T08",{left:1,right:1}), label:"T8" },
      { id:"T09", w:38, h:38, c: seats("T09",{left:1,right:1}), label:"T9" },
      { id:"T10", w:38, h:38, c: seats("T10",{left:1,right:1}), label:"T10" },
    ]]},
    { id:"Z3", name:"Block C", zIdx:2, hasDoor:true, rows:[
      [
        { id:"T11", w:38, h:38, c: seats("T11",{left:1,right:1}), label:"T11" },
      ],
      [
        { id:"T12", w:44, h:68, c: seats("T12",{left:4,right:4}), label:"T12" },
        { id:"T13", w:44, h:68, c: seats("T13",{left:4,right:4}), label:"T13" },
        { id:"T14", w:44, h:68, c: seats("T14",{left:4,right:4}), label:"T14" },
        { id:"T15", w:44, h:68, c: seats("T15",{left:4,right:4}), label:"T15" },
        { id:"T16", w:44, h:68, c: seats("T16",{left:4,right:4}), label:"T16" },
        { id:"T17", w:38, h:38, c: seats("T17",{left:1,right:1}), label:"T17" },
      ],
    ]},
    { id:"Z4", name:"Block D", zIdx:3, rows:[[
      { id:"T18", w:38, h:38, c: seats("T18",{left:1,right:1}), label:"T18" },
      { id:"T19", w:38, h:38, c: seats("T19",{left:1,right:1}), label:"T19" },
      { id:"T20", w:38, h:38, c: seats("T20",{left:1,right:1}), label:"T20" },
    ]]},
    { id:"Z5", name:"Block E", zIdx:4, rows:[
      [
        { id:"T21", w:68, h:90, c: seats("T21",{top:2,bottom:2,left:3}), label:"T21" },
        { id:"T22", w:44, h:68, c: seats("T22",{left:4,right:4}), label:"T22" },
        { id:"T23", w:44, h:68, c: seats("T23",{left:4,right:4}), label:"T23" },
        { id:"T24", w:44, h:68, c: seats("T24",{left:4,right:4}), label:"T24" },
        { id:"T25", w:44, h:68, c: seats("T25",{left:4,right:4}), label:"T25" },
        { id:"T26", w:44, h:68, c: seats("T26",{left:4,right:4}), label:"T26" },
      ],
      [
        { id:"T27", w:72, h:44, c: seats("T27",{top:3,bottom:3}), label:"T27" },
        { id:"T28", w:72, h:44, c: seats("T28",{top:3,bottom:3}), label:"T28" },
      ],
    ]},
  ];
};

/* ══════════════════════════════════════════════════════════════════════
   SEAT COMPONENT — Isometric chair with depth
   ══════════════════════════════════════════════════════════════════════ */
const Seat = ({ id, no, side, state, highlight, onToggle }) => {
  const [hov, setHov] = useState(false);
  const assigned = state === "assigned";
  const isHi = highlight === no;
  const bg = assigned ? P.seatAssigned : hov ? P.seatHover : P.seatEmpty;
  const border = assigned ? "#1fa06a" : P.seatBorder;
  const radius = side==="top"?"4px 4px 1px 1px":side==="bottom"?"1px 1px 4px 4px":side==="left"?"4px 1px 1px 4px":"1px 4px 4px 1px";

  return (
    <div
      onClick={() => onToggle(id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={`Seat #${no}`}
      style={{
        width: SZ, height: SZ,
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: radius,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s cubic-bezier(.2,.8,.3,1)",
        transform: hov ? "scale(1.35)" : isHi ? "scale(1.4)" : "scale(1)",
        boxShadow: assigned
          ? `0 0 8px rgba(52,211,153,0.5), inset 0 1px 2px rgba(255,255,255,0.3)`
          : isHi
            ? `0 0 12px rgba(255,210,128,0.8), 0 0 4px rgba(255,180,50,0.6)`
            : hov
              ? "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.2)"
              : "inset 0 1px 2px rgba(255,255,255,0.15)",
        fontSize: 7, fontWeight: 800,
        color: assigned ? "#fff" : "#8a7050",
        userSelect: "none", flexShrink: 0,
        zIndex: hov || isHi ? 20 : 1,
        position: "relative",
      }}
    >
      {assigned ? no : ""}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   TABLE COMPONENT — 3D isometric table with wood grain
   ══════════════════════════════════════════════════════════════════════ */
const Table = ({ table, seatStates, highlight, onToggle }) => {
  const { w, h, c: { top=[], bottom=[], left=[], right=[] }, label } = table;

  const rowSeats = (arr, side) => arr.length > 0 && (
    <div style={{ display:"flex", gap:GAP, justifyContent:"center",
      marginBottom: side==="top" ? GAP : 0, marginTop: side==="bottom" ? GAP : 0 }}>
      {arr.map(s => <Seat key={s.id} id={s.id} no={s.no} side={side}
        state={seatStates[s.id]||"empty"} highlight={highlight} onToggle={onToggle} />)}
    </div>
  );

  const colSeats = (arr, side) => arr.length > 0 && (
    <div style={{ display:"flex", flexDirection:"column", gap:GAP, justifyContent:"center",
      marginRight: side==="left" ? GAP : 0, marginLeft: side==="right" ? GAP : 0 }}>
      {arr.map(s => <Seat key={s.id} id={s.id} no={s.no} side={side}
        state={seatStates[s.id]||"empty"} highlight={highlight} onToggle={onToggle} />)}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", margin:6 }}>
      {rowSeats(top, "top")}
      <div style={{ display:"flex", alignItems:"center" }}>
        {colSeats(left, "left")}
        <div style={{ position:"relative" }}>
          {/* 3D shadow/edge */}
          <div style={{ position:"absolute", bottom: -ISO_DEPTH, right: -ISO_DEPTH,
            width: w, height: h, background: P.tableEdge, borderRadius: 3, zIndex: 0 }} />
          {/* Table surface */}
          <div style={{
            position: "relative", zIndex: 1, width: w, height: h,
            background: P.tableWood, border: `2px solid ${P.tableBorder}`, borderRadius: 5,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `${ISO_DEPTH}px ${ISO_DEPTH}px 0 ${P.tableShadow},
              inset 0 1px 4px rgba(255,255,255,0.18), inset 0 -1px 4px rgba(0,0,0,0.15)`,
          }}>
            {/* Wood grain lines */}
            <div style={{ position:"absolute", inset:3, borderRadius:3, opacity:0.08,
              background:"repeating-linear-gradient(90deg,transparent,transparent 6px,rgba(255,255,255,0.3) 6px,rgba(255,255,255,0.3) 7px)",
              pointerEvents:"none" }} />
            <span style={{
              fontSize: 9, fontWeight: 900, color: "rgba(255,255,255,0.85)",
              textShadow: "0 1px 3px rgba(0,0,0,0.6)", letterSpacing: 0.5,
              fontFamily: "'Courier New',monospace",
            }}>{label}</span>
          </div>
        </div>
        {colSeats(right, "right")}
      </div>
      {rowSeats(bottom, "bottom")}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   SPACE AREA — Hatched open area
   ══════════════════════════════════════════════════════════════════════ */
const SpaceArea = () => (
  <div style={{
    width: 140, minHeight: 90,
    background: P.space,
    border: "2px dashed rgba(100,160,220,0.25)", borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: 6, position: "relative",
  }}>
    <div style={{ position:"absolute", inset:0, borderRadius:6,
      background:"radial-gradient(ellipse at center, rgba(100,160,220,0.05) 0%, transparent 70%)", pointerEvents:"none" }} />
    <span style={{
      fontFamily: "'Courier New',monospace", fontSize: 11, color: "rgba(100,160,220,0.5)",
      fontWeight: 800, letterSpacing: 3, textTransform: "uppercase",
    }}>SPACE</span>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   ZONE SECTION — Blueprint zone with corner marks
   ══════════════════════════════════════════════════════════════════════ */
const Zone = ({ zone, seatStates, highlight, onToggle }) => {
  const { name, zIdx, rows, hasSpace, hasDoor } = zone;
  const z = P.zones[zIdx];
  const cornerStyle = (pos) => ({
    position:"absolute", width:12, height:12, pointerEvents:"none",
    ...( pos==="tl" ? {top:-1,left:-1, borderTop:`2px solid ${z.accent}`, borderLeft:`2px solid ${z.accent}`} :
         pos==="tr" ? {top:-1,right:-1,borderTop:`2px solid ${z.accent}`, borderRight:`2px solid ${z.accent}`} :
         pos==="bl" ? {bottom:-1,left:-1,borderBottom:`2px solid ${z.accent}`, borderLeft:`2px solid ${z.accent}`} :
                      {bottom:-1,right:-1,borderBottom:`2px solid ${z.accent}`, borderRight:`2px solid ${z.accent}`}),
  });

  return (
    <div style={{
      position: "relative", background: z.bg,
      border: `1.5px solid ${z.border}30`, borderRadius: 6,
      padding: "20px 16px 14px", marginBottom: 12,
    }}>
      {/* Corner marks */}
      <div style={cornerStyle("tl")} /><div style={cornerStyle("tr")} />
      <div style={cornerStyle("bl")} /><div style={cornerStyle("br")} />

      {/* Zone label */}
      <div style={{
        position:"absolute", top:-9, left:16,
        background: P.bgMid, padding:"1px 10px", borderRadius: 3,
        fontSize:8, fontWeight:800, letterSpacing:3, color: z.accent,
        textTransform:"uppercase", fontFamily:"'Courier New',monospace",
        border:`1px solid ${z.border}40`,
      }}>{name}</div>

      {/* Door */}
      {hasDoor && (
        <div style={{
          position:"absolute", right:-2, top:"50%", transform:"translateY(-50%)", zIndex:10,
        }}>
          <div style={{
            width: 20, height: 60,
            background: "linear-gradient(180deg,#e74c3c 0%,#c0392b 100%)",
            border: "2px solid #a02010", borderRadius: "2px 8px 8px 2px",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "3px 0 12px rgba(231,76,60,0.3), inset 0 1px 3px rgba(255,255,255,0.2)",
          }}>
            {/* Door handle */}
            <div style={{ position:"absolute", right:4, top:"45%", width:3, height:8,
              background:"#ffd700", borderRadius:1, boxShadow:"0 0 4px rgba(255,215,0,0.5)" }} />
            <span style={{
              color:"#fff", fontSize:6, fontWeight:900,
              writingMode:"vertical-rl", letterSpacing:2,
              textShadow:"0 1px 2px rgba(0,0,0,0.5)",
            }}>DOOR</span>
          </div>
        </div>
      )}

      {/* Table rows */}
      {rows.map((row, ri) => (
        <div key={ri} style={{
          display:"flex", alignItems:"center", flexWrap:"wrap",
          marginBottom: ri < rows.length-1 ? 8 : 0,
        }}>
          {row.map(tbl => <Table key={tbl.id} table={tbl} seatStates={seatStates} highlight={highlight} onToggle={onToggle} />)}
          {hasSpace && ri===0 && <SpaceArea />}
        </div>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   COMPASS ROSE — Unique orientation indicator
   ══════════════════════════════════════════════════════════════════════ */
const Compass = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" style={{ opacity:0.4 }}>
    <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(100,160,220,0.3)" strokeWidth="1" />
    <circle cx="24" cy="24" r="2" fill="rgba(100,160,220,0.5)" />
    {/* N */}<polygon points="24,4 21,18 27,18" fill="rgba(231,76,60,0.6)" />
    {/* S */}<polygon points="24,44 21,30 27,30" fill="rgba(100,160,220,0.3)" />
    {/* E */}<polygon points="44,24 30,21 30,27" fill="rgba(100,160,220,0.3)" />
    {/* W */}<polygon points="4,24 18,21 18,27" fill="rgba(100,160,220,0.3)" />
    <text x="24" y="12" textAnchor="middle" fontSize="6" fill="rgba(231,76,60,0.7)" fontWeight="900" fontFamily="monospace">N</text>
    <text x="24" y="43" textAnchor="middle" fontSize="5" fill="rgba(100,160,220,0.4)" fontWeight="700" fontFamily="monospace">S</text>
    <text x="41" y="26" textAnchor="middle" fontSize="5" fill="rgba(100,160,220,0.4)" fontWeight="700" fontFamily="monospace">E</text>
    <text x="7" y="26" textAnchor="middle" fontSize="5" fill="rgba(100,160,220,0.4)" fontWeight="700" fontFamily="monospace">W</text>
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════
   ZOOM BUTTON STYLE
   ══════════════════════════════════════════════════════════════════════ */
const zoomBtnStyle = {
  width:26, height:26, border:"1px solid rgba(60,140,255,0.15)",
  borderRadius:5, background:"rgba(255,255,255,0.04)", color:"#8aa0c0",
  fontSize:14, fontWeight:700, cursor:"pointer", display:"flex",
  alignItems:"center", justifyContent:"center",
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */
export default function VenueLayoutDesigner({ venue, onClose }) {
  const [hall] = useState(() => buildHall());
  const [seatStates, setSeatStates] = useState({});
  const [searchSeat, setSearchSeat] = useState("");
  const [isIso, setIsIso] = useState(true);
  const [zoom, setZoom] = useState(1);

  const totalSeats = useMemo(() =>
    hall.reduce((a, z) => a + z.rows.reduce((b, r) => b + r.reduce((c, t) =>
      c + Object.values(t.c).reduce((d, arr) => d + arr.length, 0), 0), 0), 0),
  [hall]);

  const assigned = useMemo(() =>
    Object.values(seatStates).filter(v => v === "assigned").length,
  [seatStates]);

  const highlight = useMemo(() => {
    const n = parseInt(searchSeat);
    return n > 0 && n <= totalSeats ? n : null;
  }, [searchSeat, totalSeats]);

  const toggle = useCallback(id => {
    setSeatStates(p => ({ ...p, [id]: p[id]==="assigned" ? "empty" : "assigned" }));
  }, []);

  const assignAll = useCallback(() => {
    const all = {};
    hall.forEach(z => z.rows.forEach(r => r.forEach(t =>
      Object.values(t.c).forEach(arr => arr.forEach(s => { all[s.id] = "assigned"; }))
    )));
    setSeatStates(all);
  }, [hall]);

  const clearAll = useCallback(() => setSeatStates({}), []);

  const pct = totalSeats > 0 ? Math.round(assigned / totalSeats * 100) : 0;

  return (
    <div onClick={onClose} style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      overflow:"auto", padding:"20px 0",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:"100%", maxWidth:1140, minHeight:"90vh",
        background: P.bgDark, borderRadius: 16,
        border:"1px solid rgba(60,140,255,0.12)",
        boxShadow:"0 20px 80px rgba(0,0,0,0.6), 0 0 60px rgba(60,140,255,0.05)",
        fontFamily:"'Segoe UI',system-ui,sans-serif",
        position:"relative", overflow:"hidden",
      }}>

        {/* ═══ Blueprint grid background ═══ */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none", zIndex:0,
          backgroundImage:`
            linear-gradient(${P.gridLine} 1px, transparent 1px),
            linear-gradient(90deg, ${P.gridLine} 1px, transparent 1px),
            linear-gradient(${P.gridLineBold} 1px, transparent 1px),
            linear-gradient(90deg, ${P.gridLineBold} 1px, transparent 1px)`,
          backgroundSize:"20px 20px, 20px 20px, 100px 100px, 100px 100px",
        }} />

        {/* ═══ Header ═══ */}
        <div style={{
          position:"relative", zIndex:2, display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"18px 24px",
          borderBottom:"1px solid rgba(60,140,255,0.1)",
          background:"rgba(10,22,40,0.8)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{
              width:40, height:40, borderRadius:10,
              background:"linear-gradient(135deg,#1a3a6a,#0f2548)",
              border:"1.5px solid rgba(60,140,255,0.25)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:16,
            }}>🏛️</div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:"#e0ecff", letterSpacing:0.5 }}>
                {venue?.venue_name || "Examination Hall"}
              </div>
              <div style={{ fontSize:10, color:"rgba(100,160,220,0.5)", fontFamily:"'Courier New',monospace", letterSpacing:1 }}>
                {venue?.location ? `📍 ${venue.location} · ` : ""}FLOOR PLAN BLUEPRINT
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button onClick={onClose} style={{
              background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:8, padding:"7px 16px", color:"#8aa0c0", fontSize:12,
              fontWeight:700, cursor:"pointer", letterSpacing:1,
              transition:"all 0.15s",
            }}>✕ CLOSE</button>
          </div>
        </div>

        {/* ═══ Toolbar ═══ */}
        <div style={{
          position:"relative", zIndex:2, display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"10px 24px", flexWrap:"wrap", gap:10,
          borderBottom:"1px solid rgba(60,140,255,0.06)",
          background:"rgba(10,22,40,0.5)",
        }}>
          {/* Stats */}
          <div style={{ display:"flex", gap:16, alignItems:"center" }}>
            {[
              { label:"TOTAL", value:totalSeats, color:"#7eb8f7" },
              { label:"ASSIGNED", value:assigned, color:"#34d399" },
              { label:"AVAILABLE", value:totalSeats-assigned, color:"#fbbf24" },
            ].map(s => (
              <div key={s.label} style={{ textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:900, color:s.color, fontVariantNumeric:"tabular-nums" }}>{s.value}</div>
                <div style={{ fontSize:7, color:"rgba(100,160,220,0.4)", letterSpacing:2, fontFamily:"'Courier New',monospace" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            {/* Search seat */}
            <div style={{
              display:"flex", alignItems:"center", gap:4,
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(60,140,255,0.15)",
              borderRadius:6, padding:"4px 10px",
            }}>
              <span style={{ fontSize:12 }}>🔍</span>
              <input
                type="number" min="1" max={totalSeats} placeholder="Seat #"
                value={searchSeat} onChange={e => setSearchSeat(e.target.value)}
                style={{
                  background:"transparent", border:"none", outline:"none",
                  color:"#e0ecff", width:52, fontSize:11, fontFamily:"'Courier New',monospace",
                }}
              />
            </div>

            {/* View toggle */}
            <button onClick={() => setIsIso(v => !v)} style={{
              background: isIso ? "rgba(60,140,255,0.12)" : "rgba(255,255,255,0.04)",
              border:`1px solid ${isIso ? "rgba(60,140,255,0.3)" : "rgba(255,255,255,0.1)"}`,
              borderRadius:6, padding:"5px 12px", color: isIso ? "#7eb8f7" : "#8aa0c0",
              fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:1,
            }}>{isIso ? "◈ 3D" : "▣ 2D"}</button>

            {/* Zoom */}
            <div style={{ display:"flex", alignItems:"center", gap:2 }}>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} style={zoomBtnStyle}>−</button>
              <span style={{ fontSize:10, color:"#8aa0c0", width:38, textAlign:"center", fontFamily:"monospace" }}>
                {Math.round(zoom*100)}%
              </span>
              <button onClick={() => setZoom(z => Math.min(1.8, z + 0.1))} style={zoomBtnStyle}>+</button>
            </div>

            <button onClick={assignAll} style={{
              background:"linear-gradient(135deg,#1a6a4a,#0f4830)",
              border:"1px solid rgba(52,211,153,0.3)", borderRadius:6,
              padding:"5px 14px", color:"#34d399", fontSize:10, fontWeight:700,
              cursor:"pointer", letterSpacing:1,
            }}>✓ ALL</button>
            <button onClick={clearAll} style={{
              background:"linear-gradient(135deg,#5a1a1a,#3a0f0f)",
              border:"1px solid rgba(231,76,60,0.3)", borderRadius:6,
              padding:"5px 14px", color:"#e74c3c", fontSize:10, fontWeight:700,
              cursor:"pointer", letterSpacing:1,
            }}>✕ CLEAR</button>
          </div>
        </div>

        {/* ═══ Legend ═══ */}
        <div style={{
          position:"relative", zIndex:2, display:"flex",
          justifyContent:"center", gap:18, padding:"8px 24px",
          borderBottom:"1px solid rgba(60,140,255,0.04)",
        }}>
          {[
            { color:P.seatEmpty, label:"Empty Seat", border:P.seatBorder },
            { color:P.seatAssigned, label:"Assigned", border:"#1fa06a" },
            { color:"transparent", label:"Table", border:P.tableBorder, bg:P.tableWood },
            { color:P.door, label:"Door", border:"#a02010" },
            { color:"transparent", label:"Space", border:"rgba(100,160,220,0.25)", dash:true },
          ].map(i => (
            <div key={i.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{
                width:12, height:12, borderRadius:2,
                background: i.bg || i.color,
                border: `1.5px ${i.dash ? "dashed" : "solid"} ${i.border}`,
              }} />
              <span style={{ fontSize:9, color:"rgba(100,160,220,0.45)", letterSpacing:0.5, fontFamily:"'Courier New',monospace" }}>{i.label}</span>
            </div>
          ))}
        </div>

        {/* ═══ Blueprint Floor Plan ═══ */}
        <div style={{
          position:"relative", zIndex:1,
          display:"flex", justifyContent:"center",
          padding:"24px 16px 32px", overflow:"auto",
        }}>
          <div style={{
            transform: `scale(${zoom}) ${isIso ? "perspective(1400px) rotateX(18deg) rotateZ(-1deg)" : ""}`,
            transformOrigin: "top center",
            transition: "transform 0.4s cubic-bezier(.2,.8,.3,1)",
          }}>
            {/* Hall container — walls */}
            <div style={{
              position:"relative", background:"rgba(15,31,56,0.6)",
              border:`3px solid ${P.wall}`, borderRadius:10,
              padding: 22,
              boxShadow: isIso
                ? `8px 12px 0 ${P.wallThick}, 0 20px 60px rgba(0,0,0,0.5), inset 0 0 40px rgba(60,140,255,0.03)`
                : `0 8px 40px rgba(0,0,0,0.4), inset 0 0 40px rgba(60,140,255,0.03)`,
              minWidth: 700,
            }}>
              {/* Inner wall line */}
              <div style={{
                position:"absolute", inset:6,
                border:"1px solid rgba(60,140,255,0.08)", borderRadius:6,
                pointerEvents:"none",
              }} />

              {/* Compass */}
              <div style={{ position:"absolute", top:8, right:8, zIndex:5 }}>
                <Compass />
              </div>

              {/* Hall title */}
              <div style={{
                textAlign:"center", marginBottom:16,
                fontSize:9, color:"rgba(100,160,220,0.3)",
                letterSpacing:5, textTransform:"uppercase",
                fontFamily:"'Courier New',monospace", fontWeight:700,
              }}>
                ── EXAMINATION HALL · INTERIOR LAYOUT ──
              </div>

              {/* Zones */}
              {hall.map(z => (
                <Zone key={z.id} zone={z} seatStates={seatStates} highlight={highlight} onToggle={toggle} />
              ))}

              {/* Bottom annotation */}
              <div style={{
                display:"flex", justifyContent:"space-between", alignItems:"center",
                marginTop:12, padding:"0 4px",
              }}>
                <div style={{ fontSize:8, color:"rgba(100,160,220,0.2)", fontFamily:"'Courier New',monospace" }}>
                  SCALE: 1 UNIT = 1 SEAT · DWG REF: VLD-{venue?.id || "001"}
                </div>
                <div style={{ fontSize:8, color:"rgba(100,160,220,0.2)", fontFamily:"'Courier New',monospace" }}>
                  REV 1.0 · {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Progress bar ═══ */}
        <div style={{
          position:"relative", zIndex:2,
          padding:"12px 24px 16px",
          borderTop:"1px solid rgba(60,140,255,0.06)",
          background:"rgba(10,22,40,0.5)",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <span style={{ fontSize:8, color:"rgba(100,160,220,0.35)", letterSpacing:2, fontFamily:"'Courier New',monospace" }}>
              ALLOCATION PROGRESS
            </span>
            <span style={{ fontSize:10, color:"#7eb8f7", fontWeight:700, fontFamily:"'Courier New',monospace" }}>
              {assigned} / {totalSeats} ({pct}%)
            </span>
          </div>
          <div style={{
            height:5, background:"rgba(60,140,255,0.08)", borderRadius:3, overflow:"hidden",
          }}>
            <div style={{
              height:"100%", width:`${pct}%`, borderRadius:3,
              background:"linear-gradient(90deg,#1a6a4a,#34d399)",
              transition:"width 0.3s ease",
              boxShadow: pct > 0 ? "0 0 10px rgba(52,211,153,0.3)" : "none",
            }} />
          </div>
          <div style={{
            textAlign:"center", marginTop:8, fontSize:9,
            color:"rgba(100,160,220,0.25)", fontStyle:"italic",
          }}>
            Click any seat to toggle assignment · Search by seat number to highlight
          </div>
        </div>

      </div>
    </div>
  );
}

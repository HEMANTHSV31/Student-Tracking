import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Calendar,
  Clock,
  BookOpen,
  GraduationCap,
  Loader2,
  AlertCircle,
  ClipboardX,
  Search,
  X,
  Armchair,
} from "lucide-react";
import { fetchMyAllocation } from "../../../services/assessmentVenueApi";
import "./MyAssessment.css";

/* ── helpers ─────────────────────────────────────────────────────────── */
const getColumnLabel = (index) => {
  let label = "";
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
};
const getSeatLabel = (row, col) => `${getColumnLabel(col)}${row + 1}`;

const shortDept = (d) => {
  if (!d) return "";
  const n = d.toUpperCase().trim();
  const mapping = {
    'COMPUTER SCIENCE': 'CSE', 'CS': 'CSE', 'CSE': 'CSE',
    'COMPUTER SCIENCE AND ENGINEERING': 'CSE',
    'INFORMATION TECHNOLOGY': 'IT', 'IT': 'IT',
    'COMPUTER SCIENCE AND BUSINESS SYSTEMS': 'CSBS', 'CSBS': 'CSBS',
    'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE': 'AIDS', 'AIDS': 'AIDS', 'AD': 'AIDS',
    'AIML': 'AIML', 'AL': 'AIML',
    'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING': 'AIML',
    'ELECTRICAL': 'EEE', 'EEE': 'EEE',
    'ELECTRICAL AND ELECTRONICS': 'EEE', 'ELECTRICAL AND ELECTRONICS ENGINEERING': 'EEE',
    'ELECTRONICS AND COMMUNICATION': 'ECE', 'EC': 'ECE', 'ECE': 'ECE',
    'ELECTRONICS AND COMMUNICATION ENGINEERING': 'ECE',
    'ELECTRONICS AND INSTRUMENTATION': 'E&I', 'E&I': 'E&I', 'ENDI': 'E&I', 'EI': 'E&I',
    'ELECTRONICS AND INSTRUMENTATION ENGINEERING': 'E&I', 'EIE': 'E&I',
    'MECHANICAL': 'MECH', 'MECHANICAL ENGINEERING': 'MECH', 'MECH': 'MECH',
    'MECHATRONICS': 'MECTRONIC', 'MECHATRONICS ENGINEERING': 'MECTRONIC', 'MECTRONIC': 'MECTRONIC',
    'AGRICULTURE': 'AGRI', 'AGRICULTURAL ENGINEERING': 'AGRI', 'AGRI': 'AGRI',
    'BIOTECHNOLOGY': 'BIOTECH', 'BIO TECHNOLOGY': 'BIOTECH', 'BIOTECH': 'BIOTECH',
  };
  return mapping[n] || n.replace(/[^A-Za-z&]/g, "").substring(0, 8);
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
};

const getDepartmentColor = (dept) => {
  const d = shortDept(dept);
  const map = {
    CSE: "#dbeafe", IT: "#dcfce7", ECE: "#fef9c3", EEE: "#fce7f3",
    MECH: "#ffedd5", CIVIL: "#e0e7ff", AIDS: "#f3e8ff", AIML: "#ccfbf1",
    CSBS: "#fae8ff", CSD: "#cffafe", "E&I": "#fef3c7", MECTRONIC: "#d1fae5",
    AGRI: "#d9f99d", BIOTECH: "#a7f3d0",
  };
  return map[d] || "#f1f5f9";
};

/* ══════════════════════════════════════════════════════════════════════ */
const MyAssessment = () => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlot, setActiveSlot] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedSeat, setHighlightedSeat] = useState(null);
  const scrollRef = useRef(null);

  const scrollToRef = useCallback((node) => {
    if (node) {
      scrollRef.current = node;
      requestAnimationFrame(() => {
        node.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      });
    }
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyAllocation();
      if (data.success) {
        setAllocations(data.allocations || []);
        setActiveSlot(0);
      } else {
        setError(data.message || "Something went wrong");
      }
    } catch {
      setError("Unable to fetch your assessment allocation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = useCallback((query, alloc) => {
    if (!query.trim() || !alloc?.seatMap) { setHighlightedSeat(null); return; }
    const q = query.trim().toLowerCase();
    for (let r = 0; r < alloc.seatMap.length; r++) {
      for (let c = 0; c < alloc.seatMap[r].length; c++) {
        const seat = alloc.seatMap[r][c];
        if (!seat) continue;
        if ((seat.name || "").toLowerCase().includes(q) || (seat.rollNumber || "").toLowerCase().includes(q)) {
          setHighlightedSeat((prev) => {
            if (prev?.row === r && prev?.col === c && scrollRef.current) {
              scrollRef.current.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
            }
            return { row: r, col: c };
          });
          return;
        }
      }
    }
    setHighlightedSeat(null);
  }, []);

  if (loading) {
    return <div className="ma-container"><div className="ma-loading"><Loader2 size={32} className="ma-spinner" /><span>Loading your allocation…</span></div></div>;
  }
  if (error) {
    return <div className="ma-container"><div className="ma-error"><AlertCircle size={36} /><p>{error}</p><button className="ma-retry-btn" onClick={load}>Retry</button></div></div>;
  }
  if (allocations.length === 0) {
    return (
      <div className="ma-container">
        <div className="ma-empty"><div className="ma-empty-icon"><ClipboardX size={36} /></div><h3>No Assessment Allocated</h3><p>You have not been allocated to any PBL assessment venue yet. Check back later.</p></div>
      </div>
    );
  }

  const a = allocations[activeSlot];
  const COLS = a?.columns_count || 0;
  const myR = a?.myRow != null ? a.myRow - 1 : null;
  const myC = a?.myCol != null ? a.myCol - 1 : null;
  const mySeatLabel = myR != null && myC != null ? getSeatLabel(myR, myC) : "—";

  return (
    <div className="ma-container">
      {/* ── Info Card ───────────────────── */}
      <div className="ma-info-card">
        <div className="ma-info-grid">
          <div className="ma-info-item">
            <div className="ma-info-ico venue"><MapPin size={18} /></div>
            <span className="ma-info-lbl">Venue</span>
            <span className="ma-info-val">{a.venue}</span>
          </div>
          <div className="ma-info-item">
            <div className="ma-info-ico seat"><Armchair size={18} /></div>
            <span className="ma-info-lbl">Your Seat</span>
            <span className="ma-info-val ma-info-seat">{mySeatLabel}</span>
          </div>
          <div className="ma-info-item">
            <div className="ma-info-ico date"><Calendar size={18} /></div>
            <span className="ma-info-lbl">Date</span>
            <span className="ma-info-val">{formatDate(a.slot_date)}</span>
          </div>
          <div className="ma-info-item">
            <div className="ma-info-ico time"><Clock size={18} /></div>
            <span className="ma-info-lbl">Time</span>
            <span className="ma-info-val">{formatTime(a.start_time)}{a.end_time ? ` – ${formatTime(a.end_time)}` : ""}</span>
          </div>
          {a.subject_code && (
            <div className="ma-info-item">
              <div className="ma-info-ico subj"><BookOpen size={18} /></div>
              <span className="ma-info-lbl">Subject</span>
              <span className="ma-info-val">{a.subject_code}</span>
            </div>
          )}
          {a.year && (
            <div className="ma-info-item">
              <div className="ma-info-ico year"><GraduationCap size={18} /></div>
              <span className="ma-info-lbl">Year</span>
              <span className="ma-info-val">{a.year}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Search + Slot Tabs + Legend ──────────────── */}
      <div className="ma-toolbar">
        <div className="ma-search-bar">
          <Search size={16} className="ma-search-icon" />
          <input
            type="text"
            placeholder="Search by name or register number…"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value, a); }}
            className="ma-search-input"
          />
          {searchQuery && (
            <button className="ma-search-clear" onClick={() => { setSearchQuery(""); setHighlightedSeat(null); }}>
              <X size={14} />
            </button>
          )}
        </div>
        {allocations.length > 1 && (
          <div className="ma-slot-tabs-inline">
            {allocations.map((s, i) => (
              <button
                key={i}
                className={`ma-slot-tab-sm ${activeSlot === i ? "ma-slot-tab-sm-active" : ""}`}
                onClick={() => { setActiveSlot(i); setSearchQuery(""); setHighlightedSeat(null); }}
              >
                <Clock size={13} className="ma-tab-icon" />
                <span className="ma-tab-title-sm">{s.slot_label || `Slot ${i + 1}`}</span>
                <span className="ma-tab-time-sm">{formatTime(s.start_time)}{s.end_time ? ` – ${formatTime(s.end_time)}` : ""}</span>
              </button>
            ))}
          </div>
        )}
        <div className="ma-legend">
          <span className="ma-legend-item"><span className="ma-legend-dot ma-legend-you" />You</span>
          <span className="ma-legend-item"><span className="ma-legend-dot ma-legend-search" />Search</span>
          <span className="ma-legend-item"><span className="ma-legend-dot ma-legend-occ" />Occupied</span>
          <span className="ma-legend-item"><span className="ma-legend-dot ma-legend-empty" />Empty</span>
        </div>
      </div>

      {/* ── Seat Map (admin-style) ──────── */}
      <div className="ma-seatmap-scroll">
        <div className="ma-seatmap" style={{ "--ma-seat-columns": COLS }}>
          {/* Column headers */}
          <div className="ma-col-headers">
            <div className="ma-rh-spacer" />
            {Array.from({ length: COLS }, (_, i) => (
              <div key={i} className={`ma-col-header ${myC === i ? "ma-col-header-hl" : ""}`}>{getColumnLabel(i)}</div>
            ))}
          </div>

          {/* Seat rows */}
          {(a.seatMap || []).map((row, rIdx) => (
            <div key={rIdx} className="ma-seat-row">
              <div className={`ma-row-header ${myR === rIdx ? "ma-row-header-hl" : ""}`}>{rIdx + 1}</div>
              {row.map((seat, cIdx) => {
                const isMe = rIdx === myR && cIdx === myC;
                const isSearchHit = highlightedSeat?.row === rIdx && highlightedSeat?.col === cIdx;
                const label = getSeatLabel(rIdx, cIdx);
                const dept = shortDept(seat?.normalizedDept || seat?.department);

                let cls = "ma-seat";
                if (isMe) cls += " ma-seat-me";
                else if (isSearchHit) cls += " ma-seat-search-hl";
                else if (seat) cls += " ma-seat-occ";
                else cls += " ma-seat-empty";

                return (
                  <div
                    key={cIdx}
                    className={cls}
                    ref={isSearchHit ? scrollToRef : null}
                    style={seat && !isMe && !isSearchHit ? { background: getDepartmentColor(seat.normalizedDept || seat.department) } : {}}
                    title={seat ? `${label}  •  ${seat.name}\n${seat.rollNumber}  •  ${dept}` : "Empty"}
                  >
                    {seat ? (
                      <div className="ma-seat-inner">
                        <span className="ma-seat-no">{label}</span>
                        <span className="ma-seat-dept">{dept}</span>
                        <span className="ma-seat-reg">{seat.rollNumber || ""}</span>
                      </div>
                    ) : (
                      <span className="ma-seat-dash">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyAssessment;    

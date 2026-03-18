import React, { useState, useEffect } from 'react';
import { Layers, RefreshCw, Save, Trash2, CheckCircle, AlertTriangle, Plus, ChevronUp, ChevronDown, X, BarChart3, Calendar } from 'lucide-react';
import { updateCluster as updateClusterApi, deleteClusterYear as deleteClusterYearApi } from '../../../../../services/assessmentVenueApi';
import './DeptClusters.css';

const DeptClusters = ({ clusterData, loading, onRefresh }) => {
  const [clusterActiveYear, setClusterActiveYear] = useState(1);
  const [clusterEditCS, setClusterEditCS] = useState([]);
  const [clusterEditCore, setClusterEditCore] = useState([]);
  const [clusterEditPattern, setClusterEditPattern] = useState('CS_FIRST');
  const [clusterNewCsDept, setClusterNewCsDept] = useState('');
  const [clusterNewCoreDept, setClusterNewCoreDept] = useState('');
  const [clusterSaving, setClusterSaving] = useState(false);
  const [clusterSaveMsg, setClusterSaveMsg] = useState('');

  const clusterYears = [1, 2, 3, 4];
  const getClusterForYear = (yr, type) => clusterData.find(c => c.year === yr && c.cluster_type === type);

  // --- Effect: Load clusters into editor state when year changes ---
  useEffect(() => {
    const csRow = clusterData.find(c => c.year === clusterActiveYear && c.cluster_type === 'CS');
    const coreRow = clusterData.find(c => c.year === clusterActiveYear && c.cluster_type === 'Core');
    if (csRow) {
      setClusterEditCS(csRow.departments);
      setClusterEditPattern(csRow.column_pattern || 'CS_FIRST');
    } else {
      setClusterEditCS(['CSE', 'IT', 'AIDS', 'AIML', 'CSBS']);
      setClusterEditPattern('CS_FIRST');
    }
    
    if (coreRow) {
      setClusterEditCore(coreRow.departments);
    } else {
      setClusterEditCore(['ECE', 'EEE', 'E&I', 'MECH', 'MECTRONIC', 'AGRI', 'BIOTECH']);
    }
    setClusterSaveMsg('');
  }, [clusterActiveYear, clusterData]);

  const handleClusterSave = async () => {
    setClusterSaving(true);
    setClusterSaveMsg('');
    try {
      const res = await updateClusterApi(clusterActiveYear, {
        cs_departments: clusterEditCS,
        core_departments: clusterEditCore,
        column_pattern: clusterEditPattern,
      });
      if (res.success) {
        setClusterSaveMsg('Saved successfully!');
        await onRefresh();
      } else {
        setClusterSaveMsg(res.message || 'Save failed');
      }
    } catch {
      setClusterSaveMsg('Failed to save');
    } finally {
      setClusterSaving(false);
    }
  };

  const handleDeleteClusterYear = async (yr) => {
    if (!window.confirm(`Delete cluster config for Year ${yr}?`)) return;
    try {
      await deleteClusterYearApi(yr);
      await onRefresh();
    } catch {
      /* silent */
    }
  };

  const moveClusterDept = (list, setList, idx, dir) => {
    const arr = [...list];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setList(arr);
  };

  const addClusterDept = (list, setList, value, clearFn) => {
    const d = value.trim().toUpperCase();
    if (!d) return;
    if (clusterEditCS.includes(d) || clusterEditCore.includes(d)) {
      alert(`"${d}" already in a cluster!`);
      return;
    }
    setList([...list, d]);
    clearFn('');
  };

  const removeClusterDept = (list, setList, idx) => setList(list.filter((_, i) => i !== idx));

  return (
    <div className="aa-clusters-tab">
      <div className="aa-topbar">
        <div className="aa-cl-year-pills">
          {clusterYears.map(yr => {
            const configured = !!getClusterForYear(yr, 'CS');
            return (
              <button
                key={yr}
                className={`aa-cl-year-pill ${clusterActiveYear === yr ? 'aa-cl-year-pill-active' : ''}`}
                onClick={() => setClusterActiveYear(yr)}
              >
                <span className="aa-cl-yr-text">Year {yr}</span>
                {configured && <span className="aa-cl-yr-dot" />}
              </button>
            );
          })}
        </div>
        <div className="aa-topbar-actions">
          <div className="aa-cl-pattern-toggle">
            <button
              className={`aa-cl-pat-btn ${clusterEditPattern === 'CS_FIRST' ? 'aa-cl-pat-active' : ''}`}
              onClick={() => setClusterEditPattern('CS_FIRST')}
            >
              CS First
            </button>
            <button
              className={`aa-cl-pat-btn ${clusterEditPattern === 'CORE_FIRST' ? 'aa-cl-pat-active' : ''}`}
              onClick={() => setClusterEditPattern('CORE_FIRST')}
            >
              Core First
            </button>
          </div>
          <button
            className="aa-btn aa-btn-primary aa-btn-sm"
            onClick={handleClusterSave}
            disabled={clusterSaving}
          >
            <Save size={14} /> {clusterSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            className="aa-btn aa-btn-danger aa-btn-sm"
            onClick={() => handleDeleteClusterYear(clusterActiveYear)}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>

      {clusterSaveMsg && (
        <div className={`aa-cl-toast ${clusterSaveMsg.includes('success') ? 'aa-cl-toast-ok' : 'aa-cl-toast-err'}`}>
          {clusterSaveMsg.includes('success') ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {clusterSaveMsg}
        </div>
      )}

      {loading ? (
        <div className="aa-table-card">
          <div className="aa-loading-overlay"><RefreshCw size={20} className="aa-spin" /> Loading...</div>
          <div style={{ height: 200 }} />
        </div>
      ) : (
        <div className="aa-cl-two-col">
          <div className="aa-table-card">
            <div className="aa-cl-table-header">
              <div className="aa-cl-table-title">
                <span className="aa-cl-title-dot aa-cl-dot-cs" />
                <span>CS Cluster</span>
                <span className="aa-cl-title-count">{clusterEditCS.length}</span>
              </div>
              <div className="aa-cl-add-wrap">
                <input
                  type="text"
                  className="aa-cl-add-input"
                  placeholder="Add department..."
                  value={clusterNewCsDept}
                  onChange={e => setClusterNewCsDept(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && addClusterDept(clusterEditCS, setClusterEditCS, clusterNewCsDept, setClusterNewCsDept)}
                />
                <button
                  className="aa-icon-btn aa-icon-primary"
                  onClick={() => addClusterDept(clusterEditCS, setClusterEditCS, clusterNewCsDept, setClusterNewCsDept)}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            {clusterEditCS.length === 0 ? (
              <div className="aa-empty-state aa-empty-sm">
                <Layers size={28} strokeWidth={1.5} />
                <p>No CS departments configured</p>
              </div>
            ) : (
              <div className="aa-table-wrap">
                <table className="aa-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Department</th>
                      <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusterEditCS.map((dept, i) => (
                      <tr key={dept}>
                        <td><span className="aa-cl-row-num">{i + 1}</span></td>
                        <td><span className="aa-cl-dept-badge aa-cl-badge-cs">{dept}</span></td>
                        <td>
                          <div className="aa-cl-row-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="aa-icon-btn"
                              onClick={() => moveClusterDept(clusterEditCS, setClusterEditCS, i, 'up')}
                              disabled={i === 0}
                              title="Move up"
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              className="aa-icon-btn"
                              onClick={() => moveClusterDept(clusterEditCS, setClusterEditCS, i, 'down')}
                              disabled={i === clusterEditCS.length - 1}
                              title="Move down"
                            >
                              <ChevronDown size={13} />
                            </button>
                            <button
                              className="aa-icon-btn aa-icon-danger"
                              onClick={() => removeClusterDept(clusterEditCS, setClusterEditCS, i)}
                              title="Remove"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="aa-table-card">
            <div className="aa-cl-table-header">
              <div className="aa-cl-table-title">
                <span className="aa-cl-title-dot aa-cl-dot-core" />
                <span>Core Cluster</span>
                <span className="aa-cl-title-count">{clusterEditCore.length}</span>
              </div>
              <div className="aa-cl-add-wrap">
                <input
                  type="text"
                  className="aa-cl-add-input"
                  placeholder="Add department..."
                  value={clusterNewCoreDept}
                  onChange={e => setClusterNewCoreDept(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && addClusterDept(clusterEditCore, setClusterEditCore, clusterNewCoreDept, setClusterNewCoreDept)}
                />
                <button
                  className="aa-icon-btn aa-icon-primary"
                  onClick={() => addClusterDept(clusterEditCore, setClusterEditCore, clusterNewCoreDept, setClusterNewCoreDept)}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            {clusterEditCore.length === 0 ? (
              <div className="aa-empty-state aa-empty-sm">
                <Layers size={28} strokeWidth={1.5} />
                <p>No Core departments configured</p>
              </div>
            ) : (
              <div className="aa-table-wrap">
                <table className="aa-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Department</th>
                      <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clusterEditCore.map((dept, i) => (
                      <tr key={dept}>
                        <td><span className="aa-cl-row-num">{i + 1}</span></td>
                        <td><span className="aa-cl-dept-badge aa-cl-badge-core">{dept}</span></td>
                        <td>
                          <div className="aa-cl-row-actions" style={{ justifyContent: 'flex-end' }}>
                            <button
                              className="aa-icon-btn"
                              onClick={() => moveClusterDept(clusterEditCore, setClusterEditCore, i, 'up')}
                              disabled={i === 0}
                              title="Move up"
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              className="aa-icon-btn"
                              onClick={() => moveClusterDept(clusterEditCore, setClusterEditCore, i, 'down')}
                              disabled={i === clusterEditCore.length - 1}
                              title="Move down"
                            >
                              <ChevronDown size={13} />
                            </button>
                            <button
                              className="aa-icon-btn aa-icon-danger"
                              onClick={() => removeClusterDept(clusterEditCore, setClusterEditCore, i)}
                              title="Remove"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="aa-table-card" style={{ marginTop: 20 }}>
        <div className="aa-cl-table-header aa-cl-overview-header">
          <div className="aa-cl-table-title">
            <BarChart3 size={16} />
            <span>All Years Overview</span>
          </div>
        </div>
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Year</th>
                <th>CS Departments</th>
                <th>Core Departments</th>
                <th style={{ width: 120 }}>Pattern</th>
                <th style={{ width: 80 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {clusterYears.map(yr => {
                const csRow = getClusterForYear(yr, 'CS');
                const coreRow = getClusterForYear(yr, 'Core');
                const configured = !!csRow;
                return (
                  <tr
                    key={yr}
                    className={clusterActiveYear === yr ? 'aa-row-highlight' : ''}
                    onClick={() => setClusterActiveYear(yr)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <div className="aa-venue-cell">
                        <div className="aa-venue-cell-name">Year {yr}</div>
                        <div className="aa-venue-cell-sub">
                          <Calendar size={11} /> {yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year
                        </div>
                      </div>
                    </td>
                    <td>
                      {csRow ? (
                        <div className="aa-cl-dept-chips">
                          {csRow.departments.map(d => <span key={d} className="aa-cl-chip aa-cl-chip-cs">{d}</span>)}
                        </div>
                      ) : <span className="aa-muted">Not configured</span>}
                    </td>
                    <td>
                      {coreRow ? (
                        <div className="aa-cl-dept-chips">
                          {coreRow.departments.map(d => <span key={d} className="aa-cl-chip aa-cl-chip-core">{d}</span>)}
                        </div>
                      ) : <span className="aa-muted">Not configured</span>}
                    </td>
                    <td>
                      <span className="aa-badge aa-badge-blue">
                        {csRow?.column_pattern === 'CORE_FIRST' ? 'Core First' : csRow ? 'CS First' : '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`aa-status-badge ${configured ? 'aa-status-active' : 'aa-status-inactive'}`}>
                        {configured ? 'Active' : 'Empty'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeptClusters;
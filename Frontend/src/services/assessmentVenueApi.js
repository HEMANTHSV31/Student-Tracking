import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

const BASE = '/assessment-venues';

// ── Venues ───────────────────────────────────────────────────────────────
export const fetchVenues = async () => {
  const res = await apiGet(BASE);
  return res.json();
};

export const createVenue = async (data) => {
  const res = await apiPost(BASE, data);
  return res.json();
};

export const updateVenue = async (id, data) => {
  const res = await apiPut(`${BASE}/${id}`, data);
  return res.json();
};

export const deleteVenue = async (id) => {
  const res = await apiDelete(`${BASE}/${id}`);
  return res.json();
};

// ── Slots ────────────────────────────────────────────────────────────────
export const fetchSlots = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const res = await apiGet(`${BASE}/slots${qs ? '?' + qs : ''}`);
  return res.json();
};

export const createSlot = async (data) => {
  const res = await apiPost(`${BASE}/slots`, data);
  return res.json();
};

export const deleteSlot = async (id) => {
  const res = await apiDelete(`${BASE}/slots/${id}`);
  return res.json();
};

export const updateSlotStatus = async (id, status) => {
  const res = await apiPut(`${BASE}/slots/${id}/status`, { status });
  return res.json();
};

// ── Department Clusters ──────────────────────────────────────────────────
export const fetchClusters = async (year) => {
  const qs = year ? `?year=${year}` : '';
  const res = await apiGet(`${BASE}/clusters${qs}`);
  return res.json();
};

export const updateCluster = async (year, data) => {
  const res = await apiPut(`${BASE}/clusters/${year}`, data);
  return res.json();
};

export const deleteClusterYear = async (year) => {
  const res = await apiDelete(`${BASE}/clusters/${year}`);
  return res.json();
};

// ── Allocations ──────────────────────────────────────────────────────────
export const saveAllocation = async (slotId, allocationData, overallStats) => {
  const res = await apiPost(`${BASE}/allocations`, {
    slot_id: slotId,
    allocation_data: allocationData,
    overall_stats: overallStats,
  });
  return res.json();
};

export const fetchAllocation = async (slotId) => {
  const res = await apiGet(`${BASE}/allocations/${slotId}`);
  return res.json();
};

export const deleteAllocation = async (slotId) => {
  const res = await apiDelete(`${BASE}/allocations/${slotId}`);
  return res.json();
};

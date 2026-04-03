import { apiGet, apiPost, apiPut, apiDelete } from '../utils/api';

const BASE = '/assessment-venues';

const parseApiResponse = async (response, fallbackMessage) => {
  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    return {
      success: false,
      message: fallbackMessage || `Request failed with status ${response.status}`,
      status: response.status,
      data: null,
    };
  }

  if (!response.ok || data?.success === false) {
    return {
      success: false,
      message: data?.message || fallbackMessage || `Request failed with status ${response.status}`,
      status: response.status,
      data: data?.data ?? null,
    };
  }

  return {
    ...data,
    status: response.status,
  };
};

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

export const toggleVenueStatus = async (id, status) => {
  const res = await apiPut(`${BASE}/${id}/status`, { status });
  return res.json();
};

// ── Venue Layout Designer ────────────────────────────────────────────────
export const fetchVenueLayout = async (id) => {
  const res = await apiGet(`${BASE}/${id}/layout`);
  return res.json();
};

export const saveVenueLayout = async (id, layoutData) => {
  const res = await apiPut(`${BASE}/${id}/layout`, { layout_data: layoutData });
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

// ── Year-wise Courses ──────────────────────────────────────────────────
export const fetchYearCourses = async (year) => {
  const qs = year ? `?year=${year}` : '';
  const res = await apiGet(`${BASE}/courses${qs}`);
  return res.json();
};

export const addYearCourse = async (data) => {
  const res = await apiPost(`${BASE}/courses`, data);
  return res.json();
};

export const updateYearCourse = async (id, data) => {
  const res = await apiPut(`${BASE}/courses/${id}`, data);
  return res.json();
};

export const deleteYearCourse = async (id) => {
  const res = await apiDelete(`${BASE}/courses/${id}`);
  return res.json();
};

// ── Course-wise Student Specifications ─────────────────────────────────
export const fetchCourseSpecs = async (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const res = await apiGet(`${BASE}/course-specs${qs ? '?' + qs : ''}`);
  return parseApiResponse(res, 'Failed to load course-wise specifications');
};

export const uploadCourseSpecs = async (formData) => {
  const res = await apiPost(`${BASE}/course-specs/upload`, formData);
  return parseApiResponse(res, 'Failed to upload course-wise specifications');
};

export const downloadCourseSpecsTemplate = async () => {
  return apiGet(`${BASE}/course-specs/template`);
};

export const fetchCourseSpecsDepartments = async (year) => {
  const qs = year ? `?year=${year}` : '';
  const res = await apiGet(`${BASE}/course-specs/departments${qs}`);
  return parseApiResponse(res, 'Failed to fetch departments');
};

export const deleteCourseSpec = async (id) => {
  const res = await apiDelete(`${BASE}/course-specs/${id}`);
  return parseApiResponse(res, 'Failed to delete course specification');
};

export const deleteAllCourseSpecs = async (year) => {
  const res = await apiDelete(`${BASE}/course-specs/year/${year}`);
  return parseApiResponse(res, 'Failed to delete all course specifications');
};

export const updateCourseSpec = async (id, courseData) => {
  const res = await apiPut(`${BASE}/course-specs/${id}`, courseData);
  return parseApiResponse(res, 'Failed to update course specification');
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

// ── Student: my allocation ───────────────────────────────────────────────
export const fetchMyAllocation = async () => {
  const res = await apiGet(`${BASE}/my-allocation`);
  return res.json();
};

// ── Attendance ───────────────────────────────────────────────────────────
export const fetchAttendance = async (slotId) => {
  const res = await apiGet(`${BASE}/attendance/${slotId}`);
  return res.json();
};

export const saveAttendance = async (slotId, attendanceData, venueName = null) => {
  const res = await apiPost(`${BASE}/attendance/${slotId}`, {
    attendance_data: attendanceData,
    venue_name: venueName,
  });
  return res.json();
};

export const fetchAttendanceStats = async (slotId) => {
  const res = await apiGet(`${BASE}/attendance-stats/${slotId}`);
  return res.json();
};

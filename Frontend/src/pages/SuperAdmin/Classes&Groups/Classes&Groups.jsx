import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Search,
  KeyboardArrowDown,
  MoreVert,
  Edit,
  Delete,
  Add,
  Groups,
  Upload,
  Person,
  LocationOn,
  Close,
  GetApp,
  CheckCircle,
  Error as ErrorIcon,
} from "@mui/icons-material";
import useAuthStore from "../../../store/useAuthStore";
import { encodeIdSimple } from "../../../utils/idEncoder";
import { apiGet, apiPost, apiPut, apiDelete } from '../../../utils/api';

const GroupsClasses = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/pbl/api';

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedYear, setSelectedYear] = useState(""); // Year filter state
  const [specificationFilter, setSpecificationFilter] = useState(""); // Specification filter state
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenu, setActiveMenu] = useState(null);
  const [editingVenue, setEditingVenue] = useState(null);
  const [venues, setVenues] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showAssignFacultyModal, setShowAssignFacultyModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venueStudents, setVenueStudents] = useState([]);
  const [overwriteMode, setOverwriteMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");

  // Faculty search and availability
  const [facultySearch, setFacultySearch] = useState("");
  const [availableFaculties, setAvailableFaculties] = useState({
    available: [],
    current: null,
    total: 0,
  });
  const [loadingFaculties, setLoadingFaculties] = useState(false);

  // Success/Failure Modal States
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModal, setResultModal] = useState({
    type: "success",
    title: "",
    message: "",
  });

  const itemsPerPage = 6;

  const [newVenue, setNewVenue] = useState({
    venue_name: "",
    capacity: 50,
    location: "",
    assigned_faculty_id: "",
    year: "",
    group_specification: "",
  });

  // Specifications for the top filter (year-scoped)
  const [groupSpecifications, setGroupSpecifications] = useState([]);
  // Specifications for create/edit datalists (all)
  const [allGroupSpecifications, setAllGroupSpecifications] = useState([]);

  const [facultyAssignment, setFacultyAssignment] = useState({
    venue_id: "",
    faculty_id: "",
  });

  const [newStudent, setNewStudent] = useState({
    reg_no: "",
    name: "",
    email: "",
    department: "",
    year: "1",
    semester: "1"
  });
  const [showDroppedStudents, setShowDroppedStudents] = useState(false);

  // Show Result Modal Function
  const showResult = (type, title, message) => {
    setResultModal({ type, title, message });
    setShowResultModal(true);
  };

  const fetchVenues = async () => {
    setLoading(true);
    setError("");
    try {
      const queryParams = [];
      if (selectedYear) queryParams.push(`year=${selectedYear}`);
      if (specificationFilter) queryParams.push(`specification=${encodeURIComponent(specificationFilter)}`);
      const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
      const response = await apiGet(`/groups/venues${queryString}`);
      const data = await response.json();
      if (data.success) {
        setVenues(data.data);
      } else {
        setError(data.message || "Failed to fetch venues");
      }
    } catch (err) {
      console.error("Error fetching venues:", err);
      setError("Failed to fetch venues");
    } finally {
      setLoading(false);
    }
  };

  // Fetch faculties (only unassigned)
  const fetchFaculties = async () => {
    try {
      const response = await apiGet('/groups/faculties/available');

      const data = await response.json();
      if (data.success) {
        setFaculties(data.data.available.filter((f) => f.workload === 0));
      }
    } catch (err) {
      console.error("Error fetching faculties:", err);
    }
  };

  // Fetch group specifications
  // - `forFilter=true`: fetch year-scoped specs for the filter dropdown (year can be "" for all-years)
  // - `forFilter=false`: fetch all specs for create/edit datalists
  const fetchGroupSpecifications = async ({ year = '', forFilter = false } = {}) => {
    try {
      const yearParam = year ? `?year=${year}` : '';
      const response = await apiGet(`/groups/venues/group-specifications${yearParam}`);
      const data = await response.json();
      if (data.success) {
        const specs = data.data || [];
        if (forFilter) {
          setGroupSpecifications(specs);

          // Clear spec filter if it's not valid for the selected year
          if (specificationFilter && !specs.includes(specificationFilter)) {
            setSpecificationFilter('');
          }
        } else {
          setAllGroupSpecifications(specs);
        }
      }
    } catch (err) {
      console.error("Error fetching group specifications:", err);
    }
  };

  // Fetch available faculties with workload info
  const fetchAvailableFaculties = async (venueId, search = "") => {
    setLoadingFaculties(true);
    try {
      const url = new URL('/groups/faculties/available', window.location.origin);
      if (venueId) url.searchParams.append("venueId", venueId);
      if (search) url.searchParams.append("search", search);

      const response = await apiGet(url.pathname + url.search);

      const data = await response.json();
      if (data.success) {
        setAvailableFaculties(data.data);
      }
    } catch (err) {
      console.error("Error fetching available faculties:", err);
    } finally {
      setLoadingFaculties(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchFaculties();
    fetchGroupSpecifications(); // all specs for create/edit
  }, []);

  // Re-fetch venues + year-scoped specifications when year changes
  useEffect(() => {
    fetchVenues();
    fetchGroupSpecifications({ year: selectedYear, forFilter: true });
    setCurrentPage(1);
  }, [selectedYear]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [specificationFilter, statusFilter, searchTerm]);

  useEffect(() => {
    if (showAssignFacultyModal) {
      const timer = setTimeout(() => {
        fetchAvailableFaculties(facultyAssignment.venue_id, facultySearch);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [facultySearch, showAssignFacultyModal]);

  const filteredData = venues.filter((v) => {
    const matchesSearch =
      v.venue_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.faculty_name &&
        v.faculty_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (v.location &&
        v.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || v.status === statusFilter;
    const matchesSpecification = !specificationFilter || v.group_specification === specificationFilter;
    return matchesSearch && matchesStatus && matchesSpecification;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIdx, startIdx + itemsPerPage);

  useEffect(() => {
    if (!activeMenu) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setActiveMenu(null);
    };

    // Close on scroll/resize so the menu never drifts away from its anchor.
    const handleViewportChange = () => setActiveMenu(null);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [activeMenu]);

  const openMenu = (e, venueId) => {
    e.stopPropagation();
    const anchorEl = e.currentTarget;
    setActiveMenu((prev) =>
      prev?.venueId === venueId ? null : { venueId, anchorEl }
    );
  };

  const closeMenu = () => setActiveMenu(null);

  const menuVenue = activeMenu
    ? currentData.find((v) => v.venue_id === activeMenu.venueId) ||
      venues.find((v) => v.venue_id === activeMenu.venueId)
    : null;

  const getMenuPosition = () => {
    const anchorEl = activeMenu?.anchorEl;
    if (!anchorEl || typeof anchorEl.getBoundingClientRect !== "function") {
      return { top: 0, left: 0 };
    }

    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = 240;
    const estimatedHeight = 320;
    const gutter = 12;

    let left = rect.right - menuWidth;
    left = Math.max(gutter, Math.min(left, window.innerWidth - menuWidth - gutter));

    let top = rect.bottom + 8;
    if (top + estimatedHeight > window.innerHeight - gutter) {
      top = rect.top - estimatedHeight - 8;
      top = Math.max(gutter, top);
    }

    return { top, left };
  };

  const handleEdit = (venue) => {
    setEditingVenue({
      venue_id: venue.venue_id,
      venue_name: venue.venue_name,
      capacity: venue.capacity,
      location: venue.location,
      year: venue.venue_year || '',
      group_specification: venue.group_specification || '',
      assigned_faculty_id: venue.faculty_id,
      status: venue.status,
    });
    setActiveMenu(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this venue?  All students will be removed."))
      return;

    setLoading(true);
    try {
      const response = await apiDelete(`/groups/venues/${id}`);
      const data = await response.json();
      if (data.success) {
        await fetchVenues();
        showResult("success", "Venue Deleted", data.message);
      } else {
        showResult("error", "Deletion Failed", data.message);
      }
    } catch (err) {
      console.error("Error deleting venue:", err);
      showResult(
        "error",
        "Deletion Failed",
        "Failed to delete venue.  Please try again."
      );
    } finally {
      setLoading(false);
      setActiveMenu(null);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await apiPut(
        `/groups/venues/${editingVenue.venue_id}`,
        editingVenue
      );
      const data = await response.json();
      if (data.success) {
        await fetchVenues();
        await fetchGroupSpecifications(); // Refresh create/edit specs
        await fetchGroupSpecifications({ year: selectedYear, forFilter: true }); // Refresh filter specs
        setEditingVenue(null);
        showResult("success", "Venue Updated", data.message);
      } else {
        showResult("error", "Update Failed", data.message);
      }
    } catch (err) {
      console.error("Error updating venue:", err);
      showResult(
        "error",
        "Update Failed",
        "Failed to update venue. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVenue = async () => {
    if (!newVenue.venue_name || !newVenue.capacity) {
      showResult(
        "error",
        "Missing Information",
        "Please fill in venue name and capacity."
      );
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost('/groups/venues', newVenue);

      const data = await response.json();
      if (data.success) {
        await fetchVenues();
        await fetchGroupSpecifications(); // Refresh create/edit specs
        await fetchGroupSpecifications({ year: selectedYear, forFilter: true }); // Refresh filter specs
        setShowCreateModal(false);
        setNewVenue({
          venue_name: "",
          capacity: 50,
          location: "",
          assigned_faculty_id: "",
          year: "",
          group_specification: "",
        });
        showResult("success", "Venue Created", data.message);
      } else {
        showResult("error", "Creation Failed", data.message);
      }
    } catch (err) {
      console.error("Error creating venue:", err);
      showResult(
        "error",
        "Creation Failed",
        "Failed to create venue. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      showResult(
        "error",
        "No File Selected",
        "Please select an Excel file to upload."
      );
      return;
    }

    if (!selectedVenue) {
      showResult("error", "No Venue Selected", "Please select a venue first.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      const url = `/groups/venues/${selectedVenue.venue_id}/bulk-upload${overwriteMode ? '?overwrite=true' : ''}`;
      const response = await apiPost(url, formData);
      const data = await response.json();
      if (data.success) {
        setShowBulkUploadModal(false);
        setSelectedFile(null);
        setSelectedVenue(null);
        setOverwriteMode(false);
        await fetchVenues();
        showResult("success", "Upload Successful", data.message);
      } else {
        showResult("error", "Upload Failed", data.message);
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      showResult(
        "error",
        "Upload Failed",
        "Failed to upload file. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Lookup student by roll number for auto-fill
  const lookupStudent = async (rollNumber) => {
    if (!rollNumber || rollNumber.trim().length < 2) return;
    
    try {
      const response = await apiGet(
        `/groups/student-lookup/${encodeURIComponent(rollNumber.trim())}`
      );
      const data = await response.json();
      if (data.success && data.data) {
        // Auto-fill the form with existing student data
        setNewStudent(prev => ({
          ...prev,
          name: data.data.name || prev.name,
          email: data.data.email || prev.email,
          department: data.data.department || prev.department,
          year: String(data.data.year || prev.year),
          semester: String(data.data.semester || prev.semester)
        }));
        // Show info if student is already in a venue
        if (data.data.current_venue) {
          showResult("info", "Student Found", `${data.data.name} is currently in "${data.data.current_venue}". Adding will move them to the new venue.`);
        }
      }
    } catch (err) {
      // Silently fail - student might not exist yet
      // console.log("Student lookup:", err.message);
    }
  };

  // Debounced roll number change handler
  const handleRollNumberChange = (value) => {
    setNewStudent(prev => ({ ...prev, reg_no: value }));
    
    // Clear timeout if exists
    if (window.studentLookupTimeout) {
      clearTimeout(window.studentLookupTimeout);
    }
    
    // Debounce the lookup
    window.studentLookupTimeout = setTimeout(() => {
      lookupStudent(value);
    }, 500);
  };

  const handleAddIndividualStudent = async () => {
    if (!newStudent.reg_no) {
      showResult("error", "Missing Information", "Please enter the Roll Number.");
      return;
    }

    if (!selectedVenue) {
      showResult("error", "No Venue Selected", "Please select a venue first.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost(
        `/groups/venues/${selectedVenue.venue_id}/add-student`,
        {
          name: newStudent.name || newStudent.reg_no,
          rollNumber: newStudent.reg_no,
          email: newStudent.email || undefined,
          department: newStudent.department || "General",
          year: parseInt(newStudent.year) || 1,
          semester: parseInt(newStudent.semester) || 1
        }
      );
      const data = await response.json();
      if (data.success) {
        setShowAddStudentModal(false);
        setNewStudent({ reg_no: "", name: "", email: "", department: "", year: "1", semester: "1" });
        setSelectedVenue(null);
        await fetchVenues();
        showResult("success", "Student Added Successfully", data.message || "Student has been added to the class successfully.");
      } else {
        showResult("error", "Failed to Add Student", data.message || "An error occurred while adding the student.");
      }
    } catch (err) {
      console.error("Error adding student:", err);
      showResult(
        "error",
        "Failed to Add Student",
        "An error occurred while adding the student. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewStudents = async (venue, includeDropped = false) => {
    setSelectedVenue(venue);
    setLoading(true);
    try {
      const url = includeDropped 
        ? `/groups/venues/${venue.venue_id}/students?includeDropped=true`
        : `/groups/venues/${venue.venue_id}/students`;
      const response = await apiGet(url);
      const data = await response.json();
      if (data.success) {
        setVenueStudents(data.data);
        setShowStudentsModal(true);
        setShowDroppedStudents(includeDropped);
      }
    } catch (err) {
      console.error("Error fetching students:", err);
      showResult(
        "error",
        "Fetch Failed",
        "Failed to fetch students. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleShowDropped = async () => {
    const newValue = !showDroppedStudents;
    setShowDroppedStudents(newValue);
    if (selectedVenue) {
      await handleViewStudents(selectedVenue, newValue);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!window.confirm("Remove this student from venue?")) return;

    setLoading(true);
    try {
      const response = await apiDelete(
        `/groups/venues/${selectedVenue.venue_id}/students/${studentId}`
      );

      const data = await response.json();
      if (data.success) {
        await handleViewStudents(selectedVenue);
        await fetchVenues();
        showResult("success", "Student Removed", data.message);
      } else {
        showResult("error", "Removal Failed", data.message);
      }
    } catch (err) {
      console.error("Error removing student:", err);
      showResult(
        "error",
        "Removal Failed",
        "Failed to remove student. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRemoveStudents = async () => {
    if (selectedStudents.length === 0) {
      showResult("error", "No Students Selected", "Please select at least one student to remove.");
      return;
    }

    if (!window.confirm(`Remove ${selectedStudents.length} selected student(s) from venue?`)) return;

    setLoading(true);
    try {
      const response = await apiPost(
        `/groups/venues/${selectedVenue.venue_id}/bulk-remove-students`,
        { studentIds: selectedStudents }
      );

      const data = await response.json();
      if (data.success) {
        setSelectedStudents([]);
        await handleViewStudents(selectedVenue);
        await fetchVenues();
        showResult("success", "Students Removed", data.message);
      } else {
        showResult("error", "Removal Failed", data.message);
      }
    } catch (err) {
      console.error("Error removing students:", err);
      showResult(
        "error",
        "Removal Failed",
        "Failed to remove students. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Filter students based on search term
  const filteredVenueStudents = venueStudents.filter(student => {
    if (!studentSearchTerm) return true;
    const search = studentSearchTerm.toLowerCase();
    return (
      student.name?.toLowerCase().includes(search) ||
      student.rollNumber?.toLowerCase().includes(search) ||
      student.department?.toLowerCase().includes(search)
    );
  });

  const toggleSelectAll = () => {
    // Only select active students (not dropped ones)
    const activeFilteredIds = filteredVenueStudents
      .filter(s => s.status === 'Active')
      .map(s => s.student_id);
    const allActiveSelected = activeFilteredIds.every(id => selectedStudents.includes(id));
    
    if (allActiveSelected && activeFilteredIds.length > 0) {
      // Deselect all active filtered students
      setSelectedStudents(prev => prev.filter(id => !activeFilteredIds.includes(id)));
    } else {
      // Select all active filtered students
      setSelectedStudents(prev => [...new Set([...prev, ...activeFilteredIds])]);
    }
  };

  const handleAssignFaculty = async () => {
    if (!facultyAssignment.faculty_id) {
      showResult(
        "error",
        "No Faculty Selected",
        "Please select a faculty to assign."
      );
      return;
    }

    setLoading(true);
    try {
      const response = await apiPut(
        `/groups/venues/${facultyAssignment.venue_id}/assign-faculty`,
        { faculty_id: facultyAssignment.faculty_id }
      );

      const data = await response.json();
      if (data.success) {
        setShowAssignFacultyModal(false);
        setFacultyAssignment({ venue_id: "", faculty_id: "" });
        setFacultySearch("");
        await fetchVenues();
        await fetchFaculties(); // Refresh available faculties
        showResult("success", "Faculty Assigned", data.message);
      } else {
        showResult("error", "Assignment Failed", data.message);
      }
    } catch (err) {
      console.error("Error assigning faculty:", err);
      showResult(
        "error",
        "Assignment Failed",
        "Failed to assign faculty. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const openAssignFacultyModal = async (venue) => {
    setFacultyAssignment({
      venue_id: venue.venue_id,
      faculty_id: venue.faculty_id || "",
    });
    setShowAssignFacultyModal(true);
    setActiveMenu(null);
    setFacultySearch("");

    await fetchAvailableFaculties(venue.venue_id);
  };

  const handleGroupClick = (venueId) => {
    navigate(`/classes/${encodeIdSimple(venueId)}`);
  };

  return (
    <div style={s.container}>
      {error && (
        <div style={s.errorBanner}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={s.errorClose}>
            ×
          </button>
        </div>
      )}
      
      <div style={s.topBar}>
        <div style={s.searchWrapper}>
          <Search sx={{ color: "#94a3b8", fontSize: 22 }} />
          <input
            type="text"
            placeholder="Search venues, faculty or location..."
            style={s.searchInput}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <div style={s.filtersWrapper}>
          {/* Year Filter */}
          <div style={s.selectWrapper}>
            <select
              style={s.select}
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Years</option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
            <KeyboardArrowDown style={s.selectArrow} sx={{ fontSize: 20 }} />
          </div>
          {/* Specification Filter */}
          <div style={s.selectWrapper}>
            <select
              style={s.select}
              value={specificationFilter}
              onChange={(e) => {
                setSpecificationFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Specifications</option>
              {groupSpecifications.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
            <KeyboardArrowDown style={s.selectArrow} sx={{ fontSize: 20 }} />
          </div>
          {/* Status Filter */}
          <div style={s.selectWrapper}>
            <select
              style={s.select}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <KeyboardArrowDown style={s.selectArrow} sx={{ fontSize: 20 }} />
          </div>
          <button style={s.addBtn} onClick={() => setShowCreateModal(true)}>
            <Add sx={{ fontSize: 20 }} />
            <span>Create Venue</span>
          </button>
        </div>
      </div>

      <div style={s.tableCard}>
        {loading && <div style={s.loadingOverlay}>Loading...</div>}
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr style={s.trHead}>
                <th style={s.th}>Venue Details</th>
                <th style={s.th}>Assigned Faculty</th>
                <th style={s.th}>Year</th>
                <th style={s.th}>Specification</th>
                <th style={s.th}>Capacity</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((v) => (
                <tr
                  key={v.venue_id}
                  style={{ ...s.trBody, cursor: "pointer" }}
                  onClick={() => handleGroupClick(v.venue_id)}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f8fafc")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <td style={s.td}>
                    <div style={s.venueCell}>
                      <div style={s.venueName}>{v.venue_name}</div>
                      <div style={s.venueLocation}>
                        <LocationOn sx={{ fontSize: 14, color: "#94a3b8" }} />
                        {v.location || "No location"}
                      </div>
                    </div>
                  </td>
                  <td style={s.td}>
                    {v.faculty_name ? (
                      <div style={s.facultyCell}>
                        <div style={s.avatar}>{v.faculty_name.charAt(0)}</div>
                        <div>
                          <div style={s.facultyName}>{v.faculty_name}</div>
                          <div style={s.facultyDept}>
                            {v.faculty_department}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span style={s.noFaculty}>Not Assigned</span>
                    )}
                  </td>
                  <td style={s.td}>
                    <span style={s.yearBadge}>
                      {v.venue_year ? `${v.venue_year === 1 ? '1st' : v.venue_year === 2 ? '2nd' : v.venue_year === 3 ? '3rd' : '4th'} Year` : 'All Years'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: v.group_specification ? '#e0e7ff' : '#f1f5f9',
                      color: v.group_specification ? '#4338ca' : '#64748b',
                      textTransform: 'capitalize',
                    }}>
                      {v.group_specification || 'None'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={s.capacityCell}>
                      <Groups sx={{ fontSize: 18, color: "#94a3b8" }} />
                      <span
                        style={{
                          color:
                            v.current_students >= v.capacity
                              ? "#ef4444"
                              : "#10b981",
                          fontWeight: "700",
                        }}
                      >
                        {v.current_students} / {v.capacity}
                      </span>
                    </div>
                  </td>
                  <td style={s.td}>
                    <span
                      style={
                        v.status === "Active"
                          ? s.statusActive
                          : s.statusInactive
                      }
                    >
                      {v.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={s.actionCell}>
                      <button
                        style={s.actionBtn}
                        onClick={(e) => {
                          openMenu(e, v.venue_id);
                        }}
                      >
                        <MoreVert sx={{ fontSize: 18, color: "#64748b" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={s.pagination}>
          <div style={s.paginationText}>
            Showing {startIdx + 1}-
            {Math.min(startIdx + itemsPerPage, filteredData.length)} of{" "}
            {filteredData.length} venues
          </div>
          <div style={s.paginationBtns}>
            <button
              style={{
                ...s.pageBtn,
                ...(currentPage === 1 ? s.pageBtnDisabled : {}),
              }}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <button
              style={{
                ...s.pageBtn,
                ...(currentPage === totalPages ? s.pageBtnDisabled : {}),
              }}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Action Menu (Three Dots) - Portal Overlay */}
      {activeMenu && menuVenue &&
        createPortal(
          <div style={s.menuOverlay} onClick={closeMenu}>
            <div
              style={{
                ...s.actionMenu,
                ...getMenuPosition(),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                style={s.menuItem}
                onClick={() => handleEdit(menuVenue)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f8fafc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Edit sx={{ fontSize: 16 }} />
                <span>Edit Venue</span>
              </button>
              <button
                style={s.menuItem}
                onClick={() => openAssignFacultyModal(menuVenue)}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f0f9ff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Person sx={{ fontSize: 16, color: "#3b82f6" }} />
                <span style={{ color: "#3b82f6" }}>Assign Faculty</span>
              </button>
              <button
                style={s.menuItem}
                onClick={() => {
                  setSelectedVenue(menuVenue);
                  setShowBulkUploadModal(true);
                  closeMenu();
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f0fdf4")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Upload sx={{ fontSize: 16, color: "#10b981" }} />
                <span style={{ color: "#10b981" }}>Upload Students</span>
              </button>
              <button
                style={s.menuItem}
                onClick={() => {
                  setSelectedVenue(menuVenue);
                  setShowAddStudentModal(true);
                  closeMenu();
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#eff6ff")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Add sx={{ fontSize: 16, color: "#3b82f6" }} />
                <span style={{ color: "#3b82f6" }}>Add Individual Student</span>
              </button>
              <button
                style={s.menuItem}
                onClick={() => {
                  handleViewStudents(menuVenue);
                  closeMenu();
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f8fafc")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Groups sx={{ fontSize: 16 }} />
                <span>View Students</span>
              </button>
              <button
                style={s.menuItemDelete}
                onClick={() => {
                  handleDelete(menuVenue.venue_id);
                  closeMenu();
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#fef2f2")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Delete sx={{ fontSize: 16 }} />
                <span>Delete</span>
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Result Modal (Success/Error) */}
      {showResultModal && (
        <div style={s.modalOverlay} onClick={() => setShowResultModal(false)}>
          <div style={s.resultModal} onClick={(e) => e.stopPropagation()}>
            <div style={s.resultIconContainer}>
              {resultModal.type === "success" ? (
                <CheckCircle sx={{ fontSize: 64, color: "#10b981" }} />
              ) : (
                <ErrorIcon sx={{ fontSize: 64, color: "#ef4444" }} />
              )}
            </div>
            <h2 style={s.resultTitle}>{resultModal.title}</h2>
            <p style={s.resultMessage}>{resultModal.message}</p>
            <button
              style={
                resultModal.type === "success"
                  ? s.resultBtnSuccess
                  : s.resultBtnError
              }
              onClick={() => setShowResultModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Create Venue Modal */}
      {showCreateModal && (
        <div style={s.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Create New Venue</h2>
              <button
                style={s.closeBtn}
                onClick={() => setShowCreateModal(false)}
              >
                <Close sx={{ fontSize: 24, color: "#64748b" }} />
              </button>
            </div>
            <div style={s.form}>
              <div style={s.formGroup}>
                <label style={s.label}>Venue Name *</label>
                <input
                  style={s.input}
                  value={newVenue.venue_name}
                  onChange={(e) =>
                    setNewVenue({ ...newVenue, venue_name: e.target.value })
                  }
                  placeholder="e.g., Auditorium A"
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Capacity *</label>
                <input
                  type="number"
                  style={s.input}
                  value={newVenue.capacity}
                  onChange={(e) =>
                    setNewVenue({
                      ...newVenue,
                      capacity: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Location</label>
                <input
                  style={s.input}
                  value={newVenue.location}
                  onChange={(e) =>
                    setNewVenue({ ...newVenue, location: e.target.value })
                  }
                  placeholder="e.g., Building A, Floor 2"
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>
                  Academic Year *
                  <span style={s.labelHint}>
                    Which year students will use this venue
                  </span>
                </label>
                <div style={s.selectWrapper}>
                  <select
                    style={s.selectModal}
                    value={newVenue.year}
                    onChange={(e) =>
                      setNewVenue({
                        ...newVenue,
                        year: e.target.value,
                      })
                    }
                  >
                    <option value="">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                  <KeyboardArrowDown
                    style={s.selectArrow}
                    sx={{ fontSize: 20 }}
                  />
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>
                  Group Specification
                  <span style={s.labelHint}>
                    Type to add new or select existing (e.g., pbl, oracle, academics)
                  </span>
                </label>
                <input
                  list="group-specifications-create"
                  style={s.input}
                  value={newVenue.group_specification}
                  onChange={(e) =>
                    setNewVenue({
                      ...newVenue,
                      group_specification: e.target.value,
                    })
                  }
                  placeholder="Type or select specification"
                />
                <datalist id="group-specifications-create">
                  {allGroupSpecifications.map((spec, idx) => (
                    <option key={idx} value={spec} />
                  ))}
                </datalist>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>
                  Assign Faculty (Optional)
                  <span style={s.labelHint}>
                    Only unassigned faculties shown
                  </span>
                </label>
                <div style={s.selectWrapper}>
                  <select
                    style={s.selectModal}
                    value={newVenue.assigned_faculty_id}
                    onChange={(e) =>
                      setNewVenue({
                        ...newVenue,
                        assigned_faculty_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Select Faculty</option>
                    {faculties.map((f) => (
                      <option key={f.faculty_id} value={f.faculty_id}>
                        {f.faculty_name} - {f.department}
                      </option>
                    ))}
                  </select>
                  <KeyboardArrowDown
                    style={s.selectArrow}
                    sx={{ fontSize: 20 }}
                  />
                </div>
              </div>
              <div style={s.modalFooter}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={s.submitBtn}
                  onClick={handleCreateVenue}
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Venue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Venue Modal */}
      {editingVenue && (
        <div style={s.modalOverlay} onClick={() => setEditingVenue(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Edit Venue</h2>
              <button style={s.closeBtn} onClick={() => setEditingVenue(null)}>
                <Close sx={{ fontSize: 24, color: "#64748b" }} />
              </button>
            </div>
            <div style={s.form}>
              <div style={s.formGroup}>
                <label style={s.label}>Venue Name *</label>
                <input
                  style={s.input}
                  value={editingVenue.venue_name}
                  onChange={(e) =>
                    setEditingVenue({
                      ...editingVenue,
                      venue_name: e.target.value,
                    })
                  }
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Capacity *</label>
                <input
                  type="number"
                  style={s.input}
                  value={editingVenue.capacity}
                  onChange={(e) =>
                    setEditingVenue({
                      ...editingVenue,
                      capacity: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Location</label>
                <input
                  style={s.input}
                  value={editingVenue.location}
                  onChange={(e) =>
                    setEditingVenue({
                      ...editingVenue,
                      location: e.target.value,
                    })
                  }
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>
                  Academic Year
                  <span style={s.labelHint}>
                    Which year students will use this venue
                  </span>
                </label>
                <div style={s.selectWrapper}>
                  <select
                    style={s.selectModal}
                    value={editingVenue.year || ''}
                    onChange={(e) =>
                      setEditingVenue({
                        ...editingVenue,
                        year: e.target.value,
                      })
                    }
                  >
                    <option value="">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                  <KeyboardArrowDown
                    style={s.selectArrow}
                    sx={{ fontSize: 20 }}
                  />
                </div>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>
                  Group Specification
                  <span style={s.labelHint}>
                    Type to add new or select existing (e.g., pbl, oracle, academics)
                  </span>
                </label>
                <input
                  list="group-specifications-edit"
                  style={s.input}
                  value={editingVenue.group_specification}
                  onChange={(e) =>
                    setEditingVenue({
                      ...editingVenue,
                      group_specification: e.target.value,
                    })
                  }
                  placeholder="Type or select specification"
                />
                <datalist id="group-specifications-edit">
                  {allGroupSpecifications.map((spec, idx) => (
                    <option key={idx} value={spec} />
                  ))}
                </datalist>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Status *</label>
                <div style={s.selectWrapper}>
                  <select
                    style={s.selectModal}
                    value={editingVenue.status}
                    onChange={(e) =>
                      setEditingVenue({
                        ...editingVenue,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <KeyboardArrowDown
                    style={s.selectArrow}
                    sx={{ fontSize: 20 }}
                  />
                </div>
              </div>
              <div style={s.modalFooter}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => setEditingVenue(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={s.submitBtn}
                  onClick={handleUpdate}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Assign Faculty Modal */}
      {showAssignFacultyModal && (
        <div
          style={s.modalOverlay}
          onClick={() => {
            setShowAssignFacultyModal(false);
            setFacultySearch("");
          }}
        >
          <div style={s.modalLarge} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>Assign Faculty to Venue</h2>
              <button
                style={s.closeBtn}
                onClick={() => {
                  setShowAssignFacultyModal(false);
                  setFacultySearch("");
                }}
              >
                <Close sx={{ fontSize: 24, color: "#64748b" }} />
              </button>
            </div>

            <div style={s.form}>
              {/* Search Bar */}
              <div style={s.formGroup}>
                <label style={s.label}>Search Faculty</label>
                <div style={s.searchWrapper}>
                  <Search sx={{ color: "#94a3b8", fontSize: 20 }} />
                  <input
                    style={s.searchInput}
                    value={facultySearch}
                    onChange={(e) => setFacultySearch(e.target.value)}
                    placeholder="Search by name, department or email..."
                  />
                </div>
              </div>

              {/* Currently Assigned Faculty */}
              {availableFaculties.current && (
                <div style={s.currentFacultyBox}>
                  <p style={s.currentLabel}>Currently Assigned: </p>
                  <div style={s.facultyCard}>
                    <div style={s.facultyCardHeader}>
                      <div style={s.avatar}>
                        {availableFaculties.current.faculty_name.charAt(0)}
                      </div>
                      <div style={s.facultyCardInfo}>
                        <div style={s.facultyCardName}>
                          {availableFaculties.current.faculty_name}
                        </div>
                        <div style={s.facultyCardDept}>
                          {availableFaculties.current.department} •{" "}
                          {availableFaculties.current.designation}
                        </div>
                      </div>
                    </div>
                    <div style={s.workloadBadge(1)}>Current</div>
                  </div>
                </div>
              )}

              {/* Available Faculties List */}
              <div style={s.formGroup}>
                <label style={s.label}>
                  Select Faculty *
                  <span style={s.labelHint}>
                    ({(availableFaculties.available?.length || 0) + (availableFaculties.assignedToOther?.length || 0)} faculties)
                  </span>
                </label>

                {loadingFaculties ? (
                  <div style={s.loadingBox}>Loading faculties...</div>
                ) : (availableFaculties.available?.length === 0 && availableFaculties.assignedToOther?.length === 0) ? (
                  <div style={s.emptyBox}>
                    <Person sx={{ fontSize: 40, color: "#cbd5e1" }} />
                    <p>No faculties found</p>
                  </div>
                ) : (
                  <div style={s.facultyListContainer}>
                    {/* Available (unassigned) faculties first */}
                    {availableFaculties.available?.map((faculty) => (
                      <div
                        key={faculty.faculty_id}
                        style={{
                          ...s.facultyListItem,
                          ...(facultyAssignment.faculty_id ===
                          faculty.faculty_id
                            ? s.facultyListItemSelected
                            : {}),
                        }}
                        onClick={() =>
                          setFacultyAssignment({
                            ...facultyAssignment,
                            faculty_id: faculty.faculty_id,
                          })
                        }
                      >
                        <div style={s.facultyListLeft}>
                          <div style={s.avatar}>
                            {faculty.faculty_name.charAt(0)}
                          </div>
                          <div style={s.facultyListInfo}>
                            <div style={s.facultyListName}>
                              {faculty.faculty_name}
                            </div>
                            <div style={s.facultyListDept}>
                              {faculty.department} • {faculty.designation}
                            </div>
                          </div>
                        </div>
                        <div style={s.facultyListRight}>
                          <div style={s.workloadBadgeSmall(0)}>
                            {faculty.workload_status}
                          </div>
                          {facultyAssignment.faculty_id ===
                            faculty.faculty_id && (
                            <div style={s.selectedCheckmark}>✓</div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Faculties assigned to other venues */}
                    {availableFaculties.assignedToOther?.length > 0 && (
                      <>
                        <div style={{ padding: '12px 16px', background: '#fef3c7', borderRadius: '8px', margin: '8px 0', fontSize: '13px', color: '#92400e' }}>
                          ⚠️ Selecting a faculty below will move them from their current venue
                        </div>
                        {availableFaculties.assignedToOther?.map((faculty) => (
                          <div
                            key={faculty.faculty_id}
                            style={{
                              ...s.facultyListItem,
                              background: facultyAssignment.faculty_id === faculty.faculty_id ? '#e0f2fe' : '#fff7ed',
                              ...(facultyAssignment.faculty_id === faculty.faculty_id ? s.facultyListItemSelected : {}),
                            }}
                            onClick={() =>
                              setFacultyAssignment({
                                ...facultyAssignment,
                                faculty_id: faculty.faculty_id,
                              })
                            }
                          >
                            <div style={s.facultyListLeft}>
                              <div style={{ ...s.avatar, background: '#f97316' }}>
                                {faculty.faculty_name.charAt(0)}
                              </div>
                              <div style={s.facultyListInfo}>
                                <div style={s.facultyListName}>
                                  {faculty.faculty_name}
                                </div>
                                <div style={s.facultyListDept}>
                                  {faculty.department} • {faculty.designation}
                                </div>
                                <div style={{ fontSize: '11px', color: '#ea580c', marginTop: '2px' }}>
                                  Currently in: {faculty.venue_names}
                                </div>
                              </div>
                            </div>
                            <div style={s.facultyListRight}>
                              <div style={{ ...s.workloadBadgeSmall(1), background: '#fed7aa', color: '#c2410c' }}>
                                Assigned
                              </div>
                              {facultyAssignment.faculty_id === faculty.faculty_id && (
                                <div style={s.selectedCheckmark}>✓</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={s.modalFooter}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => {
                    setShowAssignFacultyModal(false);
                    setFacultySearch("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={s.submitBtn}
                  onClick={handleAssignFaculty}
                  disabled={loading || !facultyAssignment.faculty_id}
                >
                  {loading ? "Assigning..." : "Assign Faculty"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div
          style={s.modalOverlay}
          onClick={() => { setShowBulkUploadModal(false); setOverwriteMode(false); }}
        >
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                Bulk Upload Students to {selectedVenue?.venue_name}
              </h2>
              <button
                style={s.closeBtn}
                onClick={() => { setShowBulkUploadModal(false); setOverwriteMode(false); }}
              >
                <Close sx={{ fontSize: 24, color: "#64748b" }} />
              </button>
            </div>
            <div style={s.form}>
              <div style={s.uploadInstructions}>
                <p style={s.instructionTitle}>Excel Format Required:</p>
                <p style={s.instructionText}>
                  Columns: name, email, rollNumber, department, year, semester
                </p>
                <p style={s.instructionNote}>
                  * Available capacity:{" "}
                  {selectedVenue?.capacity - selectedVenue?.current_students}{" "}
                  students
                  <br />* Only . xlsx and .xls files are accepted
                </p>
                {/* <button 
                  style={s. downloadTemplateBtn}
                  onClick={downloadExcelTemplate}
                >
                  <GetApp sx={{ fontSize: 16 }} />
                  Download Template
                </button> */}
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Select Excel File *</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  style={s.fileInput}
                />
                {selectedFile && (
                  <div style={s.fileName}>{selectedFile.name}</div>
                )}
              </div>
              <div style={s.formGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={overwriteMode}
                    onChange={(e) => setOverwriteMode(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    Overwrite existing students (removes all current students and adds new ones)
                  </span>
                </label>
                {overwriteMode && (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>
                    ⚠️ Warning: This will drop all existing students from this venue before adding new ones.
                  </p>
                )}
              </div>
              <div style={s.modalFooter}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => { setShowBulkUploadModal(false); setOverwriteMode(false); }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={s.submitBtn}
                  onClick={handleBulkUpload}
                  disabled={loading || !selectedFile}
                >
                  {loading ? "Uploading.. ." : "Upload Students"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Individual Student Modal */}
      {showAddStudentModal && (
        <div
          style={s.modalOverlay}
          onClick={() => setShowAddStudentModal(false)}
        >
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                Add Student to {selectedVenue?.venue_name}
              </h2>
              <button
                style={s.closeBtn}
                onClick={() => setShowAddStudentModal(false)}
              >
                <Close sx={{ fontSize: 24, color: "#64748b" }} />
              </button>
            </div>
            <div style={s.form}>
              <div style={s.formGroup}>
                <label style={s.label}>Roll Number / Registration Number *</label>
                <input
                  type="text"
                  style={s.input}
                  placeholder="Enter roll number (auto-fills if student exists)"
                  value={newStudent.reg_no}
                  onChange={(e) => handleRollNumberChange(e.target.value)}
                  autoFocus
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Name (optional)</label>
                <input
                  type="text"
                  style={s.input}
                  placeholder="Enter student name (defaults to roll number)"
                  value={newStudent.name}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, name: e.target.value })
                  }
                />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Email (optional)</label>
                <input
                  type="email"
                  style={s.input}
                  placeholder="Auto-generated if empty"
                  value={newStudent.email}
                  onChange={(e) =>
                    setNewStudent({ ...newStudent, email: e.target.value })
                  }
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ ...s.formGroup, flex: 1 }}>
                  <label style={s.label}>Department</label>
                  <input
                    type="text"
                    style={s.input}
                    placeholder="General"
                    value={newStudent.department}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, department: e.target.value })
                    }
                  />
                </div>
                <div style={{ ...s.formGroup, flex: 1 }}>
                  <label style={s.label}>Year</label>
                  <select
                    style={s.input}
                    value={newStudent.year}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, year: e.target.value })
                    }
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>
              <div style={s.modalFooter}>
                <button
                  type="button"
                  style={s.cancelBtn}
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setNewStudent({ reg_no: "", name: "", email: "", department: "", year: "1", semester: "1" });
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={s.submitBtn}
                  onClick={handleAddIndividualStudent}
                  disabled={loading || !newStudent.reg_no}
                >
                  {loading ? "Adding..." : "Add Student"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Students Modal */}
      {showStudentsModal && (
        <div style={s.modalOverlay} onClick={() => { setShowStudentsModal(false); setSelectedStudents([]); setStudentSearchTerm(""); }}>
          <div style={s.modalLarge} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                Students in {selectedVenue?.venue_name}
              </h2>
              <button
                style={s.closeBtn}
                onClick={() => { setShowStudentsModal(false); setSelectedStudents([]); setStudentSearchTerm(""); }}
              >
                <Close sx={{ fontSize: 24, color: "#64748b" }} />
              </button>
            </div>
            {/* Search and Bulk Actions */}
            <div style={{ padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Search Box */}
              <div style={{ position: 'relative' }}>
                <Search sx={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 20 }} />
                <input
                  type="text"
                  placeholder="Search by name, roll number, or department..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              {/* Stats, Toggle Dropped, and Bulk Remove */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '14px', color: '#64748b' }}>
                    {selectedStudents.length > 0 
                      ? `${selectedStudents.length} selected` 
                      : `${filteredVenueStudents.filter(s => s.status === 'Active').length} active${showDroppedStudents ? `, ${filteredVenueStudents.filter(s => s.status === 'Dropped').length} dropped` : ''}`}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showDroppedStudents}
                      onChange={toggleShowDropped}
                      style={{ cursor: 'pointer' }}
                    />
                    Show dropped students
                  </label>
                </div>
                {selectedStudents.length > 0 && (
                  <button
                    style={{
                      ...s.removeBtn,
                      backgroundColor: '#dc2626',
                      color: 'white',
                      padding: '8px 16px',
                    }}
                    onClick={handleBulkRemoveStudents}
                  >
                    <Delete sx={{ fontSize: 16 }} />
                    Remove Selected ({selectedStudents.length})
                  </button>
                )}
              </div>
            </div>
            <div style={s.studentsListContainer}>
              {venueStudents.length === 0 ? (
                <div style={s.emptyState}>No students allocated yet</div>
              ) : filteredVenueStudents.length === 0 ? (
                <div style={s.emptyState}>No students match your search</div>
              ) : (
                <table style={s.studentsTable}>
                  <thead>
                    <tr style={s.trHead}>
                      <th style={{ ...s.th, width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={filteredVenueStudents.filter(s => s.status === 'Active').length > 0 && filteredVenueStudents.filter(s => s.status === 'Active').every(s => selectedStudents.includes(s.student_id))}
                          onChange={toggleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={s.th}>Roll Number</th>
                      <th style={s.th}>Name</th>
                      <th style={s.th}>Department</th>
                      <th style={s.th}>Year/Sem</th>
                      {showDroppedStudents && <th style={s.th}>Status</th>}
                      <th style={s.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVenueStudents.map((student) => {
                      const isDropped = student.status === 'Dropped';
                      return (
                        <tr 
                          key={student.student_id} 
                          style={{
                            ...s.trBody,
                            backgroundColor: isDropped 
                              ? '#fef2f2' 
                              : selectedStudents.includes(student.student_id) 
                                ? '#eff6ff' 
                                : 'transparent',
                            opacity: isDropped ? 0.7 : 1,
                          }}
                        >
                          <td style={s.td}>
                            {!isDropped && (
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(student.student_id)}
                                onChange={() => toggleStudentSelection(student.student_id)}
                                style={{ cursor: 'pointer' }}
                              />
                            )}
                          </td>
                          <td style={{ ...s.td, color: isDropped ? '#9ca3af' : 'inherit' }}>{student.rollNumber}</td>
                          <td style={{ ...s.td, color: isDropped ? '#9ca3af' : 'inherit' }}>{student.name}</td>
                          <td style={{ ...s.td, color: isDropped ? '#9ca3af' : 'inherit' }}>{student.department}</td>
                          <td style={{ ...s.td, color: isDropped ? '#9ca3af' : 'inherit' }}>
                            {student.year}/{student.semester}
                          </td>
                          {showDroppedStudents && (
                            <td style={s.td}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: isDropped ? '#fee2e2' : '#dcfce7',
                                color: isDropped ? '#dc2626' : '#16a34a',
                              }}>
                                {student.status}
                              </span>
                            </td>
                          )}
                          <td style={s.td}>
                            {isDropped ? (
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>View only</span>
                            ) : (
                              <button
                                style={s.removeBtn}
                                onClick={() =>
                                  handleRemoveStudent(student.student_id)
                                }
                              >
                                <Delete sx={{ fontSize: 16 }} />
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const s = {
  container: {
    padding: "0",
    width: "100%",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: "relative",
  },
  errorBanner: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
  },
  errorClose: {
    background: "none",
    border: "none",
    fontSize: "24px",
    color: "#991b1b",
    cursor: "pointer",
    padding: "0 8px",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    fontSize: "16px",
    fontWeight: "600",
    color: "#3b82f6",
  },
  // Page Header with Year Filter
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "12px",
  },
  yearFilterSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  pageHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  pageTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1e293b",
    margin: 0,
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    gap: "16px",
    flexWrap: "wrap",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    padding: "10px 16px",
    flex: 1,
    minWidth: "250px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
  searchInput: {
    border: "none",
    outline: "none",
    fontSize: "14px",
    width: "100%",
    color: "#1e293b",
    background: "transparent",
  },
  filtersWrapper: { display: "flex", gap: "12px", flexWrap: "wrap" },
  selectWrapper: { position: "relative", minWidth: "150px" },
  select: {
    appearance: "none",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    padding: "10px 40px 10px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    width: "100%",
    outline: "none",
  },
  selectArrow: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: "#64748b",
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#3b82f6",
    color: "#ffffff",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    whiteSpace: "nowrap",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    position: "relative",
  },
  tableWrapper: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    minWidth: "800px",
  },
  trHead: { backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  th: {
    padding: "16px",
    fontSize: "12px",
    color: "#64748b",
    textAlign: "left",
    textTransform: "uppercase",
  },
  trBody: {
    borderBottom: "1px solid #f1f5f9",
    transition: "background-color 0.2s",
  },
  td: { padding: "16px 24px", fontSize: "14px", color: "#334155" },
  venueCell: { display: "flex", flexDirection: "column", gap: "4px" },
  venueName: { fontWeight: "700", color: "#0f172a", fontSize: "15px" },
  venueLocation: {
    fontSize: "12px",
    color: "#64748b",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  facultyCell: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#e0e7ff",
    color: "#4f46e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "16px",
    flexShrink: 0,
  },
  facultyName: { fontWeight: "600", color: "#1e293b", fontSize: "14px" },
  facultyDept: { fontSize: "12px", color: "#64748b" },
  noFaculty: { color: "#94a3b8", fontStyle: "italic", fontSize: "13px" },
  capacityCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
  },
  yearBadge: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "500",
    display: "inline-block",
  },
  statusActive: {
    backgroundColor: "#16A34A",
    color: "white",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    display: "inline-block",
  },
  statusInactive: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "600",
    display: "inline-block",
  },
  actionCell: { position: "relative" },
  actionBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  actionMenu: {
    position: "fixed",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    zIndex: 3000,
    minWidth: "240px",
    overflow: "hidden",
  },
  menuOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2500,
    backgroundColor: "transparent",
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "10px 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    color: "#334155",
    textAlign: "left",
    transition: "background-color 0.15s",
  },
  menuItemDelete: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    padding: "10px 16px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    color: "#ef4444",
    textAlign: "left",
    transition: "background-color 0.15s",
    borderTop: "1px solid #f1f5f9",
  },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderTop: "1px solid #e2e8f0",
    backgroundColor: "#fafafa",
    flexWrap: "wrap",
    gap: "12px",
  },
  paginationText: { fontSize: "14px", color: "#64748b" },
  paginationBtns: { display: "flex", gap: "12px" },
  pageBtn: {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    color: "#334155",
    padding: "8px 16px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
  },
  pageBtnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modal: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "500px",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  modalLarge: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "900px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px",
    borderBottom: "1px solid #e2e8f0",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  form: { padding: "24px" },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "20px",
  },
  label: { fontSize: "14px", fontWeight: "600", color: "#334155" },
  labelHint: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#94a3b8",
    marginLeft: "8px",
  },
  input: {
    padding: "10px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
  },
  selectModal: {
    appearance: "none",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    color: "#1e293b",
    padding: "10px 40px 10px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    width: "100%",
    outline: "none",
  },
  uploadInstructions: {
    backgroundColor: "#f0f9ff",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  instructionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#0369a1",
    marginBottom: "8px",
    margin: 0,
  },
  instructionText: {
    fontSize: "13px",
    color: "#075985",
    fontFamily: "monospace",
    margin: "8px 0",
  },
  instructionNote: {
    fontSize: "12px",
    color: "#0c4a6e",
    margin: "8px 0 0 0",
    lineHeight: "1.5",
  },
  fileInput: {
    padding: "10px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
  fileName: {
    fontSize: "13px",
    color: "#10b981",
    fontWeight: "500",
    marginTop: "8px",
  },
  downloadTemplateBtn: {
    marginTop: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },
  infoBox: {
    backgroundColor: "#f8fafc",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "20px",
    border: "1px solid #e2e8f0",
  },
  infoTitle: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 8px 0",
  },
  infoText: { fontSize: "13px", color: "#64748b", margin: 0 },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
    paddingTop: "24px",
    borderTop: "1px solid #e2e8f0",
  },
  cancelBtn: {
    padding: "10px 20px",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#64748b",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  },
  submitBtn: {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#ffffff",
    backgroundColor: "#3b82f6",
    cursor: "pointer",
  },
  studentsListContainer: {
    padding: "24px",
    maxHeight: "500px",
    overflowY: "auto",
  },
  studentsTable: { width: "100%", borderCollapse: "collapse" },
  emptyState: {
    textAlign: "center",
    padding: "40px",
    color: "#94a3b8",
    fontSize: "15px",
  },
  removeBtn: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 12px",
    backgroundColor: "#fef2f2",
    color: "#ef4444",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  },

  // Result Modal Styles
  resultModal: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "400px",
    padding: "40px 32px",
    textAlign: "center",
    boxShadow:
      "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },
  resultIconContainer: {
    marginBottom: "24px",
  },
  resultTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: "12px",
  },
  resultMessage: {
    fontSize: "15px",
    color: "#64748b",
    lineHeight: "1.6",
    marginBottom: "28px",
  },
  resultBtnSuccess: {
    width: "100%",
    padding: "12px 24px",
    backgroundColor: "#10b981",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
  },
  resultBtnError: {
    width: "100%",
    padding: "12px 24px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
  },
  currentFacultyBox: {
    backgroundColor: "#f0f9ff",
    padding: "16px",
    borderRadius: "10px",
    marginBottom: "20px",
    border: "1px solid #bae6fd",
  },
  currentLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#0369a1",
    marginBottom: "12px",
  },
  loadingBox: {
    padding: "40px",
    textAlign: "center",
    color: "#64748b",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
  },
  emptyBox: {
    padding: "40px",
    textAlign: "center",
    color: "#94a3b8",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
  },
  facultyCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #e0f2fe",
  },
  facultyCardHeader: { display: "flex", alignItems: "center", gap: "12px" },
  facultyCardInfo: { display: "flex", flexDirection: "column", gap: "4px" },
  facultyCardName: { fontSize: "15px", fontWeight: "700", color: "#0f172a" },
  facultyCardDept: { fontSize: "13px", color: "#64748b" },
  workloadBadge: (count) => ({
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "700",
    backgroundColor:
      count === 0 ? "#d1fae5" : count === 1 ? "#dbeafe" : "#fef3c7",
    color: count === 0 ? "#065f46" : count === 1 ? "#1e40af" : "#92400e",
  }),
  facultyListContainer: {
    maxHeight: "400px",
    overflowY: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    backgroundColor: "#fafafa",
  },
  facultyListItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px",
    borderBottom: "1px solid #e2e8f0",
    cursor: "pointer",
    transition: "all 0.2s",
    backgroundColor: "#fff",
  },
  facultyListItemSelected: {
    backgroundColor: "#eff6ff",
    borderLeft: "4px solid #3b82f6",
  },
  facultyListLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
  },
  facultyListInfo: { display: "flex", flexDirection: "column", gap: "4px" },
  facultyListName: { fontSize: "15px", fontWeight: "600", color: "#0f172a" },
  facultyListDept: { fontSize: "13px", color: "#64748b" },
  facultyListVenues: {
    fontSize: "12px",
    color: "#94a3b8",
    fontStyle: "italic",
    marginTop: "2px",
  },
  facultyListRight: { display: "flex", alignItems: "center", gap: "12px" },
  workloadBadgeSmall: (count) => ({
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    backgroundColor: count === 0 ? "#d1fae5" : "#fef3c7",
    color: count === 0 ? "#065f46" : "#92400e",
  }),
  selectedCheckmark: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    backgroundColor: "#3b82f6",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "700",
  },
};

export default GroupsClasses;

// import React, { useState, useEffect, useRef } from "react";
// import {
//   Pencil,
//   Trash2,
//   FileText,
//   Youtube,
//   Download,
//   ExternalLink,
//   PlusCircle,
//   X,
//   Link as LinkIcon,
//   Upload,
//   Video,
// } from "lucide-react";
// import useAuthStore from "../../../../../store/useAuthStore";
// import { apiGet, apiPost, apiPut, apiDelete } from "../../../../../utils/api";

// const StudyRoadmap = ({
//   selectedVenueId,
//   venueName,
//   venues,
//   isActiveTab,
//   addDayTrigger,
//   selectedCourseType = "frontend",
// }) => {
//   const API_URL = import.meta.env.VITE_API_URL;
//   const { user } = useAuthStore();

//   const [roadmap, setRoadmap] = useState([]);
//   const [editingId, setEditingId] = useState(null);
//   const [editingGroupId, setEditingGroupId] = useState(null);
//   const [editData, setEditData] = useState({
//     title: "",
//     description: "",
//     learning_objectives: "",
//   });
//   const [lastAddDayTrigger, setLastAddDayTrigger] = useState(0);
//   const [loading, setLoading] = useState(false);
//   const [allVenuesModules, setAllVenuesModules] = useState([]);
//   const [messageModal, setMessageModal] = useState({
//     show: false,
//     title: "",
//     message: "",
//     type: "success",
//   });

//   // Venue selection modal state
//   const [showVenueSelectionModal, setShowVenueSelectionModal] = useState(false);
//   const [selectedVenuesForCreate, setSelectedVenuesForCreate] = useState([]);
//   const [selectAllVenues, setSelectAllVenues] = useState(false);
//   const [roadmapVenueSearch, setRoadmapVenueSearch] = useState('');

//   // Resource Modal State
//   const [showResourceModal, setShowResourceModal] = useState(false);
//   const [currentModuleId, setCurrentModuleId] = useState(null);
//   const [currentGroupId, setCurrentGroupId] = useState(null);
//   const [newResource, setNewResource] = useState({
//     name: "",
//     kind: "pdf",
//     url: "",
//   });
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const fileInputRef = useRef(null);

//   // Fetch roadmap data for selected venue
//   useEffect(() => {
//     const fetchRoadmapData = async () => {
//       if (!selectedVenueId) {
//         setRoadmap([]);
//         setAllVenuesModules([]);
//         return;
//       }

//       if (selectedVenueId === "all") {
//         // Fetch modules for all venues grouped
//         setLoading(true);
//         try {
//           const response = await apiGet('/roadmap/all-venues');

//           const data = await response.json();

//           if (data.success) {
//             setAllVenuesModules(data.data || []);
//           } else {
//             console.error("Failed to fetch all venues roadmap:", data.message);
//             setAllVenuesModules([]);
//           }
//         } catch (error) {
//           console.error("Error fetching all venues roadmap:", error);
//           setAllVenuesModules([]);
//         } finally {
//           setLoading(false);
//         }
//         return;
//       }

//       setLoading(true);
//       try {
//         const response = await apiGet(`/roadmap/venue/${selectedVenueId}`);

//         const data = await response.json();

//         if (data.success) {
//           setRoadmap(data.data);
//         } else {
//           console.error("Failed to fetch roadmap:", data.message);
//           setRoadmap([]);
//         }
//       } catch (error) {
//         console.error("Error fetching roadmap:", error);
//         setRoadmap([]);
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (selectedVenueId && isActiveTab) {
//       fetchRoadmapData();
//       setEditingId(null);
//     }
//   }, [selectedVenueId, API_URL, isActiveTab]);

//   // Handle add day trigger from parent
//   useEffect(() => {
//     if (addDayTrigger > lastAddDayTrigger && selectedVenueId && isActiveTab) {
//       addDay();
//       setLastAddDayTrigger(addDayTrigger);
//     }
//   }, [addDayTrigger, selectedVenueId, lastAddDayTrigger, isActiveTab]);

//   /* ---------- DAY / MODULE HANDLERS ---------- */
//   const addDay = async () => {
//     if (!selectedVenueId) {
//       console.error("No venue selected!");
//       setMessageModal({
//         show: true,
//         title: "No Venue Selected",
//         message: "Please select a venue first",
//         type: "error",
//       });
//       return;
//     }

//     const isAllVenues = selectedVenueId === "all";

//     // If creating for "all venues" or if user wants to select specific venues
//     if (isAllVenues) {
//       // Show venue selection modal
//       setSelectedVenuesForCreate([]);
//       setSelectAllVenues(false);
//       setShowVenueSelectionModal(true);
//       return;
//     }

//     // Single venue creation - proceed directly
//     await createRoadmapModule([selectedVenueId], false);
//   };

//   const createRoadmapModule = async (venue_ids_to_create, apply_to_all) => {
//     // Calculate next day number based on course type
//     let nextDay = 1;
//   const createRoadmapModule = async (venue_ids_to_create, apply_to_all) => {
//     // Calculate next day number based on course type
//     let nextDay = 1;
//     if (selectedVenueId === "all") {
//       const modulesForCourse = allVenuesModules.filter(
//         (m) => m.course_type === selectedCourseType,
//       );
//       if (modulesForCourse.length > 0) {
//         nextDay = Math.max(...modulesForCourse.map((m) => m.day)) + 1;
//       }
//     } else {
//       const modulesForCourse = roadmap.filter(
//         (m) => m.course_type === selectedCourseType,
//       );
//       if (modulesForCourse.length > 0) {
//         nextDay = Math.max(...modulesForCourse.map((m) => m.day)) + 1;
//       }
//     }

//     const isMultipleVenues = venue_ids_to_create.length > 1 || apply_to_all;

//     if (isMultipleVenues) {
//       const confirmed = await new Promise((resolve) => {
//         setMessageModal({
//           show: true,
//           title: "Confirm Creation",
//           message: apply_to_all 
//             ? `This will create a new ${selectedCourseType} module (Day ${nextDay}) for ALL active venues.\n\nAre you sure you want to continue?`
//             : `This will create a new ${selectedCourseType} module (Day ${nextDay}) for ${venue_ids_to_create.length} selected venue(s).\n\nAre you sure you want to continue?`,
//           type: "confirm",
//           onConfirm: () => {
//             setMessageModal({
//               show: false,
//               title: "",
//               message: "",
//               type: "success",
//             });
//             resolve(true);
//           },
//           onCancel: () => {
//             setMessageModal({
//               show: false,
//               title: "",
//               message: "",
//               type: "success",
//             });
//             resolve(false);
//           },
//         });
//       });

//       if (!confirmed) {
//         return;
//       }
//     }

//     try {
//       const newDay = {
//         day: nextDay,
//         title: isMultipleVenues
//           ? `${apply_to_all ? 'All Venues' : 'Selected Venues'} - ${selectedCourseType} Day ${nextDay}`
//           : `${venueName} - ${selectedCourseType} Day ${nextDay}`,
//         description: "Enter module description here...",
//         status: "draft",
//         course_type: selectedCourseType,
//       };

//       // Add venue selection
//       if (apply_to_all) {
//         newDay.apply_to_all_venues = true;
//         newDay.venue_id = venues[0]?.venue_id; // Fallback for backend
//       } else if (venue_ids_to_create.length === 1) {
//         newDay.venue_id = venue_ids_to_create[0];
//       } else {
//         newDay.venue_ids = venue_ids_to_create;
//         newDay.venue_id = venue_ids_to_create[0]; // Fallback for backend
//       }

//       // Send to backend
//       const response = await apiPost('/roadmap', newDay);

//       const data = await response.json();

//       if (data.success) {
//         // Close venue selection modal if open
//         setShowVenueSelectionModal(false);
        
//         if (data.data.venues_count > 1 || isMultipleVenues) {
//           // Multi-venue creation
//           let message = `Roadmap module created for ${data.data.venues_count} venue(s) successfully!`;
//           if (data.data.skipped_count > 0) {
//             message += `\n\nSkipped ${data.data.skipped_count} venue(s) - module already exists.`;
//           }
//           setMessageModal({
//             show: true,
//             title: "Success",
//             message: message,
//             type: "success",
//           });
//           // Refresh all venues modules
//           if (selectedVenueId === "all") {
//             const response = await apiGet('/roadmap/all-venues');
//             const refreshData = await response.json();
//             if (refreshData.success) {
//               setAllVenuesModules(refreshData.data);
//             }
//           }
//         } else {
//           // Single venue creation
//           const newModule = {
//             ...newDay,
//             roadmap_id:
//               data.data.roadmap_id || data.data.roadmaps[0].roadmap_id,
//             created_at: new Date().toISOString(),
//             updated_at: new Date().toISOString(),
//             resources: [],
//           };

//           const updatedRoadmap = [...roadmap, newModule];
//           setRoadmap(updatedRoadmap);
//           setMessageModal({
//             show: true,
//             title: "Success",
//             message: "Roadmap module created successfully!",
//             type: "success",
//           });
//         }
//       } else {
//         setMessageModal({
//           show: true,
//           title: "Error",
//           message: data.message || "Failed to add module",
//           type: "error",
//         });
//       }
//     } catch (error) {
//       console.error("Error adding day:", error);
//       setMessageModal({
//         show: true,
//         title: "Error",
//         message: error.message || "Failed to add module",
//         type: "error",
//       });
//     }
//   };

//   const handleAddDay = () => {
//     addDay();
//   };

//   const setupDraft = (id) => {
//     const draftModule = roadmap.find((r) => r.roadmap_id === id);
//     if (!draftModule) {
//       setMessageModal({
//         show: true,
//         title: "Error",
//         message: "Module not found",
//         type: "error",
//       });
//       return;
//     }

//     setEditingId(id);
//     setEditData({
//       title: draftModule.title,
//       description:
//         draftModule.description || "Enter module description here...",
//       learning_objectives: draftModule.learning_objectives || "",
//     });

//     // Update status locally to 'editing'
//     const updatedRoadmap = roadmap.map((item) =>
//       item.roadmap_id === id ? { ...item, status: "editing" } : item,
//     );
//     setRoadmap(updatedRoadmap);
//   };

//   const setupDraftGroup = (group_id) => {
//     const draftModule = allVenuesModules.find((r) => r.group_id === group_id);
//     if (!draftModule) {
//       setMessageModal({
//         show: true,
//         title: "Error",
//         message: "Module not found",
//         type: "error",
//       });
//       return;
//     }

//     setEditingGroupId(group_id);
//     setEditData({
//       title: draftModule.title,
//       description:
//         draftModule.description || "Enter module description here...",
//       learning_objectives: draftModule.learning_objectives || "",
//     });

//     // Update status locally to 'editing'
//     const updatedModules = allVenuesModules.map((item) =>
//       item.group_id === group_id ? { ...item, status: "editing" } : item,
//     );
//     setAllVenuesModules(updatedModules);
//   };

//   const startEdit = (item) => {
//     setEditingId(item.roadmap_id);
//     setEditData({
//       title: item.title,
//       description: item.description,
//       learning_objectives: item.learning_objectives || "",
//     });
//   };

//   const startEditGroup = (item) => {
//     setEditingGroupId(item.group_id);
//     setEditData({
//       title: item.title,
//       description: item.description,
//       learning_objectives: item.learning_objectives || "",
//     });
//   };

//   const saveEdit = async (id) => {
//     try {
//       const response = await apiPut(`/roadmap/${id}`, {
//         title: editData.title,
//         description: editData.description,
//         learning_objectives: editData.learning_objectives,
//         status: "published",
//       });

//       const data = await response.json();

//       if (data.success) {
//         const updatedRoadmap = roadmap.map((item) =>
//           item.roadmap_id === id
//             ? {
//                 ...item,
//                 title: editData.title,
//                 description: editData.description,
//                 learning_objectives: editData.learning_objectives,
//                 status: "published",
//               }
//             : item,
//         );

//         setRoadmap(updatedRoadmap);
//         setEditingId(null);
//         setMessageModal({
//           show: true,
//           title: "Success",
//           message: "Module saved successfully!",
//           type: "success",
//         });
//       } else {
//         setMessageModal({
//           show: true,
//           title: "Error",
//           message: data.message || "Failed to save",
//           type: "error",
//         });
//       }
//     } catch (error) {
//       console.error("Error saving edit:", error);
//       setMessageModal({
//         show: true,
//         title: "Error",
//         message: error.message || "Failed to save",
//         type: "error",
//       });
//     }
//   };

//   const saveEditGroup = async (group_id) => {
//     try {
//       const response = await apiPut(`/roadmap/group/${group_id}`, {
//         title: editData.title,
//         description: editData.description,
//         learning_objectives: editData.learning_objectives,
//         status: "published",
//       });

//       const data = await response.json();

//       if (data.success) {
//         const updatedModules = allVenuesModules.map((item) =>
//           item.group_id === group_id
//             ? {
//                 ...item,
//                 title: editData.title,
//                 description: editData.description,
//                 learning_objectives: editData.learning_objectives,
//                 status: "published",
//               }
//             : item,
//         );

//         setAllVenuesModules(updatedModules);

//         // Also update the single venue roadmap state if it contains modules from this group
//         const updatedRoadmap = roadmap.map((item) =>
//           item.group_id === group_id
//             ? {
//                 ...item,
//                 title: editData.title,
//                 description: editData.description,
//                 learning_objectives: editData.learning_objectives,
//                 status: "published",
//               }
//             : item,
//         );
//         setRoadmap(updatedRoadmap);

//         setEditingGroupId(null);
//         setMessageModal({
//           show: true,
//           title: "Success",
//           message: `Module updated for ${data.data.updated_count} venue(s) successfully!`,
//           type: "success",
//         });
//       } else {
//         setMessageModal({
//           show: true,
//           title: "Error",
//           message: data.message || "Failed to save",
//           type: "error",
//         });
//       }
//     } catch (error) {
//       console.error("Error saving edit:", error);
//       setMessageModal({
//         show: true,
//         title: "Error",
//         message: error.message || "Failed to save",
//         type: "error",
//       });
//     }
//   };

//   const cancelEdit = (id) => {
//     const updatedRoadmap = roadmap.map((item) =>
//       item.roadmap_id === id ? { ...item, status: "draft" } : item,
//     );
//     setRoadmap(updatedRoadmap);
//     setEditingId(null);
//   };

//   const cancelEditGroup = (group_id) => {
//     const updatedModules = allVenuesModules.map((item) =>
//       item.group_id === group_id ? { ...item, status: "draft" } : item,
//     );
//     setAllVenuesModules(updatedModules);
//     setEditingGroupId(null);
//   };

//   const deleteModuleGroup = async (group_id, course_type) => {
//     const confirmed = await new Promise((resolve) => {
//       setMessageModal({
//         show: true,
//         title: "Confirm Deletion",
//         message: `Are you sure you want to delete this ${course_type} module from ALL venues? This will also delete all associated resources.`,
//         type: "confirm",
//         onConfirm: () => {
//           setMessageModal({
//             show: false,
//             title: "",
//             message: "",
//             type: "success",
//           });
//           resolve(true);
//         },
//         onCancel: () => {
//           setMessageModal({
//             show: false,
//             title: "",
//             message: "",
//             type: "success",
//           });
//           resolve(false);
//         },
//       });
//     });

//     if (!confirmed) return;

//     try {
//       const response = await apiDelete(`/roadmap/group/${group_id}`);

//       const data = await response.json();

//       if (data.success) {
//         setAllVenuesModules(
//           allVenuesModules.filter((item) => item.group_id !== group_id),
//         );
//         setMessageModal({
//           show: true,
//           title: "Success",
//           message: `Module deleted from ${data.data.deleted_count} venue(s) successfully!`,
//           type: "success",
//         });
//       } else {
//         setMessageModal({
//           show: true,
//           title: "Error",
//           message: data.message || "Failed to delete",
//           type: "error",
//         });
//       }
//     } catch (error) {
//       console.error("Error deleting module group:", error);
//       setMessageModal({
//         show: true,
//         title: "Error",
//         message: error.message || "Failed to delete",
//         type: "error",
//       });
//     }
//   };

//   const deleteDay = async (id) => {
//     const confirmed = await new Promise((resolve) => {
//       setMessageModal({
//         show: true,
//         title: "Confirm Deletion",
//         message:
//           "Are you sure you want to delete this module? This will also delete all associated resources.",
//         type: "confirm",
//         onConfirm: () => {
//           setMessageModal({
//             show: false,
//             title: "",
//             message: "",
//             type: "success",
//           });
//           resolve(true);
//         },
//         onCancel: () => {
//           setMessageModal({
//             show: false,
//             title: "",
//             message: "",
//             type: "success",
//           });
//           resolve(false);
//         },
//       });
//     });

//     if (!confirmed) return;

//     try {
//       const response = await apiDelete(`/roadmap/${id}`);

//       const data = await response.json();

//       if (data.success) {
//         const updatedRoadmap = roadmap.filter((item) => item.roadmap_id !== id);
//         setRoadmap(updatedRoadmap);
//         setMessageModal({
//           show: true,
//           title: "Success",
//           message: "Module deleted successfully!",
//           type: "success",
//         });
//       } else {
//         setMessageModal({
//           show: true,
//           title: "Error",
//           message: data.message || "Failed to delete",
//           type: "error",
//         });
//       }
//     } catch (error) {
//       console.error("Error deleting day:", error);
//       setMessageModal({
//         show: true,
//         title: "Error",
//         message: error.message || "Failed to delete",
//         type: "error",
//       });
//     }
//   };

//   /* ---------- FILE UPLOAD HANDLERS ---------- */
//   const handleFileSelect = () => {
//     fileInputRef.current.click();
//   };

//   const handleFileChange = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       if (file.type === "application/pdf") {
//         setSelectedFile(file);
//         const fileNameWithoutExt = file.name.replace(".pdf", "");
//         setNewResource((prev) => ({
//           ...prev,
//           name: prev.name || fileNameWithoutExt,
//         }));
//       } else {
//         setMessageModal({
//           show: true,
//           title: "Invalid File",
//           message: "Please select a PDF file",
//           type: "error",
//         });
//       }
//     }
//   };

//   const handleDragOver = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setIsDragging(true);
//   };

//   const handleDragLeave = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setIsDragging(false);
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setIsDragging(false);

//     const files = e.dataTransfer.files;
//     if (files.length > 0) {
//       const file = files[0];
//       if (file.type === "application/pdf") {
//         setSelectedFile(file);
//         const fileNameWithoutExt = file.name.replace(".pdf", "");
//         setNewResource((prev) => ({
//           ...prev,
//           name: prev.name || fileNameWithoutExt,
//         }));
//       } else {
//         setMessageModal({
//           show: true,
//           title: "Invalid File",
//           message: "Please drop a PDF file",
//           type: "error",
//         });
//       }
//     }
//   };

//   const removeSelectedFile = () => {
//     setSelectedFile(null);
//     if (fileInputRef.current) {
//       fileInputRef.current.value = "";
//     }
//   };

//   /* ---------- RESOURCE HANDLERS ---------- */
//   const handleOpenResourceModal = (moduleId, groupId = null) => {
//     setCurrentModuleId(moduleId);
//     setCurrentGroupId(groupId);
//     setShowResourceModal(true);
//     setSelectedFile(null);
//     setNewResource({ name: "", kind: "pdf", url: "" });
//   };

//   const handleAddResource = async () => {
//     if (!newResource.name.trim()) {
//       setMessageModal({
//         show: true,
//         title: "Validation Error",
//         message: "Please enter a resource name",
//         type: "error",
//       });
//       return;
//     }

//     if (newResource.kind === "pdf" && !selectedFile) {
//       setMessageModal({
//         show: true,
//         title: "Validation Error",
//         message: "Please select a PDF file",
//         type: "error",
//       });
//       return;
//     }

//     if (newResource.kind !== "pdf" && !newResource.url.trim()) {
//       setMessageModal({
//         show: true,
//         title: "Validation Error",
//         message: "Please enter a URL",
//         type: "error",
//       });
//       return;
//     }

//     try {
//       // Check if adding to all venues (group) or single venue
//       if (currentGroupId) {
//         // Get all roadmap_ids for this group_id
//         const groupModule = allVenuesModules.find(
//           (m) => m.group_id === currentGroupId,
//         );
//         if (!groupModule || !groupModule.venues) {
//           setMessageModal({
//             show: true,
//             title: "Error",
//             message: "Unable to find venues for this module group",
//             type: "error",
//           });
//           return;
//         }

//         // For PDF files, we need to upload once and reuse the file path
//         // For URLs, we can add to all venues directly
//         let sharedFilePath = null;
//         let successCount = 0;
//         let failCount = 0;

//         // First, upload the file if it's a PDF (upload once)
//         if (newResource.kind === "pdf" && selectedFile) {
//           const firstFormData = new FormData();
//           firstFormData.append("roadmap_id", groupModule.venues[0].roadmap_id);
//           firstFormData.append("resource_name", newResource.name.trim());
//           firstFormData.append("resource_type", newResource.kind);
//           firstFormData.append("file", selectedFile);

//           const firstResponse = await fetch(`${API_URL}/roadmap/resources`, {
//             method: "POST",
//             credentials: 'include',
//             body: firstFormData,
//           });

//           const firstData = await firstResponse.json();
//           if (firstData.success) {
//             sharedFilePath = firstData.data.file_path;
//             successCount++;
//           } else {
//             setMessageModal({
//               show: true,
//               title: "Error",
//               message: "Failed to upload file: " + firstData.message,
//               type: "error",
//             });
//             return;
//           }
//         }

//         // Add resource to remaining venues
//         const startIndex = newResource.kind === "pdf" ? 1 : 0;
//         for (let i = startIndex; i < groupModule.venues.length; i++) {
//           const venue = groupModule.venues[i];
//           let formData = new FormData();
//           formData.append("roadmap_id", venue.roadmap_id);
//           formData.append("resource_name", newResource.name.trim());
//           formData.append("resource_type", newResource.kind);

//           if (newResource.kind === "pdf") {
//             // Reuse the uploaded file path
//             formData.append("existing_file_path", sharedFilePath);
//           } else {
//             formData.append("resource_url", newResource.url.trim());
//           }

//           try {
//             const response = await fetch(`${API_URL}/roadmap/resources`, {
//               method: "POST",
//               credentials: 'include',
//               body: formData,
//             });

//             const data = await response.json();
//             if (data.success) {
//               successCount++;
//             } else {
//               failCount++;
//             }
//           } catch (err) {
//             failCount++;
//           }
//         }

//         setShowResourceModal(false);
//         setNewResource({ name: "", kind: "pdf", url: "" });
//         setSelectedFile(null);
//         setCurrentGroupId(null);

//         let message = `Resource added to ${successCount} venue(s) successfully!`;
//         if (failCount > 0) {
//           message += `\n\nFailed for ${failCount} venue(s).`;
//         }

//         setMessageModal({
//           show: true,
//           title: "Success",
//           message: message,
//           type: successCount > 0 ? "success" : "error",
//         });
//         return;
//       }

//       // Single venue resource addition
//       let formData = new FormData();
//       formData.append("roadmap_id", currentModuleId);
//       formData.append("resource_name", newResource.name.trim());
//       formData.append("resource_type", newResource.kind);

//       if (newResource.kind === "pdf" && selectedFile) {
//         formData.append("file", selectedFile);
//       } else {
//         formData.append("resource_url", newResource.url.trim());
//       }

//       const response = await fetch(`${API_URL}/roadmap/resources`, {
//         method: "POST",
//         credentials: 'include',
//         body: formData,
//       });

//       const data = await response.json();

//       if (data.success) {
//         // Find the module and update its resources
//         const updatedRoadmap = roadmap.map((item) => {
//           if (item.roadmap_id === currentModuleId) {
//             const newResourceObj = {
//               resource_id: data.data.resource_id,
//               resource_name: newResource.name.trim(),
//               resource_type: newResource.kind,
//               resource_url:
//                 newResource.kind === "pdf" ? null : newResource.url.trim(),
//               file_path:
//                 newResource.kind === "pdf" ? data.data.file_path : null,
//               file_size: selectedFile?.size || null,
//               uploaded_at: new Date().toISOString(),
//             };
//             return {
//               ...item,
//               resources: [...(item.resources || []), newResourceObj],
//             };
//           }
//           return item;
//         });

//         setRoadmap(updatedRoadmap);

//         // Reset modal
//         setShowResourceModal(false);
//         setNewResource({ name: "", kind: "pdf", url: "" });
//         setSelectedFile(null);

//         setMessageModal({
//           show: true,
//           title: "Success",
//           message: "Resource added successfully!",
//           type: "success",
//         });
//       } else {
//         setMessageModal({
//           show: true,
//           title: "Error",
//           message: "Failed to add resource: " + data.message,
//           type: "error",
//         });
//       }
//     } catch (error) {
//       console.error("Error adding resource:", error);
//       setMessageModal({
//         show: true,
//         title: "Error",
//         message: "Failed to add resource: " + error.message,
//         type: "error",
//       });
//     }
//   };

//   const getResourceIcon = (kind) => {
//     switch (kind) {
//       case "pdf":
//         return <FileText size={20} color="#EF4444" />;
//       case "video":
//         return <Youtube size={20} color="#FF0000" />;
//       case "link":
//         return <LinkIcon size={20} color="#3B82F6" />;
//       default:
//         return <FileText size={20} />;
//     }
//   };

//   const handleResourceAction = async (res) => {
//     if (res.resource_type === "pdf" && res.file_path) {
//       // Download PDF file
//       try {
//         const response = await fetch(
//           `${API_URL}/roadmap/resources/download/${res.resource_id}`,
//           {
//             credentials: 'include',
//           },
//         );

//         if (response.ok) {
//           const blob = await response.blob();
//           const url = window.URL.createObjectURL(blob);
//           const a = document.createElement("a");
//           a.href = url;
//           a.download = res.resource_name.toLowerCase().endsWith(".pdf")
//             ? res.resource_name
//             : `${res.resource_name}.pdf`;
//           document.body.appendChild(a);
//           a.click();
//           document.body.removeChild(a);
//           window.URL.revokeObjectURL(url);
//         } else {
//           const errorData = await response.json();
//           setMessageModal({
//             show: true,
//             title: "Download Failed",
//             message:
//               "Failed to download file: " +
//               (errorData.message || "Unknown error"),
//             type: "error",
//           });
//         }
//       } catch (error) {
//         console.error("Error downloading file:", error);
//         setMessageModal({
//           show: true,
//           title: "Download Failed",
//           message: "Failed to download file: " + error.message,
//           type: "error",
//         });
//       }
//     } else if (res.resource_url) {
//       // Open external URL
//       window.open(res.resource_url, "_blank", "noopener noreferrer");
//     } else {
//       setMessageModal({
//         show: true,
//         title: "Error",
//         message: "No URL available for this resource.",
//         type: "error",
//       });
//     }
//   };

//   const deleteResource = async (resourceId, roadmapId, e) => {
//     e.stopPropagation();

//     const confirmed = await new Promise((resolve) => {
//       setMessageModal({
//         show: true,
//         title: "Confirm Deletion",
//         message: "Are you sure you want to delete this resource?",
//         type: "confirm",
//         onConfirm: () => {
//           setMessageModal({
//             show: false,
//             title: "",
//             message: "",
//             type: "success",
//           });
//           resolve(true);
//         },
//         onCancel: () => {
//           setMessageModal({
//             show: false,
//             title: "",
//             message: "",
//             type: "success",
//           });
//           resolve(false);
//         },
//       });
//     });

//     if (!confirmed) return;

//     try {
//       const response = await apiDelete(`/roadmap/resources/${resourceId}`);

//       const data = await response.json();
//       if (data.success) {
//         // Update local state
//         const updatedRoadmap = roadmap.map((item) => {
//           if (item.roadmap_id === roadmapId) {
//             return {
//               ...item,
//               resources: item.resources.filter(
//                 (r) => r.resource_id !== resourceId,
//               ),
//             };
//           }
//           return item;
//         });

//         setRoadmap(updatedRoadmap);
//         setMessageModal({
//           show: true,
//           title: "Success",
//           message: "Resource deleted successfully!",
//           type: "success",
//         });
//       } else {
//         setMessageModal({
//           show: true,
//           title: "Error",
//           message: "Failed to delete resource: " + data.message,
//           type: "error",
//         });
//       }
//     } catch (error) {
//       console.error("Error deleting resource:", error);
//       setMessageModal({
//         show: true,
//         title: "Error",
//         message: "Failed to delete resource: " + error.message,
//         type: "error",
//       });
//     }
//   };

//   if (!selectedVenueId) {
//     return (
//       <div style={styles.pageWrapper}>
//         <div style={styles.container}>
//           <div style={styles.emptyState}>
//             <h3
//               style={{
//                 color: "#6B7280",
//                 marginBottom: "12px",
//               }}
//             >
//               Select a Venue
//             </h3>
//             <p style={{ color: "#9CA3AF", marginBottom: "20px" }}>
//               Please select a venue from the dropdown above to view or create a
//               roadmap
//             </p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (loading) {
//     return (
//       <div style={styles.pageWrapper}>
//         <div style={styles.container}>
//           <div style={styles.loadingState}>
//             <p>Loading roadmap...</p>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div style={styles.pageWrapper}>
//       <div style={styles.container}>
//         {/* Venue Header */}
//         <div style={styles.skillHeader}>
//           <h2 style={styles.skillTitle}>
//             {selectedVenueId === "all"
//               ? "All Venues"
//               : venueName || `Venue ${selectedVenueId}`}
//           </h2>
//           <div style={styles.skillInfo}>
//             {selectedVenueId === "all" ? (
//               <>
//                 <span style={styles.moduleCount}>
//                   {allVenuesModules.length} Module
//                   {allVenuesModules.length !== 1 ? "s" : ""}
//                 </span>
//                 <span style={styles.skillCode}>{venues.length} Venues</span>
//               </>
//             ) : (
//               <>
//                 <span style={styles.skillCode}>
//                   Venue ID:
//                   {selectedVenueId}
//                 </span>
//                 <span style={styles.moduleCount}>
//                   {roadmap.length} Module{roadmap.length !== 1 ? "s" : ""}
//                 </span>
//                 <span style={styles.draftCount}>
//                   {roadmap.filter((m) => m.status === "draft").length} Draft
//                   {roadmap.filter((m) => m.status === "draft").length !== 1
//                     ? "s"
//                     : ""}
//                 </span>
//               </>
//             )}
//           </div>
//         </div>

//         <div style={styles.contentList}>
//           {selectedVenueId === "all" ? (
//             // All Venues View
//             allVenuesModules.filter((m) => m.course_type === selectedCourseType)
//               .length === 0 ? (
//               <div style={styles.emptyState}>
//                 <h3 style={{ color: "#6B7280", marginBottom: "12px" }}>
//                   No {selectedCourseType} modules yet
//                 </h3>
//                 <p style={{ color: "#9CA3AF", marginBottom: "20px" }}>
//                   Create your first {selectedCourseType} module for all venues
//                 </p>
//                 <button style={styles.addDayBtn} onClick={handleAddDay}>
//                   <PlusCircle size={18} />
//                   <span>
//                     Create First{" "}
//                     {selectedCourseType.charAt(0).toUpperCase() +
//                       selectedCourseType.slice(1)}{" "}
//                     Module
//                   </span>
//                 </button>
//               </div>
//             ) : (
//               allVenuesModules
//                 .filter((m) => m.course_type === selectedCourseType)
//                 .map((module, index) => (
//                   <React.Fragment key={module.group_id}>
//                     {index !== 0 && <div style={styles.connector} />}
//                     <div style={styles.card}>
//                       {module.status === "draft" ? (
//                         <div style={styles.draftCard}>
//                           <div style={styles.headerInfo}>
//                             <div style={styles.draftBadge}>
//                               DAY {module.day}
//                             </div>
//                             <h3 style={styles.draftTitle}>{module.title}</h3>
//                           </div>
//                           <button
//                             style={styles.setupBtn}
//                             onClick={() => setupDraftGroup(module.group_id)}
//                           >
//                             Setup Content
//                           </button>
//                         </div>
//                       ) : module.status === "editing" ||
//                         module.status === "published" ? (
//                         <>
//                           <div style={styles.cardHeader}>
//                             <div style={styles.headerInfo}>
//                               <div style={styles.dayBadge}>
//                                 DAY {module.day}
//                               </div>
//                               {editingGroupId === module.group_id ? (
//                                 <input
//                                   style={styles.titleInput}
//                                   value={editData.title}
//                                   onChange={(e) =>
//                                     setEditData({
//                                       ...editData,
//                                       title: e.target.value,
//                                     })
//                                   }
//                                   placeholder="Enter module title..."
//                                 />
//                               ) : (
//                                 <h3 style={styles.cardTitle}>{module.title}</h3>
//                               )}
//                             </div>
//                             <div style={styles.headerActions}>
//                               <span
//                                 style={{
//                                   fontSize: "12px",
//                                   color: "#6b7280",
//                                   marginRight: "12px",
//                                 }}
//                               >
//                                 {module.venues_count} venue
//                                 {module.venues_count > 1 ? "s" : ""}
//                               </span>
//                               {editingGroupId === module.group_id ? (
//                                 <>
//                                   <button
//                                     onClick={() =>
//                                       saveEditGroup(module.group_id)
//                                     }
//                                     style={styles.saveBtn}
//                                   >
//                                     Save
//                                   </button>
//                                   <button
//                                     onClick={() =>
//                                       cancelEditGroup(module.group_id)
//                                     }
//                                     style={styles.cancelBtn}
//                                   >
//                                     Cancel
//                                   </button>
//                                 </>
//                               ) : (
//                                 <button
//                                   onClick={() => startEditGroup(module)}
//                                   style={styles.iconBtn}
//                                   onMouseEnter={(e) => {
//                                     e.currentTarget.style.background = "#F9FAFB";
//                                     e.currentTarget.style.borderColor = "#D1D5DB";
//                                     e.currentTarget.style.transform = "translateY(-1px)";
//                                   }}
//                                   onMouseLeave={(e) => {
//                                     e.currentTarget.style.background = "#FFFFFF";
//                                     e.currentTarget.style.borderColor = "#E5E7EB";
//                                     e.currentTarget.style.transform = "translateY(0)";
//                                   }}
//                                 >
//                                   <Pencil size={18} />
//                                 </button>
//                               )}
//                               <button
//                                 onClick={() =>
//                                   deleteModuleGroup(
//                                     module.group_id,
//                                     module.course_type,
//                                   )
//                                 }
//                                 style={styles.iconBtnRed}
//                                 title="Delete from all venues"
//                               >
//                                 <Trash2 size={18} />
//                               </button>
//                             </div>
//                           </div>

//                           <div style={styles.cardBody}>
//                             {editingGroupId === module.group_id ? (
//                               <>
//                                 <label
//                                   style={{
//                                     ...styles.label,
//                                     marginBottom: "6px",
//                                     display: "block",
//                                   }}
//                                 >
//                                   Description
//                                 </label>
//                                 <textarea
//                                   style={styles.textArea}
//                                   value={editData.description}
//                                   onChange={(e) =>
//                                     setEditData({
//                                       ...editData,
//                                       description: e.target.value,
//                                     })
//                                   }
//                                   placeholder="Enter module description..."
//                                 />
//                                 <label
//                                   style={{
//                                     ...styles.label,
//                                     marginBottom: "6px",
//                                     marginTop: "12px",
//                                     display: "block",
//                                   }}
//                                 >
//                                   What you will learn in this skill
//                                 </label>
//                                 <textarea
//                                   style={{
//                                     ...styles.textArea,
//                                     minHeight: "80px",
//                                   }}
//                                   value={editData.learning_objectives}
//                                   onChange={(e) =>
//                                     setEditData({
//                                       ...editData,
//                                       learning_objectives: e.target.value,
//                                     })
//                                   }
//                                   placeholder="List the key learning objectives for this module..."
//                                 />
//                                 <button
//                                   style={{
//                                     ...styles.addResourceBtn,
//                                     marginTop: "16px",
//                                   }}
//                                   onClick={() =>
//                                     handleOpenResourceModal(
//                                       null,
//                                       module.group_id,
//                                     )
//                                   }
//                                 >
//                                   <PlusCircle size={18} />
//                                   <span>
//                                     Add Resource or File to All Venues
//                                   </span>
//                                 </button>
//                               </>
//                             ) : (
//                               <>
//                                 <div style={styles.descriptionBox}>
//                                   <p style={styles.descriptionText}>
//                                     {module.description}
//                                   </p>
//                                 </div>

//                                 {module.learning_objectives && (
//                                   <div style={styles.learningBox}>
//                                     <strong style={styles.learningTitle}>
//                                       What you will learn:
//                                     </strong>
//                                     <p style={styles.learningText}>
//                                       {module.learning_objectives}
//                                     </p>
//                                   </div>
//                                 )}

//                                 <div
//                                   style={{
//                                     marginTop: "12px",
//                                     padding: "8px 12px",
//                                     background: "#f9fafb",
//                                     borderRadius: "6px",
//                                     fontSize: "12px",
//                                     color: "#6b7280",
//                                   }}
//                                 >
//                                   <strong style={{ color: "#374151" }}>
//                                     Venues:
//                                   </strong>{" "}
//                                   {module.venues
//                                     .map((v) => v.venue_name)
//                                     .join(", ")}
//                                 </div>
//                                 <button
//                                   style={{
//                                     ...styles.addResourceBtn,
//                                     marginTop: "16px",
//                                   }}
//                                   onClick={() =>
//                                     handleOpenResourceModal(
//                                       null,
//                                       module.group_id,
//                                     )
//                                   }
//                                 >
//                                   <PlusCircle size={18} />
//                                   <span>
//                                     Add Resource or File to All Venues
//                                   </span>
//                                 </button>

//                                 {/* Resources Section for All Venues */}
//                                 {module.resources &&
//                                   module.resources.length > 0 && (
//                                     <div style={{ marginTop: "16px" }}>
//                                       <h4
//                                         style={{
//                                           fontSize: "14px",
//                                           fontWeight: "600",
//                                           color: "#374151",
//                                           marginBottom: "12px",
//                                         }}
//                                       >
//                                         Resources:
//                                       </h4>
//                                       <div
//                                         style={{
//                                           display: "flex",
//                                           flexDirection: "column",
//                                           gap: "8px",
//                                           maxHeight: "200px",
//                                           overflowY: "auto",
//                                           paddingRight: "4px",
//                                         }}
//                                       >
//                                         {module.resources.map((res) => (
//                                           <div
//                                             key={res.resource_id}
//                                             style={{
//                                               display: "flex",
//                                               alignItems: "center",
//                                               justifyContent: "space-between",
//                                               padding: "10px",
//                                               background: "#f9fafb",
//                                               borderRadius: "6px",
//                                               border: "1px solid #e5e7eb",
//                                             }}
//                                           >
//                                             <div
//                                               style={{
//                                                 display: "flex",
//                                                 alignItems: "center",
//                                                 gap: "8px",
//                                                 flex: 1,
//                                               }}
//                                             >
//                                               {res.resource_type === "pdf" ? (
//                                                 <FileText
//                                                   size={18}
//                                                   color="#0066FF"
//                                                 />
//                                               ) : res.resource_type ===
//                                                 "video" ? (
//                                                 <Video
//                                                   size={18}
//                                                   color="#0066FF"
//                                                 />
//                                               ) : (
//                                                 <LinkIcon
//                                                   size={18}
//                                                   color="#0066FF"
//                                                 />
//                                               )}
//                                               <span
//                                                 style={{
//                                                   fontSize: "13px",
//                                                   color: "#374151",
//                                                   fontWeight: "500",
//                                                 }}
//                                               >
//                                                 {res.resource_name}
//                                               </span>
//                                             </div>
//                                             <div
//                                               style={{
//                                                 display: "flex",
//                                                 gap: "6px",
//                                               }}
//                                             >
//                                               {res.resource_type === "pdf" &&
//                                               res.file_path ? (
//                                                 <button
//                                                   onClick={() =>
//                                                     downloadResource(res)
//                                                   }
//                                                   style={{
//                                                     padding: "6px 10px",
//                                                     background: "#0066FF",
//                                                     color: "white",
//                                                     border: "none",
//                                                     borderRadius: "4px",
//                                                     cursor: "pointer",
//                                                     fontSize: "12px",
//                                                     display: "flex",
//                                                     alignItems: "center",
//                                                     gap: "4px",
//                                                   }}
//                                                 >
//                                                   <Download size={14} />
//                                                   Download
//                                                 </button>
//                                               ) : (
//                                                 <a
//                                                   href={res.resource_url}
//                                                   target="_blank"
//                                                   rel="noopener noreferrer"
//                                                   style={{
//                                                     padding: "6px 10px",
//                                                     background: "#0066FF",
//                                                     color: "white",
//                                                     border: "none",
//                                                     borderRadius: "4px",
//                                                     cursor: "pointer",
//                                                     fontSize: "12px",
//                                                     textDecoration: "none",
//                                                     display: "flex",
//                                                     alignItems: "center",
//                                                     gap: "4px",
//                                                   }}
//                                                 >
//                                                   <ExternalLink size={14} />
//                                                   Open
//                                                 </a>
//                                               )}
//                                               <button
//                                                 onClick={() =>
//                                                   deleteResource(
//                                                     res.resource_id,
//                                                   )
//                                                 }
//                                                 style={{
//                                                   padding: "6px 10px",
//                                                   background: "#ef4444",
//                                                   color: "white",
//                                                   border: "none",
//                                                   borderRadius: "4px",
//                                                   cursor: "pointer",
//                                                   fontSize: "12px",
//                                                 }}
//                                                 title="Delete resource"
//                                               >
//                                                 <Trash2 size={14} />
//                                               </button>
//                                             </div>
//                                           </div>
//                                         ))}
//                                       </div>
//                                     </div>
//                                   )}
//                               </>
//                             )}
//                           </div>
//                         </>
//                       ) : null}
//                     </div>
//                   </React.Fragment>
//                 ))
//             )
//           ) : roadmap.length === 0 ? (
//             <div style={styles.emptyState}>
//               <h3
//                 style={{
//                   color: "#6B7280",
//                   marginBottom: "12px",
//                 }}
//               >
//                 No modules yet
//               </h3>
//               <p
//                 style={{
//                   color: "#9CA3AF",
//                   marginBottom: "20px",
//                 }}
//               >
//                 Click "Add First Module" to create your first module for{" "}
//                 {venueName}
//               </p>
//               <button style={styles.addDayBtn} onClick={handleAddDay}>
//                 <PlusCircle size={18} />
//                 <span>Add First Module</span>
//               </button>
//             </div>
//           ) : (
//             roadmap.map((module, index) => (
//               <React.Fragment key={module.roadmap_id}>
//                 {index !== 0 && <div style={styles.connector} />}
//                 <div style={styles.card}>
//                   {module.status === "draft" ? (
//                     <div style={styles.draftCard}>
//                       <div style={styles.headerInfo}>
//                         <div style={styles.draftBadge}>DAY {module.day}</div>
//                         <h3 style={styles.draftTitle}>{module.title}</h3>
//                       </div>
//                       <button
//                         style={styles.setupBtn}
//                         onClick={() => setupDraft(module.roadmap_id)}
//                       >
//                         Setup Content
//                       </button>
//                     </div>
//                   ) : module.status === "editing" ||
//                     module.status === "published" ? (
//                     <>
//                       <div style={styles.cardHeader}>
//                         <div style={styles.headerInfo}>
//                           <div style={styles.dayBadge}>DAY {module.day}</div>
//                           {editingId === module.roadmap_id ? (
//                             <input
//                               style={styles.titleInput}
//                               value={editData.title}
//                               onChange={(e) =>
//                                 setEditData({
//                                   ...editData,
//                                   title: e.target.value,
//                                 })
//                               }
//                               placeholder="Enter module title..."
//                             />
//                           ) : (
//                             <>
//                               <h3 style={styles.cardTitle}>{module.title}</h3>
//                               {selectedVenueId && selectedVenueId !== "all" && venueName && (
//                                 <span style={{
//                                   marginLeft: '12px',
//                                   padding: '4px 10px',
//                                   backgroundColor: '#EFF6FF',
//                                   color: '#1E40AF',
//                                   fontSize: '12px',
//                                   fontWeight: '600',
//                                   borderRadius: '6px',
//                                   border: '1px solid #BFDBFE'
//                                 }}>
//                                   📍 {venueName}
//                                 </span>
//                               )}
//                             </>
//                           )}
//                         </div>
//                         <div style={styles.headerActions}>
//                           {editingId === module.roadmap_id ? (
//                             <>
//                               <button
//                                 onClick={() => saveEdit(module.roadmap_id)}
//                                 style={styles.saveBtn}
//                               >
//                                 Save
//                               </button>
//                               <button
//                                 onClick={() => cancelEdit(module.roadmap_id)}
//                                 style={styles.cancelBtn}
//                               >
//                                 Cancel
//                               </button>
//                             </>
//                           ) : (
//                             <button
//                               onClick={() => startEdit(module)}
//                               style={styles.iconBtn}
//                               onMouseEnter={(e) => {
//                                 e.currentTarget.style.background = "#F9FAFB";
//                                 e.currentTarget.style.borderColor = "#D1D5DB";
//                                 e.currentTarget.style.transform = "translateY(-1px)";
//                               }}
//                               onMouseLeave={(e) => {
//                                 e.currentTarget.style.background = "#FFFFFF";
//                                 e.currentTarget.style.borderColor = "#E5E7EB";
//                                 e.currentTarget.style.transform = "translateY(0)";
//                               }}
//                             >
//                               <Pencil size={18} />
//                             </button>
//                           )}
//                           <button
//                             onClick={() => deleteDay(module.roadmap_id)}
//                             style={styles.iconBtnRed}
//                           >
//                             <Trash2 size={18} />
//                           </button>
//                         </div>
//                       </div>

//                       <div style={styles.cardBody}>
//                         {editingId === module.roadmap_id ? (
//                           <>
//                             <label
//                               style={{
//                                 ...styles.label,
//                                 marginBottom: "6px",
//                                 display: "block",
//                               }}
//                             >
//                               Description
//                             </label>
//                             <textarea
//                               style={styles.textArea}
//                               value={editData.description}
//                               onChange={(e) =>
//                                 setEditData({
//                                   ...editData,
//                                   description: e.target.value,
//                                 })
//                               }
//                               placeholder="Enter module description..."
//                             />
//                             <label
//                               style={{
//                                 ...styles.label,
//                                 marginBottom: "6px",
//                                 marginTop: "12px",
//                                 display: "block",
//                               }}
//                             >
//                               What you will learn in this skill
//                             </label>
//                             <textarea
//                               style={{ ...styles.textArea, minHeight: "80px" }}
//                               value={editData.learning_objectives}
//                               onChange={(e) =>
//                                 setEditData({
//                                   ...editData,
//                                   learning_objectives: e.target.value,
//                                 })
//                               }
//                               placeholder="List the key learning objectives for this module..."
//                             />
//                           </>
//                         ) : (
//                           <>
//                             <div style={styles.descriptionBox}>
//                               <p style={styles.descriptionText}>
//                                 {module.description}
//                               </p>
//                             </div>

//                             {module.learning_objectives && (
//                               <div style={styles.learningBox}>
//                                 <strong style={styles.learningTitle}>
//                                   What you will learn:
//                                 </strong>
//                                 <p style={styles.learningText}>
//                                   {module.learning_objectives}
//                                 </p>
//                               </div>
//                             )}
//                           </>
//                         )}

//                         {module.resources && module.resources.length > 0 && (
//                           <div style={styles.resourceList}>
//                             {module.resources.map((res) => (
//                               <div
//                                 key={res.resource_id}
//                                 style={styles.resourceItem}
//                               >
//                                 <div style={styles.resourceLeft}>
//                                   <div
//                                     style={{
//                                       ...styles.resourceIconWrapper,
//                                       backgroundColor:
//                                         res.resource_type === "pdf"
//                                           ? "#EEF2FF"
//                                           : "#FEF2F2",
//                                     }}
//                                   >
//                                     {getResourceIcon(res.resource_type)}
//                                   </div>

//                                   <div style={styles.resourceInfo}>
//                                     <span style={styles.resName}>
//                                       {res.resource_name}
//                                     </span>

//                                     <span style={styles.resMeta}>
//                                       {res.resource_type === "pdf"
//                                         ? "PDF Document"
//                                         : res.resource_type === "video"
//                                           ? "Video Link"
//                                           : "Web Resource"}
//                                       {res.file_size && <> • {res.file_size}</>}
//                                       {res.duration && <> • {res.duration}</>}
//                                     </span>
//                                   </div>
//                                 </div>
//                                 <div style={styles.resourceActions}>
//                                   {res.resource_type === "pdf" ? (
//                                     <Download
//                                       size={20}
//                                       style={styles.iconAction}
//                                       color="#6B7280"
//                                       onClick={(e) => {
//                                         e.stopPropagation();
//                                         handleResourceAction(res);
//                                       }}
//                                     />
//                                   ) : (
//                                     <ExternalLink
//                                       size={20}
//                                       style={styles.iconAction}
//                                       color="#6B7280"
//                                       onClick={(e) => {
//                                         e.stopPropagation();
//                                         handleResourceAction(res);
//                                       }}
//                                     />
//                                   )}
//                                   <Trash2
//                                     size={20}
//                                     style={styles.iconAction}
//                                     color="#6B7280"
//                                     onClick={(e) =>
//                                       deleteResource(
//                                         res.resource_id,
//                                         module.roadmap_id,
//                                         e,
//                                       )
//                                     }
//                                   />
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         )}

//                         <button
//                           style={styles.addResourceBtn}
//                           onClick={() =>
//                             handleOpenResourceModal(module.roadmap_id)
//                           }
//                         >
//                           <PlusCircle size={18} />
//                           <span>Add Resource or File</span>
//                         </button>
//                       </div>
//                     </>
//                   ) : null}
//                 </div>
//               </React.Fragment>
//             ))
//           )}

//           {/* Add another day button */}
//           {selectedVenueId === "all"
//             ? allVenuesModules.filter(
//                 (m) => m.course_type === selectedCourseType,
//               ).length > 0 && (
//                 <div style={styles.addAnotherContainer}>
//                   <button style={styles.addAnotherBtn} onClick={handleAddDay}>
//                     <PlusCircle size={18} />
//                     <span>Add Another Day</span>
//                   </button>
//                 </div>
//               )
//             : roadmap.length > 0 && (
//                 <div style={styles.addAnotherContainer}>
//                   <button style={styles.addAnotherBtn} onClick={handleAddDay}>
//                     <PlusCircle size={18} />
//                     <span>Add Another Day</span>
//                   </button>
//                 </div>
//               )}
//         </div>
//       </div>

//       {/* RESOURCE MODAL */}
//       {showResourceModal && (
//         <div style={styles.modalOverlay}>
//           <div style={styles.modalContent}>
//             <div style={styles.modalHeader}>
//               <h3 style={{ margin: 0 }}>Add Resource</h3>
//               <X
//                 style={styles.cursor}
//                 onClick={() => setShowResourceModal(false)}
//               />
//             </div>

//             <div style={styles.modalBody}>
//               <label style={styles.label}>Resource Title</label>
//               <input
//                 style={styles.input}
//                 placeholder="e.g. Lecture Notes or
// Tutorial Video"
//                 value={newResource.name}
//                 onChange={(e) =>
//                   setNewResource({
//                     ...newResource,
//                     name: e.target.value,
//                   })
//                 }
//               />

//               <label style={styles.label}>Type</label>
//               <div style={styles.typeGrid}>
//                 <button
//                   onClick={() =>
//                     setNewResource({
//                       ...newResource,
//                       kind: "pdf",
//                     })
//                   }
//                   style={
//                     newResource.kind === "pdf"
//                       ? styles.activeType
//                       : styles.typeBtn
//                   }
//                 >
//                   <FileText size={18} /> PDF
//                 </button>
//                 <button
//                   onClick={() =>
//                     setNewResource({
//                       ...newResource,
//                       kind: "video",
//                     })
//                   }
//                   style={
//                     newResource.kind === "video"
//                       ? styles.activeType
//                       : styles.typeBtn
//                   }
//                 >
//                   <Youtube size={18} /> Video
//                 </button>
//                 <button
//                   onClick={() =>
//                     setNewResource({
//                       ...newResource,
//                       kind: "link",
//                     })
//                   }
//                   style={
//                     newResource.kind === "link"
//                       ? styles.activeType
//                       : styles.typeBtn
//                   }
//                 >
//                   <LinkIcon size={18} /> Link
//                 </button>
//               </div>

//               <label style={styles.label}>
//                 {newResource.kind === "pdf" ? "Upload File" : "Resource URL"}
//               </label>

//               {newResource.kind === "pdf" ? (
//                 <>
//                   {/* Hidden file input */}
//                   <input
//                     type="file"
//                     ref={fileInputRef}
//                     style={{ display: "none" }}
//                     accept=".pdf,application/pdf"
//                     onChange={handleFileChange}
//                   />

//                   {/* Drag and drop area */}
//                   <div
//                     style={{
//                       ...styles.filePlaceholder,
//                       borderColor: isDragging ? "#0066FF" : "#E5E7EB",
//                       backgroundColor: isDragging ? "#F0F7FF" : "#FFFFFF",
//                       borderStyle: selectedFile ? "solid" : "dashed",
//                     }}
//                     onDragOver={handleDragOver}
//                     onDragLeave={handleDragLeave}
//                     onDrop={handleDrop}
//                     onClick={handleFileSelect}
//                   >
//                     {selectedFile ? (
//                       <div style={styles.filePreview}>
//                         <FileText size={24} color="#0066FF" />
//                         <div
//                           style={{
//                             flex: 1,
//                             minWidth: 0,
//                           }}
//                         >
//                           <p
//                             style={{
//                               margin: 0,
//                               fontWeight: "600",
//                               color: "#111827",
//                               overflow: "hidden",
//                               textOverflow: "ellipsis",
//                             }}
//                           >
//                             {selectedFile.name}
//                           </p>
//                           <p
//                             style={{
//                               margin: "4px 0 0 0",
//                               fontSize: "12px",
//                               color: "#6B7280",
//                             }}
//                           >
//                             {(selectedFile.size / 1024).toFixed(2)} KB
//                           </p>
//                         </div>
//                         <button
//                           type="button"
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             removeSelectedFile();
//                           }}
//                           style={{
//                             background: "none",
//                             border: "none",
//                             color: "#EF4444",
//                             cursor: "pointer",
//                             padding: "4px",
//                           }}
//                         >
//                           <X size={18} />
//                         </button>
//                       </div>
//                     ) : (
//                       <>
//                         <Upload size={20} />
//                         <span>
//                           Drag & drop a PDF file here or click to browse
//                         </span>
//                         <p
//                           style={{
//                             fontSize: "12px",
//                             color: "#9CA3AF",
//                             margin: "8px 0 0 0",
//                           }}
//                         >
//                           Only PDF files are accepted
//                         </p>
//                       </>
//                     )}
//                   </div>

//                   {/* Browse button (alternative toclicking the area) */}
//                   {!selectedFile && (
//                     <button
//                       type="button"
//                       onClick={handleFileSelect}
//                       style={{
//                         marginTop: "8px",
//                         padding: "8px 16px",
//                         backgroundColor: "#F3F4F6",
//                         border: "1px solid #E5E7EB",
//                         borderRadius: "6px",
//                         cursor: "pointer",
//                         fontSize: "14px",
//                         color: "#374151",
//                       }}
//                     >
//                       Browse Files
//                     </button>
//                   )}
//                 </>
//               ) : (
//                 <input
//                   style={styles.input}
//                   placeholder="Enter URL"
//                   value={newResource.url}
//                   onChange={(e) =>
//                     setNewResource({
//                       ...newResource,
//                       url: e.target.value,
//                     })
//                   }
//                 />
//               )}
//             </div>

//             <div style={styles.modalFooter}>
//               <button
//                 style={styles.cancelBtnModal}
//                 onClick={() => setShowResourceModal(false)}
//               >
//                 Cancel
//               </button>
//               <button style={styles.confirmBtn} onClick={handleAddResource}>
//                 Add Resource
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Venue Selection Modal */}
//       {showVenueSelectionModal && (
//         <div
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: "rgba(0, 0, 0, 0.6)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 1000,
//             backdropFilter: "blur(4px)",
//           }}
//         >
//           <div
//             style={{
//               background: "#ffffff",
//               borderRadius: "16px",
//               padding: "28px",
//               width: "90%",
//               maxWidth: "550px",
//               maxHeight: "80vh",
//               overflow: "auto",
//               boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
//             }}
//           >
//             <div style={{ marginBottom: "24px" }}>
//               <h3
//                 style={{
//                   margin: "0 0 8px 0",
//                   fontSize: "20px",
//                   fontWeight: "700",
//                   color: "#111827",
//                 }}
//               >
//                 Select Venues for Roadmap Module
//               </h3>
//               <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>
//                 Choose which venues should receive this roadmap module
//               </p>
//             </div>

//             {/* Select All Checkbox */}
//             <div
//               style={{
//                 padding: "12px 16px",
//                 backgroundColor: "#f3f4f6",
//                 borderRadius: "8px",
//                 marginBottom: "16px",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "12px",
//               }}
//             >
//               <input
//                 type="checkbox"
//                 checked={selectAllVenues}
//                 onChange={(e) => {
//                   setSelectAllVenues(e.target.checked);
//                   if (e.target.checked) {
//                     setSelectedVenuesForCreate(
//                       venues
//                         .filter((v) => v.venue_id !== "all")
//                         .map((v) => v.venue_id)
//                     );
//                   } else {
//                     setSelectedVenuesForCreate([]);
//                   }
//                 }}
//                 style={{
//                   width: "18px",
//                   height: "18px",
//                   cursor: "pointer",
//                   accentColor: "#0066FF",
//                 }}
//               />
//               <label
//                 style={{
//                   fontSize: "15px",
//                   fontWeight: "600",
//                   color: "#111827",
//                   cursor: "pointer",
//                 }}
//                 onClick={() => {
//                   const newValue = !selectAllVenues;
//                   setSelectAllVenues(newValue);
//                   if (newValue) {
//                     setSelectedVenuesForCreate(
//                       venues
//                         .filter((v) => v.venue_id !== "all")
//                         .map((v) => v.venue_id)
//                     );
//                   } else {
//                     setSelectedVenuesForCreate([]);
//                   }
//                 }}
//               >
//                 Select All Venues
//               </label>
//             </div>

//             {/* Search Box */}
//             <div style={{ marginBottom: '12px' }}>
//               <input
//                 type="text"
//                 placeholder="🔍 Search venues..."
//                 value={roadmapVenueSearch}
//                 onChange={(e) => setRoadmapVenueSearch(e.target.value)}
//                 style={{
//                   width: '100%',
//                   padding: '10px 14px',
//                   border: '1px solid #d1d5db',
//                   borderRadius: '8px',
//                   fontSize: '14px',
//                   outline: 'none',
//                   transition: 'border-color 0.15s ease'
//                 }}
//                 onFocus={(e) => e.target.style.borderColor = '#0066FF'}
//                 onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
//               />
//             </div>

//             {/* Venue List */}
//             <div
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 gap: "8px",
//                 marginBottom: "24px",
//                 maxHeight: "300px",
//                 overflowY: "auto",
//               }}
//             >
//               {venues
//                 .filter((venue) => venue.venue_id !== "all")
//                 .filter((venue) => venue.venue_name.toLowerCase().includes(roadmapVenueSearch.toLowerCase()))
//                 .sort((a, b) => a.venue_name.localeCompare(b.venue_name))
//                 .map((venue) => (
//                   <div
//                     key={venue.venue_id}
//                     onClick={() => {
//                       if (selectedVenuesForCreate.includes(venue.venue_id)) {
//                         setSelectedVenuesForCreate(
//                           selectedVenuesForCreate.filter(
//                             (id) => id !== venue.venue_id
//                           )
//                         );
//                         setSelectAllVenues(false);
//                       } else {
//                         const newSelection = [
//                           ...selectedVenuesForCreate,
//                           venue.venue_id,
//                         ];
//                         setSelectedVenuesForCreate(newSelection);
//                         if (
//                           newSelection.length ===
//                           venues.filter((v) => v.venue_id !== "all").length
//                         ) {
//                           setSelectAllVenues(true);
//                         }
//                       }
//                     }}
//                     style={{
//                       padding: "12px 16px",
//                       borderRadius: "8px",
//                       border: selectedVenuesForCreate.includes(venue.venue_id)
//                         ? "2px solid #0066FF"
//                         : "2px solid #e5e7eb",
//                       backgroundColor: selectedVenuesForCreate.includes(
//                         venue.venue_id
//                       )
//                         ? "#f0f7ff"
//                         : "#ffffff",
//                       cursor: "pointer",
//                       display: "flex",
//                       alignItems: "center",
//                       gap: "12px",
//                       transition: "all 0.2s ease",
//                     }}
//                   >
//                     <input
//                       type="checkbox"
//                       checked={selectedVenuesForCreate.includes(
//                         venue.venue_id
//                       )}
//                       onChange={() => {}}
//                       style={{
//                         width: "18px",
//                         height: "18px",
//                         cursor: "pointer",
//                         accentColor: "#0066FF",
//                       }}
//                     />
//                     <span
//                       style={{
//                         fontSize: "14px",
//                         fontWeight: selectedVenuesForCreate.includes(
//                           venue.venue_id
//                         )
//                           ? "600"
//                           : "500",
//                         color: selectedVenuesForCreate.includes(venue.venue_id)
//                           ? "#0066FF"
//                           : "#374151",
//                       }}
//                     >
//                       {venue.venue_name}
//                     </span>
//                   </div>
//                 ))}
//             </div>

//             {/* Selection Summary */}
//             <div
//               style={{
//                 padding: "12px",
//                 backgroundColor: "#fef3c7",
//                 borderRadius: "8px",
//                 marginBottom: "20px",
//                 fontSize: "13px",
//                 color: "#92400e",
//               }}
//             >
//               <strong>{selectedVenuesForCreate.length}</strong> venue(s) selected
//             </div>

//             {/* Action Buttons */}
//             <div style={{ display: "flex", gap: "12px" }}>
//               <button
//                 onClick={() => {
//                   setShowVenueSelectionModal(false);
//                   setSelectedVenuesForCreate([]);
//                   setSelectAllVenues(false);
//                 }}
//                 style={{
//                   flex: 1,
//                   padding: "12px",
//                   borderRadius: "8px",
//                   border: "1px solid #e5e7eb",
//                   backgroundColor: "#ffffff",
//                   color: "#374151",
//                   fontWeight: "600",
//                   fontSize: "14px",
//                   cursor: "pointer",
//                 }}
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={() => {
//                   if (selectedVenuesForCreate.length === 0) {
//                     setMessageModal({
//                       show: true,
//                       title: "No Venues Selected",
//                       message: "Please select at least one venue",
//                       type: "error",
//                     });
//                     return;
//                   }
//                   createRoadmapModule(selectedVenuesForCreate, false);
//                 }}
//                 disabled={selectedVenuesForCreate.length === 0}
//                 style={{
//                   flex: 1,
//                   padding: "12px",
//                   borderRadius: "8px",
//                   border: "none",
//                   backgroundColor:
//                     selectedVenuesForCreate.length === 0
//                       ? "#d1d5db"
//                       : "#0066FF",
//                   color: "#ffffff",
//                   fontWeight: "600",
//                   fontSize: "14px",
//                   cursor:
//                     selectedVenuesForCreate.length === 0
//                       ? "not-allowed"
//                       : "pointer",
//                 }}
//               >
//                 Create Module for {selectedVenuesForCreate.length} Venue(s)
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Enhanced Message Modal */}
//       {messageModal.show && (
//         <div
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             backgroundColor: "rgba(0, 0, 0, 0.6)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 1000,
//             backdropFilter: "blur(4px)",
//             animation: "fadeIn 0.2s ease-out",
//           }}
//         >
//           <div
//             style={{
//               background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
//               borderRadius: "20px",
//               padding: "32px",
//               width: "90%",
//               maxWidth: "440px",
//               boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
//               position: "relative",
//             }}
//           >
//             {/* Icon Circle */}
//             <div
//               style={{
//                 width: "64px",
//                 height: "64px",
//                 borderRadius: "50%",
//                 background:
//                   messageModal.type === "success"
//                     ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
//                     : messageModal.type === "confirm"
//                       ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
//                       : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 margin: "0 auto 20px auto",
//                 boxShadow:
//                   messageModal.type === "success"
//                     ? "0 8px 16px rgba(16, 185, 129, 0.3)"
//                     : messageModal.type === "confirm"
//                       ? "0 8px 16px rgba(245, 158, 11, 0.3)"
//                       : "0 8px 16px rgba(239, 68, 68, 0.3)",
//               }}
//             >
//               <span
//                 style={{
//                   fontSize: "32px",
//                   color: "white",
//                   fontWeight: "bold",
//                 }}
//               >
//                 {messageModal.type === "success"
//                   ? "✓"
//                   : messageModal.type === "confirm"
//                     ? "?"
//                     : "✕"}
//               </span>
//             </div>

//             {/* Title */}
//             <h3
//               style={{
//                 margin: "0 0 12px 0",
//                 fontSize: "22px",
//                 fontWeight: "700",
//                 color: "#111827",
//                 textAlign: "center",
//               }}
//             >
//               {messageModal.title}
//             </h3>

//             {/* Message */}
//             <p
//               style={{
//                 margin: "0 0 24px 0",
//                 color: "#6b7280",
//                 lineHeight: "1.6",
//                 whiteSpace: "pre-line",
//                 textAlign: "center",
//                 fontSize: "15px",
//               }}
//             >
//               {messageModal.message}
//             </p>

//             {/* Button */}
//             <div
//               style={{ display: "flex", justifyContent: "center", gap: "12px" }}
//             >
//               {messageModal.type === "confirm" ? (
//                 <>
//                   <button
//                     onClick={() =>
//                       messageModal.onCancel && messageModal.onCancel()
//                     }
//                     style={{
//                       padding: "12px 32px",
//                       borderRadius: "10px",
//                       border: "2px solid #e5e7eb",
//                       background: "white",
//                       color: "#6b7280",
//                       cursor: "pointer",
//                       fontWeight: "600",
//                       fontSize: "15px",
//                       transition: "all 0.2s ease",
//                     }}
//                     onMouseOver={(e) => {
//                       e.target.style.borderColor = "#9ca3af";
//                       e.target.style.color = "#374151";
//                     }}
//                     onMouseOut={(e) => {
//                       e.target.style.borderColor = "#e5e7eb";
//                       e.target.style.color = "#6b7280";
//                     }}
//                   >
//                     No
//                   </button>
//                   <button
//                     onClick={() =>
//                       messageModal.onConfirm && messageModal.onConfirm()
//                     }
//                     style={{
//                       padding: "12px 32px",
//                       borderRadius: "10px",
//                       border: "none",
//                       background:
//                         "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
//                       color: "white",
//                       cursor: "pointer",
//                       fontWeight: "600",
//                       fontSize: "15px",
//                       boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
//                       transition: "all 0.2s ease",
//                     }}
//                     onMouseOver={(e) =>
//                       (e.target.style.transform = "translateY(-2px)")
//                     }
//                     onMouseOut={(e) =>
//                       (e.target.style.transform = "translateY(0)")
//                     }
//                   >
//                     Yes
//                   </button>
//                 </>
//               ) : (
//                 <button
//                   onClick={() =>
//                     setMessageModal({
//                       show: false,
//                       title: "",
//                       message: "",
//                       type: "success",
//                     })
//                   }
//                   style={{
//                     padding: "12px 48px",
//                     borderRadius: "10px",
//                     border: "none",
//                     background:
//                       messageModal.type === "success"
//                         ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
//                         : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
//                     color: "white",
//                     cursor: "pointer",
//                     fontWeight: "600",
//                     fontSize: "15px",
//                     boxShadow:
//                       messageModal.type === "success"
//                         ? "0 4px 12px rgba(16, 185, 129, 0.4)"
//                         : "0 4px 12px rgba(239, 68, 68, 0.4)",
//                     transition: "all 0.2s ease",
//                   }}
//                   onMouseOver={(e) =>
//                     (e.target.style.transform = "translateY(-2px)")
//                   }
//                   onMouseOut={(e) =>
//                     (e.target.style.transform = "translateY(0)")
//                   }
//                 >
//                   Got it!
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// // Styles remain EXACTLY as in your original code
// const styles = {
//   pageWrapper: {
//     backgroundColor: "#F8F9FB",
//     fontFamily: '"Inter", sans-serif',
//   },
//   container: {
//     width: "100%",
//     padding: "10px 5px",
//   },
//   skillHeader: {
//     marginBottom: "15px",
//     paddingBottom: "10px",
//     borderBottom: "1px solid #E5E7EB",
//   },
//   skillTitle: {
//     fontSize: "24px",
//     fontWeight: "700",
//     color: "#111827",
//     margin: "0 0 8px 0",
//   },
//   skillInfo: {
//     display: "flex",
//     gap: "16px",
//     alignItems: "center",
//   },
//   skillCode: {
//     backgroundColor: "#0066FF",
//     color: "#FFFFFF",
//     padding: "4px 12px",
//     borderRadius: "16px",
//     fontSize: "14px",
//     fontWeight: "600",
//   },
//   moduleCount: {
//     color: "#6B7280",
//     fontSize: "14px",
//     fontWeight: "500",
//   },
//   draftCount: {
//     backgroundColor: "#FEF3C7",
//     color: "#92400E",
//     padding: "4px 12px",
//     borderRadius: "16px",
//     fontSize: "14px",
//     fontWeight: "500",
//   },
//   contentList: {
//     display: "flex",
//     flexDirection: "column",
//   },
//   emptyState: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: "12px",
//     padding: "60px 40px",
//     textAlign: "center",
//     border: "1px dashed #E5E7EB",
//     marginTop: "20px",
//   },
//   addDayBtn: {
//     display: "flex",
//     alignItems: "center",
//     gap: "8px",
//     padding: "10px 18px",
//     backgroundColor: "#0066FF",
//     border: "none",
//     borderRadius: "8px",
//     fontSize: "14px",
//     fontWeight: "600",
//     color: "#FFFFFF",
//     cursor: "pointer",
//     margin: "0 auto",
//   },
//   addAnotherContainer: {
//     display: "flex",
//     justifyContent: "center",
//     marginTop: "24px",
//     paddingTop: "24px",
//     borderTop: "1px dashed #E5E7EB",
//   },
//   addAnotherBtn: {
//     display: "flex",
//     alignItems: "center",
//     gap: "8px",
//     padding: "10px 18px",
//     backgroundColor: "#FFFFFF",
//     border: "1px solid #E5E7EB",
//     borderRadius: "8px",
//     fontSize: "14px",
//     fontWeight: "600",
//     color: "#0066FF",
//     cursor: "pointer",
//   },
//   connector: {
//     width: "3px",
//     height: "32px",
//     backgroundColor: "#0066FF",
//     marginLeft: "19px",
//     opacity: 0.2,
//     borderRadius: "3px",
//   },
//   card: {
//     backgroundColor: "#FFFFFF",
//     borderRadius: "16px",
//     border: "1px solid #E5E7EB",
//     overflow: "hidden",
//     marginBottom: "4px",
//     boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
//   },
//   cardHeader: {
//     padding: "16px 20px",
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     borderBottom: "1px solid #F3F4F6",
//   },
//   headerInfo: {
//     display: "flex",
//     alignItems: "center",
//     gap: "12px",
//     flex: 1,
//   },
//   dayBadge: {
//     backgroundColor: "#0066FF",
//     color: "#FFFFFF",
//     fontSize: "11px",
//     fontWeight: "800",
//     width: "40px",
//     height: "40px",
//     borderRadius: "50%",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     boxShadow: "0 4px 6px -1px rgba(0, 102, 255, 0.2)",
//     flexShrink: 0,
//   },
//   cardTitle: {
//     fontSize: "16px",
//     fontWeight: "600",
//     color: "#111827",
//     margin: 0,
//   },
//   titleInput: {
//     padding: "8px 12px",
//     borderRadius: "6px",
//     border: "1px solid #E5E7EB",
//     fontSize: "16px",
//     fontWeight: "600",
//     width: "70%",
//     outline: "none",
//   },
//   headerActions: {
//     display: "flex",
//     gap: "8px",
//   },
//   iconBtn: {
//     background: "#FFFFFF",
//     border: "1px solid #E5E7EB",
//     color: "#374151",
//     cursor: "pointer",
//     width: "36px",
//     height: "36px",
//     padding: "0",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     borderRadius: "6px",
//     transition: "all 0.2s ease",
//   },
//   iconBtnRed: {
//     background: "#FFFFFF",
//     border: "1px solid #E5E7EB",
//     color: "#EF4444",
//     cursor: "pointer",
//     width: "36px",
//     height: "36px",
//     padding: "0",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     borderRadius: "6px",
//     transition: "all 0.2s ease",
//   },
//   saveBtn: {
//     backgroundColor: "#10B981",
//     color: "#FFF",
//     border: "none",
//     padding: "8px 16px",
//     borderRadius: "6px",
//     cursor: "pointer",
//     fontSize: "14px",
//     fontWeight: "600",
//   },
//   cancelBtn: {
//     backgroundColor: "#6B7280",
//     color: "#FFF",
//     border: "none",
//     padding: "8px 16px",
//     borderRadius: "6px",
//     cursor: "pointer",
//     fontSize: "14px",
//     fontWeight: "600",
//   },
//   cardBody: {
//     padding: "24px",
//   },
//   textArea: {
//     width: "100%",
//     minHeight: "100px",
//     padding: "12px",
//     borderRadius: "8px",
//     border: "1px solid #E5E7EB",
//     marginBottom: "16px",
//     fontSize: "14px",
//     fontFamily: "inherit",
//     outline: "none",
//     resize: "vertical",
//   },
//   description: {
//     fontSize: "14px",
//     color: "#6B7280",
//     margin: "0 0 20px 0",
//     lineHeight: 1.6,
//   },
//   descriptionBox: {
//     padding: "0",
//     marginBottom: "16px",
//   },
//   descriptionText: {
//     fontSize: "14px",
//     color: "#6B7280",
//     margin: "0",
//     lineHeight: 1.6,
//   },
//   learningBox: {
//     marginTop: "0",
//     marginBottom: "24px",
//     padding: "16px",
//     background: "#EFF6FF",
//     border: "1px solid #DBEAFE",
//     borderLeft: "3px solid #3B82F6",
//     borderRadius: "8px",
//   },
//   learningTitle: {
//     color: "#1D4ED8",
//     fontSize: "14px",
//     fontWeight: "600",
//     display: "block",
//     marginBottom: "8px",
//   },
//   learningText: {
//     fontSize: "14px",
//     color: "#475569",
//     margin: "0",
//     lineHeight: 1.6,
//     whiteSpace: "pre-line",
//   },
//   resourceList: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "12px",
//     marginTop: "24px",
//     marginBottom: "16px",
//     maxHeight: "200px",
//     overflowY: "auto",
//     paddingRight: "6px",
//   },
//   resourceItem: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     padding: "16px",
//     borderRadius: "8px",
//     border: "1px solid #E5E7EB",
//     backgroundColor: "#FFFFFF",
//     transition: "all 0.2s ease",
//   },
//   resourceLeft: {
//     display: "flex",
//     alignItems: "center",
//     gap: "12px",
//     flex: 1,
//   },
//   resourceIconWrapper: {
//     width: "48px",
//     height: "48px",
//     backgroundColor: "#F9FAFB",
//     borderRadius: "8px",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     flexShrink: 0,
//   },
//   resourceInfo: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "4px",
//   },
//   resName: {
//     fontSize: "14px",
//     fontWeight: "500",
//     color: "#111827",
//     lineHeight: "1.4",
//   },
//   resMeta: {
//     fontSize: "13px",
//     color: "#6B7280",
//     lineHeight: "1.4",
//   },
//   cursor: {
//     cursor: "pointer",
//   },
//   iconAction: {
//     cursor: "pointer",
//     transition: "transform 0.15s ease, color 0.2s ease",
//   },
//   resourceActions: {
//     display: "flex",
//     alignItems: "center",
//     gap: "12px",
//   },
//   addResourceBtn: {
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: "8px",
//     width: "100%",
//     padding: "16px",
//     backgroundColor: "transparent",
//     border: "2px dashed #E5E7EB",
//     borderRadius: "8px",
//     color: "#6B7280",
//     fontSize: "14px",
//     fontWeight: "500",
//     cursor: "pointer",
//     transition: "all 0.2s ease",
//   },
//   draftCard: {
//     padding: "20px",
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },
//   draftBadge: {
//     backgroundColor: "#9CA3AF",
//     color: "#FFFFFF",
//     fontSize: "11px",
//     fontWeight: "800",
//     width: "40px",
//     height: "40px",
//     borderRadius: "50%",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     flexShrink: 0,
//   },
//   draftTitle: {
//     fontSize: "15px",
//     color: "#6B7280",
//     margin: 0,
//     fontStyle: "italic",
//   },
//   setupBtn: {
//     padding: "10px 20px",
//     backgroundColor: "#0066FF",
//     color: "#FFFFFF",
//     border: "none",
//     borderRadius: "8px",
//     fontSize: "14px",
//     fontWeight: "600",
//     cursor: "pointer",
//   },
//   modalOverlay: {
//     position: "fixed",
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: "rgba(0,0,0,0.5)",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     zIndex: 1000,
//   },
//   modalContent: {
//     backgroundColor: "#FFF",
//     borderRadius: "16px",
//     width: "450px",
//     padding: "24px",
//     boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
//   },
//   modalHeader: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: "24px",
//   },
//   modalBody: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "16px",
//   },
//   label: {
//     fontSize: "13px",
//     fontWeight: "600",
//     color: "#374151",
//   },
//   input: {
//     padding: "12px",
//     borderRadius: "8px",
//     border: "1px solid #E5E7EB",
//     outline: "none",
//     fontSize: "14px",
//     fontFamily: "inherit",
//   },
//   typeGrid: {
//     display: "flex",
//     gap: "10px",
//   },
//   typeBtn: {
//     flex: 1,
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: "8px",
//     padding: "10px",
//     border: "1px solid #E5E7EB",
//     borderRadius: "8px",
//     backgroundColor: "#FFF",
//     cursor: "pointer",
//     fontSize: "13px",
//   },
//   activeType: {
//     flex: 1,
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: "8px",
//     padding: "10px",
//     border: "1px solid #0066FF",
//     borderRadius: "8px",
//     backgroundColor: "#F0F7FF",
//     color: "#0066FF",
//     cursor: "pointer",
//     fontSize: "13px",
//     fontWeight: "600",
//   },
//   filePlaceholder: {
//     padding: "24px",
//     border: "2px dashed #E5E7EB",
//     borderRadius: "12px",
//     display: "flex",
//     flexDirection: "column",
//     alignItems: "center",
//     gap: "8px",
//     color: "#6B7280",
//     fontSize: "14px",
//     cursor: "pointer",
//     transition: "all 0.2s ease",
//     minHeight: "120px",
//     justifyContent: "center",
//   },
//   filePreview: {
//     display: "flex",
//     alignItems: "center",
//     gap: "12px",
//     width: "100%",
//     padding: "12px",
//     backgroundColor: "#F9FAFB",
//     borderRadius: "8px",
//     border: "1px solid #E5E7EB",
//   },
//   modalFooter: {
//     display: "flex",
//     justifyContent: "flex-end",
//     gap: "12px",
//     marginTop: "24px",
//   },
//   cancelBtnModal: {
//     padding: "10px 16px",
//     border: "1px solid #E5E7EB",
//     borderRadius: "8px",
//     backgroundColor: "#FFF",
//     cursor: "pointer",
//     fontSize: "14px",
//   },
//   confirmBtn: {
//     padding: "10px 16px",
//     border: "none",
//     borderRadius: "8px",
//     backgroundColor: "#0066FF",
//     color: "#FFF",
//     fontWeight: "600",
//     cursor: "pointer",
//     fontSize: "14px",
//   },
//   loadingState: {
//     display: "flex",
//     justifyContent: "center",
//     alignItems: "center",
//     height: "200px",
//     color: "#6B7280",
//   },
// };
// }
// export default StudyRoadmap;


import React, { useState, useEffect, useRef } from "react";
import {
  Pencil,
  Trash2,
  FileText,
  Youtube,
  Download,
  ExternalLink,
  PlusCircle,
  X,
  Link as LinkIcon,
  Upload,
  Video,
} from "lucide-react";
import useAuthStore from "../../../../../store/useAuthStore";
import { apiGet, apiPost, apiPut, apiDelete } from "../../../../../utils/api";

const StudyRoadmap = ({
  selectedVenueId,
  venueName,
  venues,
  isActiveTab,
  addDayTrigger,
  selectedCourseType = "frontend",
}) => {
  const API_URL = import.meta.env.VITE_API_URL;
  const { user } = useAuthStore();

  const [roadmap, setRoadmap] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    learning_objectives: "",
  });
  const [lastAddDayTrigger, setLastAddDayTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [allVenuesModules, setAllVenuesModules] = useState([]);
  const [messageModal, setMessageModal] = useState({
    show: false,
    title: "",
    message: "",
    type: "success",
  });

  // Resource Modal State
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [currentModuleId, setCurrentModuleId] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [newResource, setNewResource] = useState({
    name: "",
    kind: "pdf",
    url: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch roadmap data for selected venue
  useEffect(() => {
    const fetchRoadmapData = async () => {
      if (!selectedVenueId) {
        setRoadmap([]);
        setAllVenuesModules([]);
        return;
      }

      if (selectedVenueId === "all") {
        // Fetch modules for all venues grouped
        setLoading(true);
        try {
          const response = await apiGet(`/roadmap/all-venues?course_type=${selectedCourseType}`);

          const data = await response.json();

          if (data.success) {
            setAllVenuesModules(data.data || []);
          } else {
            console.error("Failed to fetch all venues roadmap:", data.message);
            setAllVenuesModules([]);
          }
        } catch (error) {
          console.error("Error fetching all venues roadmap:", error);
          setAllVenuesModules([]);
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const response = await apiGet(`/roadmap/venue/${selectedVenueId}`);

        const data = await response.json();

        if (data.success) {
          setRoadmap(data.data);
        } else {
          console.error("Failed to fetch roadmap:", data.message);
          setRoadmap([]);
        }
      } catch (error) {
        console.error("Error fetching roadmap:", error);
        setRoadmap([]);
      } finally {
        setLoading(false);
      }
    };

    if (selectedVenueId && isActiveTab) {
      fetchRoadmapData();
      setEditingId(null);
    }
  }, [selectedVenueId, API_URL, isActiveTab, selectedCourseType]);

  // Handle add day trigger from parent
  useEffect(() => {
    if (addDayTrigger > lastAddDayTrigger && selectedVenueId && isActiveTab) {
      addDay();
      setLastAddDayTrigger(addDayTrigger);
    }
  }, [addDayTrigger, selectedVenueId, lastAddDayTrigger, isActiveTab]);

  /* ---------- DAY / MODULE HANDLERS ---------- */
  const addDay = async () => {
    if (!selectedVenueId) {
      console.error("No venue selected!");
      setMessageModal({
        show: true,
        title: "No Venue Selected",
        message: "Please select a venue first",
        type: "error",
      });
      return;
    }

    const isAllVenues = selectedVenueId === "all";

    // Calculate next day number based on course type
    let nextDay = 1;
    if (selectedVenueId === "all") {
      const modulesForCourse = allVenuesModules.filter(
        (m) => m.course_type === selectedCourseType,
      );
      if (modulesForCourse.length > 0) {
        nextDay = Math.max(...modulesForCourse.map((m) => m.day)) + 1;
      }
    } else {
      const modulesForCourse = roadmap.filter(
        (m) => m.course_type === selectedCourseType,
      );
      if (modulesForCourse.length > 0) {
        nextDay = Math.max(...modulesForCourse.map((m) => m.day)) + 1;
      }
    }

    if (isAllVenues) {
      const confirmed = await new Promise((resolve) => {
        setMessageModal({
          show: true,
          title: "Confirm Creation",
          message: `This will create a new ${selectedCourseType} module (Day ${nextDay}) for venues with skill order restrictions (if any).\n\nAre you sure you want to continue?`,
          type: "confirm",
          onConfirm: () => {
            setMessageModal({
              show: false,
              title: "",
              message: "",
              type: "success",
            });
            resolve(true);
          },
          onCancel: () => {
            setMessageModal({
              show: false,
              title: "",
              message: "",
              type: "success",
            });
            resolve(false);
          },
        });
      });

      if (!confirmed) {
        return;
      }
    }

    try {
      const newDay = {
        venue_id: isAllVenues ? venues[0]?.venue_id : selectedVenueId,
        day: nextDay,
        title: isAllVenues
          ? `All Venues - ${selectedCourseType} Day ${nextDay}`
          : `${venueName} - ${selectedCourseType} Day ${nextDay}`,
        description: "Enter module description here...",
        status: "draft",
        course_type: selectedCourseType,
        apply_to_all_venues: isAllVenues,
      };

      // Send to backend
      const response = await apiPost('/roadmap', newDay);

      const data = await response.json();

      if (data.success) {
        if (data.data.venues_count > 1 || isAllVenues) {
          // Multi-venue creation
          let message = `Roadmap module created for ${data.data.venues_count} venue(s) successfully!`;
          if (data.data.skipped_count > 0) {
            message += `\n\nSkipped ${data.data.skipped_count} venue(s) - module already exists.`;
          }
          setMessageModal({
            show: true,
            title: "Success",
            message: message,
            type: "success",
          });
          // Refresh all venues modules
          if (isAllVenues) {
            const response = await apiGet(`/roadmap/all-venues?course_type=${selectedCourseType}`);
            const refreshData = await response.json();
            if (refreshData.success) {
              setAllVenuesModules(refreshData.data);
            }
          }
        } else {
          // Single venue creation
          const newModule = {
            ...newDay,
            roadmap_id:
              data.data.roadmap_id || data.data.roadmaps[0].roadmap_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            resources: [],
          };

          const updatedRoadmap = [...roadmap, newModule];
          setRoadmap(updatedRoadmap);
          setMessageModal({
            show: true,
            title: "Success",
            message: "Roadmap module created successfully!",
            type: "success",
          });
        }
      } else {
        setMessageModal({
          show: true,
          title: "Error",
          message: data.message || "Failed to add module",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error adding day:", error);
      setMessageModal({
        show: true,
        title: "Error",
        message: error.message || "Failed to add module",
        type: "error",
      });
    }
  };

  const handleAddDay = () => {
    addDay();
  };

  const setupDraft = (id) => {
    const draftModule = roadmap.find((r) => r.roadmap_id === id);
    if (!draftModule) {
      setMessageModal({
        show: true,
        title: "Error",
        message: "Module not found",
        type: "error",
      });
      return;
    }

    setEditingId(id);
    setEditData({
      title: draftModule.title,
      description:
        draftModule.description || "Enter module description here...",
      learning_objectives: draftModule.learning_objectives || "",
    });

    // Update status locally to 'editing'
    const updatedRoadmap = roadmap.map((item) =>
      item.roadmap_id === id ? { ...item, status: "editing" } : item,
    );
    setRoadmap(updatedRoadmap);
  };

  const setupDraftGroup = (group_id) => {
    const draftModule = allVenuesModules.find((r) => r.group_id === group_id);
    if (!draftModule) {
      setMessageModal({
        show: true,
        title: "Error",
        message: "Module not found",
        type: "error",
      });
      return;
    }

    setEditingGroupId(group_id);
    setEditData({
      title: draftModule.title,
      description:
        draftModule.description || "Enter module description here...",
      learning_objectives: draftModule.learning_objectives || "",
    });

    // Update status locally to 'editing'
    const updatedModules = allVenuesModules.map((item) =>
      item.group_id === group_id ? { ...item, status: "editing" } : item,
    );
    setAllVenuesModules(updatedModules);
  };

  const startEdit = (item) => {
    setEditingId(item.roadmap_id);
    setEditData({
      title: item.title,
      description: item.description,
      learning_objectives: item.learning_objectives || "",
    });
  };

  const startEditGroup = (item) => {
    setEditingGroupId(item.group_id);
    setEditData({
      title: item.title,
      description: item.description,
      learning_objectives: item.learning_objectives || "",
    });
  };

  const saveEdit = async (id) => {
    try {
      const response = await apiPut(`/roadmap/${id}`, {
        title: editData.title,
        description: editData.description,
        learning_objectives: editData.learning_objectives,
        status: "published",
      });

      const data = await response.json();

      if (data.success) {
        const updatedRoadmap = roadmap.map((item) =>
          item.roadmap_id === id
            ? {
                ...item,
                title: editData.title,
                description: editData.description,
                learning_objectives: editData.learning_objectives,
                status: "published",
              }
            : item,
        );

        setRoadmap(updatedRoadmap);
        setEditingId(null);
        setMessageModal({
          show: true,
          title: "Success",
          message: "Module saved successfully!",
          type: "success",
        });
      } else {
        setMessageModal({
          show: true,
          title: "Error",
          message: data.message || "Failed to save",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error saving edit:", error);
      setMessageModal({
        show: true,
        title: "Error",
        message: error.message || "Failed to save",
        type: "error",
      });
    }
  };

  const saveEditGroup = async (group_id) => {
    try {
      const response = await apiPut(`/roadmap/group/${group_id}`, {
        title: editData.title,
        description: editData.description,
        learning_objectives: editData.learning_objectives,
        status: "published",
      });

      const data = await response.json();

      if (data.success) {
        const updatedModules = allVenuesModules.map((item) =>
          item.group_id === group_id
            ? {
                ...item,
                title: editData.title,
                description: editData.description,
                learning_objectives: editData.learning_objectives,
                status: "published",
              }
            : item,
        );

        setAllVenuesModules(updatedModules);

        // Also update the single venue roadmap state if it contains modules from this group
        const updatedRoadmap = roadmap.map((item) =>
          item.group_id === group_id
            ? {
                ...item,
                title: editData.title,
                description: editData.description,
                learning_objectives: editData.learning_objectives,
                status: "published",
              }
            : item,
        );
        setRoadmap(updatedRoadmap);

        setEditingGroupId(null);
        setMessageModal({
          show: true,
          title: "Success",
          message: `Module updated for ${data.data.updated_count} venue(s) successfully!`,
          type: "success",
        });
      } else {
        setMessageModal({
          show: true,
          title: "Error",
          message: data.message || "Failed to save",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error saving edit:", error);
      setMessageModal({
        show: true,
        title: "Error",
        message: error.message || "Failed to save",
        type: "error",
      });
    }
  };

  const cancelEdit = (id) => {
    const updatedRoadmap = roadmap.map((item) =>
      item.roadmap_id === id ? { ...item, status: "draft" } : item,
    );
    setRoadmap(updatedRoadmap);
    setEditingId(null);
  };

  const cancelEditGroup = (group_id) => {
    const updatedModules = allVenuesModules.map((item) =>
      item.group_id === group_id ? { ...item, status: "draft" } : item,
    );
    setAllVenuesModules(updatedModules);
    setEditingGroupId(null);
  };

  const deleteModuleGroup = async (group_id, course_type) => {
    const confirmed = await new Promise((resolve) => {
      setMessageModal({
        show: true,
        title: "Confirm Deletion",
        message: `Are you sure you want to delete this ${course_type} module from ALL venues? This will also delete all associated resources.`,
        type: "confirm",
        onConfirm: () => {
          setMessageModal({
            show: false,
            title: "",
            message: "",
            type: "success",
          });
          resolve(true);
        },
        onCancel: () => {
          setMessageModal({
            show: false,
            title: "",
            message: "",
            type: "success",
          });
          resolve(false);
        },
      });
    });

    if (!confirmed) return;

    try {
      const response = await apiDelete(`/roadmap/group/${group_id}`);

      const data = await response.json();

      if (data.success) {
        setAllVenuesModules(
          allVenuesModules.filter((item) => item.group_id !== group_id),
        );
        setMessageModal({
          show: true,
          title: "Success",
          message: `Module deleted from ${data.data.deleted_count} venue(s) successfully!`,
          type: "success",
        });
      } else {
        setMessageModal({
          show: true,
          title: "Error",
          message: data.message || "Failed to delete",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error deleting module group:", error);
      setMessageModal({
        show: true,
        title: "Error",
        message: error.message || "Failed to delete",
        type: "error",
      });
    }
  };

  const deleteDay = async (id) => {
    const confirmed = await new Promise((resolve) => {
      setMessageModal({
        show: true,
        title: "Confirm Deletion",
        message:
          "Are you sure you want to delete this module? This will also delete all associated resources.",
        type: "confirm",
        onConfirm: () => {
          setMessageModal({
            show: false,
            title: "",
            message: "",
            type: "success",
          });
          resolve(true);
        },
        onCancel: () => {
          setMessageModal({
            show: false,
            title: "",
            message: "",
            type: "success",
          });
          resolve(false);
        },
      });
    });

    if (!confirmed) return;

    try {
      const response = await apiDelete(`/roadmap/${id}`);

      const data = await response.json();

      if (data.success) {
        const updatedRoadmap = roadmap.filter((item) => item.roadmap_id !== id);
        setRoadmap(updatedRoadmap);
        setMessageModal({
          show: true,
          title: "Success",
          message: "Module deleted successfully!",
          type: "success",
        });
      } else {
        setMessageModal({
          show: true,
          title: "Error",
          message: data.message || "Failed to delete",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error deleting day:", error);
      setMessageModal({
        show: true,
        title: "Error",
        message: error.message || "Failed to delete",
        type: "error",
      });
    }
  };

  /* ---------- FILE UPLOAD HANDLERS ---------- */
  const handleFileSelect = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        const fileNameWithoutExt = file.name.replace(".pdf", "");
        setNewResource((prev) => ({
          ...prev,
          name: prev.name || fileNameWithoutExt,
        }));
      } else {
        setMessageModal({
          show: true,
          title: "Invalid File",
          message: "Please select a PDF file",
          type: "error",
        });
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        const fileNameWithoutExt = file.name.replace(".pdf", "");
        setNewResource((prev) => ({
          ...prev,
          name: prev.name || fileNameWithoutExt,
        }));
      } else {
        setMessageModal({
          show: true,
          title: "Invalid File",
          message: "Please drop a PDF file",
          type: "error",
        });
      }
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* ---------- RESOURCE HANDLERS ---------- */
  const handleOpenResourceModal = (moduleId, groupId = null) => {
    setCurrentModuleId(moduleId);
    setCurrentGroupId(groupId);
    setShowResourceModal(true);
    setSelectedFile(null);
    setNewResource({ name: "", kind: "pdf", url: "" });
  };

  const handleAddResource = async () => {
    if (!newResource.name.trim()) {
      setMessageModal({
        show: true,
        title: "Validation Error",
        message: "Please enter a resource name",
        type: "error",
      });
      return;
    }

    if (newResource.kind === "pdf" && !selectedFile) {
      setMessageModal({
        show: true,
        title: "Validation Error",
        message: "Please select a PDF file",
        type: "error",
      });
      return;
    }

    if (newResource.kind !== "pdf" && !newResource.url.trim()) {
      setMessageModal({
        show: true,
        title: "Validation Error",
        message: "Please enter a URL",
        type: "error",
      });
      return;
    }

    try {
      // Check if adding to all venues (group) or single venue
      if (currentGroupId) {
        // Get all roadmap_ids for this group_id
        const groupModule = allVenuesModules.find(
          (m) => m.group_id === currentGroupId,
        );
        if (!groupModule || !groupModule.venues) {
          setMessageModal({
            show: true,
            title: "Error",
            message: "Unable to find venues for this module group",
            type: "error",
          });
          return;
        }

        // For PDF files, we need to upload once and reuse the file path
        // For URLs, we can add to all venues directly
        let sharedFilePath = null;
        let successCount = 0;
        let failCount = 0;

        // First, upload the file if it's a PDF (upload once)
        if (newResource.kind === "pdf" && selectedFile) {
          const firstFormData = new FormData();
          firstFormData.append("roadmap_id", groupModule.venues[0].roadmap_id);
          firstFormData.append("resource_name", newResource.name.trim());
          firstFormData.append("resource_type", newResource.kind);
          firstFormData.append("file", selectedFile);

          const firstResponse = await fetch(`${API_URL}/roadmap/resources`, {
            method: "POST",
            credentials: 'include',
            body: firstFormData,
          });

          const firstData = await firstResponse.json();
          if (firstData.success) {
            sharedFilePath = firstData.data.file_path;
            successCount++;
          } else {
            setMessageModal({
              show: true,
              title: "Error",
              message: "Failed to upload file: " + firstData.message,
              type: "error",
            });
            return;
          }
        }

        // Add resource to remaining venues
        const startIndex = newResource.kind === "pdf" ? 1 : 0;
        for (let i = startIndex; i < groupModule.venues.length; i++) {
          const venue = groupModule.venues[i];
          let formData = new FormData();
          formData.append("roadmap_id", venue.roadmap_id);
          formData.append("resource_name", newResource.name.trim());
          formData.append("resource_type", newResource.kind);

          if (newResource.kind === "pdf") {
            // Reuse the uploaded file path
            formData.append("existing_file_path", sharedFilePath);
          } else {
            formData.append("resource_url", newResource.url.trim());
          }

          try {
            const response = await fetch(`${API_URL}/roadmap/resources`, {
              method: "POST",
              credentials: 'include',
              body: formData,
            });

            const data = await response.json();
            if (data.success) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (err) {
            failCount++;
          }
        }

        setShowResourceModal(false);
        setNewResource({ name: "", kind: "pdf", url: "" });
        setSelectedFile(null);
        setCurrentGroupId(null);

        let message = `Resource added to ${successCount} venue(s) successfully!`;
        if (failCount > 0) {
          message += `\n\nFailed for ${failCount} venue(s).`;
        }

        setMessageModal({
          show: true,
          title: "Success",
          message: message,
          type: successCount > 0 ? "success" : "error",
        });
        return;
      }

      // Single venue resource addition
      let formData = new FormData();
      formData.append("roadmap_id", currentModuleId);
      formData.append("resource_name", newResource.name.trim());
      formData.append("resource_type", newResource.kind);

      if (newResource.kind === "pdf" && selectedFile) {
        formData.append("file", selectedFile);
      } else {
        formData.append("resource_url", newResource.url.trim());
      }

      const response = await fetch(`${API_URL}/roadmap/resources`, {
        method: "POST",
        credentials: 'include',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Find the module and update its resources
        const updatedRoadmap = roadmap.map((item) => {
          if (item.roadmap_id === currentModuleId) {
            const newResourceObj = {
              resource_id: data.data.resource_id,
              resource_name: newResource.name.trim(),
              resource_type: newResource.kind,
              resource_url:
                newResource.kind === "pdf" ? null : newResource.url.trim(),
              file_path:
                newResource.kind === "pdf" ? data.data.file_path : null,
              file_size: selectedFile?.size || null,
              uploaded_at: new Date().toISOString(),
            };
            return {
              ...item,
              resources: [...(item.resources || []), newResourceObj],
            };
          }
          return item;
        });

        setRoadmap(updatedRoadmap);

        // Reset modal
        setShowResourceModal(false);
        setNewResource({ name: "", kind: "pdf", url: "" });
        setSelectedFile(null);

        setMessageModal({
          show: true,
          title: "Success",
          message: "Resource added successfully!",
          type: "success",
        });
      } else {
        setMessageModal({
          show: true,
          title: "Error",
          message: "Failed to add resource: " + data.message,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error adding resource:", error);
      setMessageModal({
        show: true,
        title: "Error",
        message: "Failed to add resource: " + error.message,
        type: "error",
      });
    }
  };

  const getResourceIcon = (kind) => {
    switch (kind) {
      case "pdf":
        return <FileText size={20} color="#EF4444" />;
      case "video":
        return <Youtube size={20} color="#FF0000" />;
      case "link":
        return <LinkIcon size={20} color="#3B82F6" />;
      default:
        return <FileText size={20} />;
    }
  };

  const handleResourceAction = async (res) => {
    if (res.resource_type === "pdf" && res.file_path) {
      // Download PDF file
      try {
        const response = await fetch(
          `${API_URL}/roadmap/resources/download/${res.resource_id}`,
          {
            credentials: 'include',
          },
        );

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = res.resource_name.toLowerCase().endsWith(".pdf")
            ? res.resource_name
            : `${res.resource_name}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } else {
          const errorData = await response.json();
          setMessageModal({
            show: true,
            title: "Download Failed",
            message:
              "Failed to download file: " +
              (errorData.message || "Unknown error"),
            type: "error",
          });
        }
      } catch (error) {
        console.error("Error downloading file:", error);
        setMessageModal({
          show: true,
          title: "Download Failed",
          message: "Failed to download file: " + error.message,
          type: "error",
        });
      }
    } else if (res.resource_url) {
      // Open external URL
      window.open(res.resource_url, "_blank", "noopener noreferrer");
    } else {
      setMessageModal({
        show: true,
        title: "Error",
        message: "No URL available for this resource.",
        type: "error",
      });
    }
  };

  const deleteResource = async (resourceId, roadmapId, e) => {
    e.stopPropagation();

    const confirmed = await new Promise((resolve) => {
      setMessageModal({
        show: true,
        title: "Confirm Deletion",
        message: "Are you sure you want to delete this resource?",
        type: "confirm",
        onConfirm: () => {
          setMessageModal({
            show: false,
            title: "",
            message: "",
            type: "success",
          });
          resolve(true);
        },
        onCancel: () => {
          setMessageModal({
            show: false,
            title: "",
            message: "",
            type: "success",
          });
          resolve(false);
        },
      });
    });

    if (!confirmed) return;

    try {
      const response = await apiDelete(`/roadmap/resources/${resourceId}`);

      const data = await response.json();
      if (data.success) {
        // Update local state
        const updatedRoadmap = roadmap.map((item) => {
          if (item.roadmap_id === roadmapId) {
            return {
              ...item,
              resources: item.resources.filter(
                (r) => r.resource_id !== resourceId,
              ),
            };
          }
          return item;
        });

        setRoadmap(updatedRoadmap);
        setMessageModal({
          show: true,
          title: "Success",
          message: "Resource deleted successfully!",
          type: "success",
        });
      } else {
        setMessageModal({
          show: true,
          title: "Error",
          message: "Failed to delete resource: " + data.message,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error deleting resource:", error);
      setMessageModal({
        show: true,
        title: "Error",
        message: "Failed to delete resource: " + error.message,
        type: "error",
      });
    }
  };

  if (!selectedVenueId) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.container}>
          <div style={styles.emptyState}>
            <h3
              style={{
                color: "#6B7280",
                marginBottom: "12px",
              }}
            >
              Select a Venue
            </h3>
            <p style={{ color: "#9CA3AF", marginBottom: "20px" }}>
              Please select a venue from the dropdown above to view or create a
              roadmap
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.container}>
          <div style={styles.loadingState}>
            <p>Loading roadmap...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        {/* Venue Header */}
        <div style={styles.skillHeader}>
          <h2 style={styles.skillTitle}>
            {selectedVenueId === "all"
              ? "All Venues"
              : venueName || `Venue ${selectedVenueId}`}
          </h2>
          <div style={styles.skillInfo}>
            {selectedVenueId === "all" ? (
              <>
                <span style={styles.moduleCount}>
                  {allVenuesModules.filter((m) => m.course_type === selectedCourseType).length} Module
                  {allVenuesModules.filter((m) => m.course_type === selectedCourseType).length !== 1 ? "s" : ""}
                </span>
                <span style={styles.skillCode}>
                  {(() => {
                    const filteredModules = allVenuesModules.filter((m) => m.course_type === selectedCourseType);
                    if (filteredModules.length === 0) return 0;
                    const venueSet = new Set();
                    filteredModules.forEach((module) => {
                      if (module.venues && Array.isArray(module.venues) && module.venues.length > 0) {
                        module.venues.forEach((venue) => {
                          if (venue && venue.venue_id) {
                            venueSet.add(venue.venue_id);
                          }
                        });
                      } else if (module.venue_id) {
                        venueSet.add(module.venue_id);
                      }
                    });
                    return venueSet.size;
                  })()} Venues
                </span>
              </>
            ) : (
              <>
                <span style={styles.skillCode}>
                  Venue ID:
                  {selectedVenueId}
                </span>
                <span style={styles.moduleCount}>
                  {roadmap.length} Module{roadmap.length !== 1 ? "s" : ""}
                </span>
                <span style={styles.draftCount}>
                  {roadmap.filter((m) => m.status === "draft").length} Draft
                  {roadmap.filter((m) => m.status === "draft").length !== 1
                    ? "s"
                    : ""}
                </span>
              </>
            )}
          </div>
        </div>

        <div style={styles.contentList}>
          {selectedVenueId === "all" ? (
            // All Venues View
            allVenuesModules.filter((m) => m.course_type === selectedCourseType)
              .length === 0 ? (
              <div style={styles.emptyState}>
                <h3 style={{ color: "#6B7280", marginBottom: "12px" }}>
                  No {selectedCourseType} modules yet
                </h3>
                <p style={{ color: "#9CA3AF", marginBottom: "20px" }}>
                  Create your first {selectedCourseType} module for all venues
                </p>
                <button style={styles.addDayBtn} onClick={handleAddDay}>
                  <PlusCircle size={18} />
                  <span>
                    Create First{" "}
                    {selectedCourseType.charAt(0).toUpperCase() +
                      selectedCourseType.slice(1)}{" "}
                    Module
                  </span>
                </button>
              </div>
            ) : (
              allVenuesModules
                .filter((m) => m.course_type === selectedCourseType)
                .map((module, index) => (
                  <React.Fragment key={module.group_id}>
                    {index !== 0 && <div style={styles.connector} />}
                    <div style={styles.card}>
                      {module.status === "draft" ? (
                        <div style={styles.draftCard}>
                          <div style={styles.headerInfo}>
                            <div style={styles.draftBadge}>
                              DAY {module.day}
                            </div>
                            <h3 style={styles.draftTitle}>{module.title}</h3>
                          </div>
                          <button
                            style={styles.setupBtn}
                            onClick={() => setupDraftGroup(module.group_id)}
                          >
                            Setup Content
                          </button>
                        </div>
                      ) : module.status === "editing" ||
                        module.status === "published" ? (
                        <>
                          <div style={styles.cardHeader}>
                            <div style={styles.headerInfo}>
                              <div style={styles.dayBadge}>
                                DAY {module.day}
                              </div>
                              {editingGroupId === module.group_id ? (
                                <input
                                  style={styles.titleInput}
                                  value={editData.title}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      title: e.target.value,
                                    })
                                  }
                                  placeholder="Enter module title..."
                                />
                              ) : (
                                <h3 style={styles.cardTitle}>{module.title}</h3>
                              )}
                            </div>
                            <div style={styles.headerActions}>
                              <span
                                style={{
                                  fontSize: "12px",
                                  color: "#6b7280",
                                  marginRight: "12px",
                                }}
                              >
                                {module.venues_count} venue
                                {module.venues_count > 1 ? "s" : ""}
                              </span>
                              {editingGroupId === module.group_id ? (
                                <>
                                  <button
                                    onClick={() =>
                                      saveEditGroup(module.group_id)
                                    }
                                    style={styles.saveBtn}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() =>
                                      cancelEditGroup(module.group_id)
                                    }
                                    style={styles.cancelBtn}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => startEditGroup(module)}
                                  style={styles.iconBtn}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#F9FAFB";
                                    e.currentTarget.style.borderColor = "#D1D5DB";
                                    e.currentTarget.style.transform = "translateY(-1px)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#FFFFFF";
                                    e.currentTarget.style.borderColor = "#E5E7EB";
                                    e.currentTarget.style.transform = "translateY(0)";
                                  }}
                                >
                                  <Pencil size={18} />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  deleteModuleGroup(
                                    module.group_id,
                                    module.course_type,
                                  )
                                }
                                style={styles.iconBtnRed}
                                title="Delete from all venues"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          <div style={styles.cardBody}>
                            {editingGroupId === module.group_id ? (
                              <>
                                <label
                                  style={{
                                    ...styles.label,
                                    marginBottom: "6px",
                                    display: "block",
                                  }}
                                >
                                  Description
                                </label>
                                <textarea
                                  style={styles.textArea}
                                  value={editData.description}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Enter module description..."
                                />
                                <label
                                  style={{
                                    ...styles.label,
                                    marginBottom: "6px",
                                    marginTop: "12px",
                                    display: "block",
                                  }}
                                >
                                  What you will learn in this skill
                                </label>
                                <textarea
                                  style={{
                                    ...styles.textArea,
                                    minHeight: "80px",
                                  }}
                                  value={editData.learning_objectives}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      learning_objectives: e.target.value,
                                    })
                                  }
                                  placeholder="List the key learning objectives for this module..."
                                />
                                <button
                                  style={{
                                    ...styles.addResourceBtn,
                                    marginTop: "16px",
                                  }}
                                  onClick={() =>
                                    handleOpenResourceModal(
                                      null,
                                      module.group_id,
                                    )
                                  }
                                >
                                  <PlusCircle size={18} />
                                  <span>
                                    Add Resource or File to All Venues
                                  </span>
                                </button>
                              </>
                            ) : (
                              <>
                                <div style={styles.descriptionBox}>
                                  <p style={styles.descriptionText}>
                                    {module.description}
                                  </p>
                                </div>

                                {module.learning_objectives && (
                                  <div style={styles.learningBox}>
                                    <strong style={styles.learningTitle}>
                                      What you will learn:
                                    </strong>
                                    <p style={styles.learningText}>
                                      {module.learning_objectives}
                                    </p>
                                  </div>
                                )}

                                <div
                                  style={{
                                    marginTop: "12px",
                                    padding: "8px 12px",
                                    background: "#f9fafb",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    color: "#6b7280",
                                  }}
                                >
                                  <strong style={{ color: "#374151" }}>
                                    Venues:
                                  </strong>{" "}
                                  {module.venues
                                    .map((v) => v.venue_name)
                                    .join(", ")}
                                </div>
                                <button
                                  style={{
                                    ...styles.addResourceBtn,
                                    marginTop: "16px",
                                  }}
                                  onClick={() =>
                                    handleOpenResourceModal(
                                      null,
                                      module.group_id,
                                    )
                                  }
                                >
                                  <PlusCircle size={18} />
                                  <span>
                                    Add Resource or File to All Venues
                                  </span>
                                </button>

                                {/* Resources Section for All Venues */}
                                {module.resources &&
                                  module.resources.length > 0 && (
                                    <div style={{ marginTop: "16px" }}>
                                      <h4
                                        style={{
                                          fontSize: "14px",
                                          fontWeight: "600",
                                          color: "#374151",
                                          marginBottom: "12px",
                                        }}
                                      >
                                        Resources:
                                      </h4>
                                      <div
                                        style={{
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: "8px",
                                          maxHeight: "200px",
                                          overflowY: "auto",
                                          paddingRight: "4px",
                                        }}
                                      >
                                        {module.resources.map((res) => (
                                          <div
                                            key={res.resource_id}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                              padding: "10px",
                                              background: "#f9fafb",
                                              borderRadius: "6px",
                                              border: "1px solid #e5e7eb",
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                flex: 1,
                                              }}
                                            >
                                              {res.resource_type === "pdf" ? (
                                                <FileText
                                                  size={18}
                                                  color="#0066FF"
                                                />
                                              ) : res.resource_type ===
                                                "video" ? (
                                                <Video
                                                  size={18}
                                                  color="#0066FF"
                                                />
                                              ) : (
                                                <LinkIcon
                                                  size={18}
                                                  color="#0066FF"
                                                />
                                              )}
                                              <span
                                                style={{
                                                  fontSize: "13px",
                                                  color: "#374151",
                                                  fontWeight: "500",
                                                }}
                                              >
                                                {res.resource_name}
                                              </span>
                                            </div>
                                            <div
                                              style={{
                                                display: "flex",
                                                gap: "6px",
                                              }}
                                            >
                                              {res.resource_type === "pdf" &&
                                              res.file_path ? (
                                                <button
                                                  onClick={() =>
                                                    downloadResource(res)
                                                  }
                                                  style={{
                                                    padding: "6px 10px",
                                                    background: "#0066FF",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "12px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                  }}
                                                >
                                                  <Download size={14} />
                                                  Download
                                                </button>
                                              ) : (
                                                <a
                                                  href={res.resource_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  style={{
                                                    padding: "6px 10px",
                                                    background: "#0066FF",
                                                    color: "white",
                                                    border: "none",
                                                    borderRadius: "4px",
                                                    cursor: "pointer",
                                                    fontSize: "12px",
                                                    textDecoration: "none",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                  }}
                                                >
                                                  <ExternalLink size={14} />
                                                  Open
                                                </a>
                                              )}
                                              <button
                                                onClick={() =>
                                                  deleteResource(
                                                    res.resource_id,
                                                  )
                                                }
                                                style={{
                                                  padding: "6px 10px",
                                                  background: "#ef4444",
                                                  color: "white",
                                                  border: "none",
                                                  borderRadius: "4px",
                                                  cursor: "pointer",
                                                  fontSize: "12px",
                                                }}
                                                title="Delete resource"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                              </>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </React.Fragment>
                ))
            )
          ) : roadmap.filter((m) => m.course_type === selectedCourseType).length === 0 ? (
            <div style={styles.emptyState}>
              <h3
                style={{
                  color: "#6B7280",
                  marginBottom: "12px",
                }}
              >
                No {selectedCourseType} modules yet
              </h3>
              <p
                style={{
                  color: "#9CA3AF",
                  marginBottom: "20px",
                }}
              >
                Create your first {selectedCourseType} module for {venueName}
              </p>
              <button style={styles.addDayBtn} onClick={handleAddDay}>
                <PlusCircle size={18} />
                <span>Add First {selectedCourseType.charAt(0).toUpperCase() + selectedCourseType.slice(1)} Module</span>
              </button>
            </div>
          ) : (
            roadmap.filter((m) => m.course_type === selectedCourseType).map((module, index) => (
              <React.Fragment key={module.roadmap_id}>
                {index !== 0 && <div style={styles.connector} />}
                <div style={styles.card}>
                  {module.status === "draft" ? (
                    <div style={styles.draftCard}>
                      <div style={styles.headerInfo}>
                        <div style={styles.draftBadge}>DAY {module.day}</div>
                        <h3 style={styles.draftTitle}>{module.title}</h3>
                      </div>
                      <button
                        style={styles.setupBtn}
                        onClick={() => setupDraft(module.roadmap_id)}
                      >
                        Setup Content
                      </button>
                    </div>
                  ) : module.status === "editing" ||
                    module.status === "published" ? (
                    <>
                      <div style={styles.cardHeader}>
                        <div style={styles.headerInfo}>
                          <div style={styles.dayBadge}>DAY {module.day}</div>
                          {editingId === module.roadmap_id ? (
                            <input
                              style={styles.titleInput}
                              value={editData.title}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  title: e.target.value,
                                })
                              }
                              placeholder="Enter module title..."
                            />
                          ) : (
                            <h3 style={styles.cardTitle}>{module.title}</h3>
                          )}
                        </div>
                        <div style={styles.headerActions}>
                          {editingId === module.roadmap_id ? (
                            <>
                              <button
                                onClick={() => saveEdit(module.roadmap_id)}
                                style={styles.saveBtn}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => cancelEdit(module.roadmap_id)}
                                style={styles.cancelBtn}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(module)}
                              style={styles.iconBtn}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#F9FAFB";
                                e.currentTarget.style.borderColor = "#D1D5DB";
                                e.currentTarget.style.transform = "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#FFFFFF";
                                e.currentTarget.style.borderColor = "#E5E7EB";
                                e.currentTarget.style.transform = "translateY(0)";
                              }}
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteDay(module.roadmap_id)}
                            style={styles.iconBtnRed}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div style={styles.cardBody}>
                        {editingId === module.roadmap_id ? (
                          <>
                            <label
                              style={{
                                ...styles.label,
                                marginBottom: "6px",
                                display: "block",
                              }}
                            >
                              Description
                            </label>
                            <textarea
                              style={styles.textArea}
                              value={editData.description}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Enter module description..."
                            />
                            <label
                              style={{
                                ...styles.label,
                                marginBottom: "6px",
                                marginTop: "12px",
                                display: "block",
                              }}
                            >
                              What you will learn in this skill
                            </label>
                            <textarea
                              style={{ ...styles.textArea, minHeight: "80px" }}
                              value={editData.learning_objectives}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  learning_objectives: e.target.value,
                                })
                              }
                              placeholder="List the key learning objectives for this module..."
                            />
                          </>
                        ) : (
                          <>
                            <div style={styles.descriptionBox}>
                              <p style={styles.descriptionText}>
                                {module.description}
                              </p>
                            </div>

                            {module.learning_objectives && (
                              <div style={styles.learningBox}>
                                <strong style={styles.learningTitle}>
                                  What you will learn:
                                </strong>
                                <p style={styles.learningText}>
                                  {module.learning_objectives}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {module.resources && module.resources.length > 0 && (
                          <div style={styles.resourceList}>
                            {module.resources.map((res) => (
                              <div
                                key={res.resource_id}
                                style={styles.resourceItem}
                              >
                                <div style={styles.resourceLeft}>
                                  <div
                                    style={{
                                      ...styles.resourceIconWrapper,
                                      backgroundColor:
                                        res.resource_type === "pdf"
                                          ? "#EEF2FF"
                                          : "#FEF2F2",
                                    }}
                                  >
                                    {getResourceIcon(res.resource_type)}
                                  </div>

                                  <div style={styles.resourceInfo}>
                                    <span style={styles.resName}>
                                      {res.resource_name}
                                    </span>

                                    <span style={styles.resMeta}>
                                      {res.resource_type === "pdf"
                                        ? "PDF Document"
                                        : res.resource_type === "video"
                                          ? "Video Link"
                                          : "Web Resource"}
                                      {res.file_size && <> • {res.file_size}</>}
                                      {res.duration && <> • {res.duration}</>}
                                    </span>
                                  </div>
                                </div>
                                <div style={styles.resourceActions}>
                                  {res.resource_type === "pdf" ? (
                                    <Download
                                      size={20}
                                      style={styles.iconAction}
                                      color="#6B7280"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResourceAction(res);
                                      }}
                                    />
                                  ) : (
                                    <ExternalLink
                                      size={20}
                                      style={styles.iconAction}
                                      color="#6B7280"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleResourceAction(res);
                                      }}
                                    />
                                  )}
                                  <Trash2
                                    size={20}
                                    style={styles.iconAction}
                                    color="#6B7280"
                                    onClick={(e) =>
                                      deleteResource(
                                        res.resource_id,
                                        module.roadmap_id,
                                        e,
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          style={styles.addResourceBtn}
                          onClick={() =>
                            handleOpenResourceModal(module.roadmap_id)
                          }
                        >
                          <PlusCircle size={18} />
                          <span>Add Resource or File</span>
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              </React.Fragment>
            ))
          )}

          {/* Add another day button */}
          {selectedVenueId === "all"
            ? allVenuesModules.filter(
                (m) => m.course_type === selectedCourseType,
              ).length > 0 && (
                <div style={styles.addAnotherContainer}>
                  <button style={styles.addAnotherBtn} onClick={handleAddDay}>
                    <PlusCircle size={18} />
                    <span>Add Another Day</span>
                  </button>
                </div>
              )
            : roadmap.filter((m) => m.course_type === selectedCourseType).length > 0 && (
                <div style={styles.addAnotherContainer}>
                  <button style={styles.addAnotherBtn} onClick={handleAddDay}>
                    <PlusCircle size={18} />
                    <span>Add Another Day</span>
                  </button>
                </div>
              )}
        </div>
      </div>

      {/* RESOURCE MODAL */}
      {showResourceModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>Add Resource</h3>
              <X
                style={styles.cursor}
                onClick={() => setShowResourceModal(false)}
              />
            </div>

            <div style={styles.modalBody}>
              <label style={styles.label}>Resource Title</label>
              <input
                style={styles.input}
                placeholder="e.g. Lecture Notes or
Tutorial Video"
                value={newResource.name}
                onChange={(e) =>
                  setNewResource({
                    ...newResource,
                    name: e.target.value,
                  })
                }
              />

              <label style={styles.label}>Type</label>
              <div style={styles.typeGrid}>
                <button
                  onClick={() =>
                    setNewResource({
                      ...newResource,
                      kind: "pdf",
                    })
                  }
                  style={
                    newResource.kind === "pdf"
                      ? styles.activeType
                      : styles.typeBtn
                  }
                >
                  <FileText size={18} /> PDF
                </button>
                <button
                  onClick={() =>
                    setNewResource({
                      ...newResource,
                      kind: "video",
                    })
                  }
                  style={
                    newResource.kind === "video"
                      ? styles.activeType
                      : styles.typeBtn
                  }
                >
                  <Youtube size={18} /> Video
                </button>
                <button
                  onClick={() =>
                    setNewResource({
                      ...newResource,
                      kind: "link",
                    })
                  }
                  style={
                    newResource.kind === "link"
                      ? styles.activeType
                      : styles.typeBtn
                  }
                >
                  <LinkIcon size={18} /> Link
                </button>
              </div>

              <label style={styles.label}>
                {newResource.kind === "pdf" ? "Upload File" : "Resource URL"}
              </label>

              {newResource.kind === "pdf" ? (
                <>
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                  />

                  {/* Drag and drop area */}
                  <div
                    style={{
                      ...styles.filePlaceholder,
                      borderColor: isDragging ? "#0066FF" : "#E5E7EB",
                      backgroundColor: isDragging ? "#F0F7FF" : "#FFFFFF",
                      borderStyle: selectedFile ? "solid" : "dashed",
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleFileSelect}
                  >
                    {selectedFile ? (
                      <div style={styles.filePreview}>
                        <FileText size={24} color="#0066FF" />
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontWeight: "600",
                              color: "#111827",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {selectedFile.name}
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              fontSize: "12px",
                              color: "#6B7280",
                            }}
                          >
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSelectedFile();
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#EF4444",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload size={20} />
                        <span>
                          Drag & drop a PDF file here or click to browse
                        </span>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#9CA3AF",
                            margin: "8px 0 0 0",
                          }}
                        >
                          Only PDF files are accepted
                        </p>
                      </>
                    )}
                  </div>

                  {/* Browse button (alternative toclicking the area) */}
                  {!selectedFile && (
                    <button
                      type="button"
                      onClick={handleFileSelect}
                      style={{
                        marginTop: "8px",
                        padding: "8px 16px",
                        backgroundColor: "#F3F4F6",
                        border: "1px solid #E5E7EB",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#374151",
                      }}
                    >
                      Browse Files
                    </button>
                  )}
                </>
              ) : (
                <input
                  style={styles.input}
                  placeholder="Enter URL"
                  value={newResource.url}
                  onChange={(e) =>
                    setNewResource({
                      ...newResource,
                      url: e.target.value,
                    })
                  }
                />
              )}
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.cancelBtnModal}
                onClick={() => setShowResourceModal(false)}
              >
                Cancel
              </button>
              <button style={styles.confirmBtn} onClick={handleAddResource}>
                Add Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Message Modal */}
      {messageModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
              borderRadius: "20px",
              padding: "32px",
              width: "90%",
              maxWidth: "440px",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              position: "relative",
            }}
          >
            {/* Icon Circle */}
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background:
                  messageModal.type === "success"
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : messageModal.type === "confirm"
                      ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                      : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
                boxShadow:
                  messageModal.type === "success"
                    ? "0 8px 16px rgba(16, 185, 129, 0.3)"
                    : messageModal.type === "confirm"
                      ? "0 8px 16px rgba(245, 158, 11, 0.3)"
                      : "0 8px 16px rgba(239, 68, 68, 0.3)",
              }}
            >
              <span
                style={{
                  fontSize: "32px",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                {messageModal.type === "success"
                  ? "✓"
                  : messageModal.type === "confirm"
                    ? "?"
                    : "✕"}
              </span>
            </div>

            {/* Title */}
            <h3
              style={{
                margin: "0 0 12px 0",
                fontSize: "22px",
                fontWeight: "700",
                color: "#111827",
                textAlign: "center",
              }}
            >
              {messageModal.title}
            </h3>

            {/* Message */}
            <p
              style={{
                margin: "0 0 24px 0",
                color: "#6b7280",
                lineHeight: "1.6",
                whiteSpace: "pre-line",
                textAlign: "center",
                fontSize: "15px",
              }}
            >
              {messageModal.message}
            </p>

            {/* Button */}
            <div
              style={{ display: "flex", justifyContent: "center", gap: "12px" }}
            >
              {messageModal.type === "confirm" ? (
                <>
                  <button
                    onClick={() =>
                      messageModal.onCancel && messageModal.onCancel()
                    }
                    style={{
                      padding: "12px 32px",
                      borderRadius: "10px",
                      border: "2px solid #e5e7eb",
                      background: "white",
                      color: "#6b7280",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "15px",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                      e.target.style.borderColor = "#9ca3af";
                      e.target.style.color = "#374151";
                    }}
                    onMouseOut={(e) => {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.color = "#6b7280";
                    }}
                  >
                    No
                  </button>
                  <button
                    onClick={() =>
                      messageModal.onConfirm && messageModal.onConfirm()
                    }
                    style={{
                      padding: "12px 32px",
                      borderRadius: "10px",
                      border: "none",
                      background:
                        "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      color: "white",
                      cursor: "pointer",
                      fontWeight: "600",
                      fontSize: "15px",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) =>
                      (e.target.style.transform = "translateY(-2px)")
                    }
                    onMouseOut={(e) =>
                      (e.target.style.transform = "translateY(0)")
                    }
                  >
                    Yes
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    setMessageModal({
                      show: false,
                      title: "",
                      message: "",
                      type: "success",
                    })
                  }
                  style={{
                    padding: "12px 48px",
                    borderRadius: "10px",
                    border: "none",
                    background:
                      messageModal.type === "success"
                        ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                        : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "15px",
                    boxShadow:
                      messageModal.type === "success"
                        ? "0 4px 12px rgba(16, 185, 129, 0.4)"
                        : "0 4px 12px rgba(239, 68, 68, 0.4)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) =>
                    (e.target.style.transform = "translateY(-2px)")
                  }
                  onMouseOut={(e) =>
                    (e.target.style.transform = "translateY(0)")
                  }
                >
                  Got it!
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles remain EXACTLY as in your original code
const styles = {
  pageWrapper: {
    backgroundColor: "#F8F9FB",
    fontFamily: '"Inter", sans-serif',
  },
  container: {
    width: "100%",
    padding: "10px 5px",
  },
  skillHeader: {
    marginBottom: "15px",
    paddingBottom: "10px",
    borderBottom: "1px solid #E5E7EB",
  },
  skillTitle: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  skillInfo: {
    display: "flex",
    gap: "16px",
    alignItems: "center",
  },
  skillCode: {
    backgroundColor: "#0066FF",
    color: "#FFFFFF",
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "14px",
    fontWeight: "600",
  },
  moduleCount: {
    color: "#6B7280",
    fontSize: "14px",
    fontWeight: "500",
  },
  draftCount: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "14px",
    fontWeight: "500",
  },
  contentList: {
    display: "flex",
    flexDirection: "column",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    padding: "60px 40px",
    textAlign: "center",
    border: "1px dashed #E5E7EB",
    marginTop: "20px",
  },
  addDayBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px",
    backgroundColor: "#0066FF",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#FFFFFF",
    cursor: "pointer",
    margin: "0 auto",
  },
  addAnotherContainer: {
    display: "flex",
    justifyContent: "center",
    marginTop: "24px",
    paddingTop: "24px",
    borderTop: "1px dashed #E5E7EB",
  },
  addAnotherBtn: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 18px",
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0066FF",
    cursor: "pointer",
  },
  connector: {
    width: "3px",
    height: "32px",
    backgroundColor: "#0066FF",
    marginLeft: "19px",
    opacity: 0.2,
    borderRadius: "3px",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    border: "1px solid #E5E7EB",
    overflow: "hidden",
    marginBottom: "4px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  cardHeader: {
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #F3F4F6",
  },
  headerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
  },
  dayBadge: {
    backgroundColor: "#0066FF",
    color: "#FFFFFF",
    fontSize: "11px",
    fontWeight: "800",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 6px -1px rgba(0, 102, 255, 0.2)",
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    margin: 0,
  },
  titleInput: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #E5E7EB",
    fontSize: "16px",
    fontWeight: "600",
    width: "70%",
    outline: "none",
  },
  headerActions: {
    display: "flex",
    gap: "8px",
  },
  iconBtn: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    color: "#374151",
    cursor: "pointer",
    width: "36px",
    height: "36px",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    transition: "all 0.2s ease",
  },
  iconBtnRed: {
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    color: "#EF4444",
    cursor: "pointer",
    width: "36px",
    height: "36px",
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    transition: "all 0.2s ease",
  },
  saveBtn: {
    backgroundColor: "#10B981",
    color: "#FFF",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
  cancelBtn: {
    backgroundColor: "#6B7280",
    color: "#FFF",
    border: "none",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
  cardBody: {
    padding: "24px",
  },
  textArea: {
    width: "100%",
    minHeight: "100px",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #E5E7EB",
    marginBottom: "16px",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical",
  },
  description: {
    fontSize: "14px",
    color: "#6B7280",
    margin: "0 0 20px 0",
    lineHeight: 1.6,
  },
  descriptionBox: {
    padding: "0",
    marginBottom: "16px",
  },
  descriptionText: {
    fontSize: "14px",
    color: "#6B7280",
    margin: "0",
    lineHeight: 1.6,
  },
  learningBox: {
    marginTop: "0",
    marginBottom: "24px",
    padding: "16px",
    background: "#EFF6FF",
    border: "1px solid #DBEAFE",
    borderLeft: "3px solid #3B82F6",
    borderRadius: "8px",
  },
  learningTitle: {
    color: "#1D4ED8",
    fontSize: "14px",
    fontWeight: "600",
    display: "block",
    marginBottom: "8px",
  },
  learningText: {
    fontSize: "14px",
    color: "#475569",
    margin: "0",
    lineHeight: 1.6,
    whiteSpace: "pre-line",
  },
  resourceList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "24px",
    marginBottom: "16px",
    maxHeight: "200px",
    overflowY: "auto",
    paddingRight: "6px",
  },
  resourceItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid #E5E7EB",
    backgroundColor: "#FFFFFF",
    transition: "all 0.2s ease",
  },
  resourceLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
  },
  resourceIconWrapper: {
    width: "48px",
    height: "48px",
    backgroundColor: "#F9FAFB",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resourceInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  resName: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#111827",
    lineHeight: "1.4",
  },
  resMeta: {
    fontSize: "13px",
    color: "#6B7280",
    lineHeight: "1.4",
  },
  cursor: {
    cursor: "pointer",
  },
  iconAction: {
    cursor: "pointer",
    transition: "transform 0.15s ease, color 0.2s ease",
  },
  resourceActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  addResourceBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "16px",
    backgroundColor: "transparent",
    border: "2px dashed #E5E7EB",
    borderRadius: "8px",
    color: "#6B7280",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  draftCard: {
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  draftBadge: {
    backgroundColor: "#9CA3AF",
    color: "#FFFFFF",
    fontSize: "11px",
    fontWeight: "800",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  draftTitle: {
    fontSize: "15px",
    color: "#6B7280",
    margin: 0,
    fontStyle: "italic",
  },
  setupBtn: {
    padding: "10px 20px",
    backgroundColor: "#0066FF",
    color: "#FFFFFF",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: "16px",
    width: "450px",
    padding: "24px",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #E5E7EB",
    outline: "none",
    fontSize: "14px",
    fontFamily: "inherit",
  },
  typeGrid: {
    display: "flex",
    gap: "10px",
  },
  typeBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    backgroundColor: "#FFF",
    cursor: "pointer",
    fontSize: "13px",
  },
  activeType: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px",
    border: "1px solid #0066FF",
    borderRadius: "8px",
    backgroundColor: "#F0F7FF",
    color: "#0066FF",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
  filePlaceholder: {
    padding: "24px",
    border: "2px dashed #E5E7EB",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    color: "#6B7280",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    minHeight: "120px",
    justifyContent: "center",
  },
  filePreview: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "12px",
    backgroundColor: "#F9FAFB",
    borderRadius: "8px",
    border: "1px solid #E5E7EB",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "24px",
  },
  cancelBtnModal: {
    padding: "10px 16px",
    border: "1px solid #E5E7EB",
    borderRadius: "8px",
    backgroundColor: "#FFF",
    cursor: "pointer",
    fontSize: "14px",
  },
  confirmBtn: {
    padding: "10px 16px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#0066FF",
    color: "#FFF",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
  },
  loadingState: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "200px",
    color: "#6B7280",
  },
};

export default StudyRoadmap;
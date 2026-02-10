# Venue Bulk Upload Feature - User Guide

## Overview
The Venue Bulk Upload feature allows Super Admins to upload multiple students to a venue at once using an Excel file. This streamlines the process of allocating students to venues and assigning faculty members.

## Features

### 🎯 Core Functionality
- **Bulk Upload**: Upload multiple students to a venue in a single operation
- **Automatic Replacement**: Existing students in the target venue are replaced with new students from the Excel file
- **Student Reallocation**: If a student is already in another venue, they are automatically moved to the new venue
- **Faculty Assignment**: Assigns faculty to both the venue and the students
- **Group Management**: Automatically manages group memberships

### ✅ Validation System
- Registration numbers must exist in the users table (ID column)
- Venue name must match exactly with the database
- Faculty email must match exactly with the database
- All students must be active in the system
- One venue and one faculty per upload

## How to Use

### Step 1: Access the Feature
1. Log in as **Super Admin**
2. Navigate to **"Venue Bulk Upload"** from the sidebar
3. The page displays:
   - Available venues with their current capacity
   - Available faculties with their email addresses

### Step 2: Download the Excel Template
1. Click the **"Download Excel Template"** button
2. The template includes three columns:
   - **Registration Number**: Student's registration number (e.g., 2021-CS-001)
   - **Venue Name**: Exact name of the venue (e.g., Lab A)
   - **Faculty Email**: Faculty's email address (e.g., faculty@example.com)

### Step 3: Fill in the Excel File
1. Open the downloaded template
2. Fill in each row with student details:
   ```
   Registration Number | Venue Name | Faculty Email
   2021-CS-001        | Lab A      | faculty@example.com
   2021-CS-002        | Lab A      | faculty@example.com
   2021-CS-003        | Lab A      | faculty@example.com
   ```
3. **Important Rules**:
   - Use the same venue name for all students in one file
   - Use the same faculty email for all students in one file
   - Registration numbers must match exactly with the system
   - Venue name must match exactly with available venues
   - Faculty email must match exactly with available faculties

### Step 4: Upload the File
1. Drag and drop the Excel file into the upload zone, or click "Choose File"
2. Verify the file information is displayed
3. Click **"Upload and Assign Students"**
4. Wait for the upload to complete

### Step 5: Review Results
After successful upload, you'll see:
- **Venue Information**: Name and ID of the target venue
- **Faculty Assignment**: Faculty name and email
- **Group Assignment**: Group name and ID
- **Statistics**:
  - Total students processed
  - Students added to the venue
  - Students replaced in the target venue
  - Students moved from other venues
- **Detailed Breakdown**:
  - List of students removed from the venue
  - List of students moved from other venues (with previous venue names)

## Backend Implementation

### API Endpoints

#### 1. Bulk Upload Students
```
POST /api/venue-bulk-upload/upload
Content-Type: multipart/form-data
Authorization: Required (Super Admin)

Form Data:
- file: Excel file (.xlsx or .xls)

Response:
{
  "success": true,
  "message": "Students successfully uploaded to venue",
  "data": {
    "venue": { "name": "Lab A", "id": 1 },
    "faculty": { "name": "John Doe", "email": "john@example.com" },
    "group": { "name": "Group A1", "id": 1 },
    "studentsProcessed": {
      "total": 30,
      "addedToVenue": 30,
      "removedFromOtherVenues": 5,
      "replacedInTargetVenue": 25
    },
    "removedFromVenue": [...],
    "movedFromOtherVenues": [...]
  }
}
```

#### 2. Download Template
```
GET /api/venue-bulk-upload/template
Authorization: Required (Super Admin)

Response: Excel file download
```

#### 3. Get Available Venues
```
GET /api/venue-bulk-upload/venues
Authorization: Required (Super Admin)

Response:
{
  "success": true,
  "data": [
    {
      "venue_id": 1,
      "venue_name": "Lab A",
      "location": "Building 1",
      "capacity": 50,
      "current_students": 25,
      "year": 2,
      "faculty_name": "John Doe",
      "faculty_email": "john@example.com"
    }
  ]
}
```

#### 4. Get Available Faculties
```
GET /api/venue-bulk-upload/faculties
Authorization: Required (Super Admin)

Response:
{
  "success": true,
  "data": [
    {
      "faculty_id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "department": "Computer Science",
      "designation": "Professor",
      "assigned_venues": 2,
      "assigned_students": 45
    }
  ]
}
```

### Database Operations

The bulk upload process performs the following operations in a transaction:

1. **Validates venue existence**: Checks if the venue exists and is not deleted
2. **Validates faculty**: Verifies faculty exists and is active
3. **Validates students**: Confirms all registration numbers exist in the system
4. **Gets target group**: Finds the active group for the venue
5. **Removes existing allocations**: Sets existing students in the venue to 'Dropped' status
6. **Removes conflicting allocations**: Drops students from other venues if they're being moved
7. **Adds new allocations**: Inserts new group_students records with 'Active' status
8. **Updates venue faculty**: Sets assigned_faculty_id on the venue
9. **Updates students faculty**: Sets assigned_faculty_id for all students
10. **Updates group faculty**: Sets faculty_id on the groups table

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Venue not found" | Venue name doesn't match database | Check spelling and use exact venue name from the list |
| "Faculty not found" | Faculty email doesn't match or faculty is inactive | Use exact email from the faculties list |
| "Registration numbers not found" | Student doesn't exist or is inactive | Verify registration numbers in the system |
| "Missing required columns" | Excel file format is incorrect | Use the provided template |
| "Multiple venue names" | Different venues in the same file | Upload students for one venue at a time |
| "No active groups found" | Venue has no active groups | Create a group for the venue first |

## Files Created

### Backend
1. **Controller**: `server/controllers/venueBulkUpload.controller.js`
   - `bulkUploadStudentsToVenue()`: Main upload handler
   - `downloadTemplate()`: Template generator
   - `getAvailableVenues()`: Venues list
   - `getAvailableFaculties()`: Faculties list

2. **Routes**: `server/routes/venueBulkUpload.routes.js`
   - Configured with multer for file uploads
   - 10MB file size limit
   - Super Admin authorization required

3. **Server Integration**: Updated `server/index.js`
   - Added route import and registration
   - Registered at `/api/venue-bulk-upload/*`

### Frontend
1. **Component**: `Frontend/src/pages/SuperAdmin/VenueBulkUpload/VenueBulkUpload.jsx`
   - Complete upload interface
   - Drag-and-drop file upload
   - Real-time validation
   - Detailed results display

2. **Styles**: `Frontend/src/pages/SuperAdmin/VenueBulkUpload/VenueBulkUpload.css`
   - Modern, responsive design
   - Gradient headers and buttons
   - Interactive animations
   - Mobile-friendly layout

3. **Navigation**: Updated files
   - `Frontend/src/Navigation/AppNavigator.jsx`: Added route
   - `Frontend/src/components/TabRouter/SideTab.jsx`: Added sidebar link

## Security

- **Authentication Required**: All endpoints require valid authentication
- **Role-Based Access**: Only Super Admin can access this feature
- **File Validation**: Only Excel files (.xlsx, .xls) are accepted
- **Size Limit**: Maximum 10MB file size
- **Transaction Safety**: All database operations are wrapped in transactions
- **Rollback on Error**: Any failure rolls back all changes

## Best Practices

1. **Before Upload**:
   - Review the available venues and faculties lists
   - Verify registration numbers exist in the system
   - Use the exact venue name and faculty email

2. **During Upload**:
   - Upload students for one venue at a time
   - Ensure all rows have the same venue and faculty
   - Keep file size under 10MB

3. **After Upload**:
   - Review the detailed results
   - Verify student count matches expectations
   - Check if any students were moved from other venues

## Troubleshooting

### Upload Fails
1. Check the error message for specific issues
2. Verify Excel file format matches the template
3. Confirm all registration numbers are valid
4. Ensure venue name and faculty email are exact matches

### Missing Students
1. Verify registration numbers in the users table
2. Check if students are marked as active (is_active = 1)
3. Confirm students have the correct role (role_id = 3)

### Group Not Found
1. Create an active group for the venue before uploading
2. Verify the group status is 'Active'
3. Check that the group is linked to the correct venue

## Support

For technical issues or questions:
1. Check the error message in the UI
2. Review the browser console for detailed errors
3. Check server logs for backend errors
4. Verify database constraints are met

---

**Last Updated**: February 10, 2026
**Feature Version**: 1.0

# Roadmap Visibility Fix & Task Extension Feature

## Changes Made

### 1. Fixed Roadmap Visibility for Faculty (✓ COMPLETED)

**Problem**: Faculty could not see roadmap for venues they were assigned to. The system was filtering roadmaps by `roadmap.faculty_id` instead of checking venue assignment.

**Solution**: Updated [roadmap.controller.js](../server/controllers/roadmap.controller.js) `getRoadmapByVenue` function:
- Admin: Can see all roadmap modules for any venue
- Faculty: Can see all roadmap modules for venues where they are assigned (using `venue.assigned_faculty_id`)
- Added venue assignment verification for faculty before showing roadmap

**Files Modified**:
- `server/controllers/roadmap.controller.js` - Lines 115-172

---

### 2. Automatic Task Due Date Extension for Redo Tasks (✓ COMPLETED)

**Problem**: Students who received grades below 50% (Needs Revision status) had no automatic extension, making it difficult for them to resubmit before the original deadline.

**Solution**: 
- When faculty grades a submission below 50%, the system automatically extends the due date by 1 day
- Extension is cumulative - if a student needs multiple revisions, they get an additional day each time
- Extended due date is stored in a new `task_extensions` table

**Files Modified**:
- `server/controllers/tasks.controller.js` - Modified `gradeSubmission` function (Lines 813-947)
- `server/controllers/tasks.controller.js` - Modified `getStudentTasks` to include extended due dates (Lines 1314-1578)

**Database Changes**:
- Created new table `task_extensions` (see migration file)

---

### 3. Manual Task Extension Option for Faculty (✓ COMPLETED)

**Feature**: Faculty and admin can manually extend task deadlines for specific students.

**New API Endpoint**:
```
PUT /api/tasks/extend/:task_id/student/:student_id
```

**Request Body**:
```json
{
  "extension_days": 2  // Optional, defaults to 1
}
```

**Response**:
```json
{
  "success": true,
  "message": "Task deadline extended by 2 day(s) for this student",
  "data": {
    "task_id": 123,
    "student_id": 456,
    "original_due_date": "2026-02-01T23:59:59.000Z",
    "extended_due_date": "2026-02-03T23:59:59.000Z",
    "extension_days": 2
  }
}
```

**Files Modified**:
- `server/controllers/tasks.controller.js` - Added `extendTaskDueDate` function (Lines 1939-2051)
- `server/routes/tasks.routes.js` - Added route for manual extension

**Authorization**:
- Admin: Can extend deadlines for any task/student
- Faculty: Can only extend deadlines for tasks in venues they are assigned to

---

## Database Migration Required

Run the following SQL migration to create the `task_extensions` table:

```sql
-- File: server/migrations/task_extensions_table.sql
CREATE TABLE IF NOT EXISTS task_extensions (
  extension_id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT NOT NULL,
  student_id INT NOT NULL,
  original_due_date DATETIME NOT NULL,
  extended_due_date DATETIME NOT NULL,
  extension_days INT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_task_student (task_id, student_id),
  
  INDEX idx_task_id (task_id),
  INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## How It Works

### Automatic Extension Flow:
1. Faculty grades a student submission
2. If grade < 50%, submission status becomes "Needs Revision"
3. System automatically extends due date by 1 day
4. Student can see the extended deadline in their task list
5. If student resubmits and still gets < 50%, another day is added automatically

### Manual Extension Flow:
1. Faculty/Admin views student submissions in reports
2. Faculty can manually extend deadline using API call
3. Extension can be for any number of days
4. Extension is cumulative (adds to existing extensions)

### Student View:
- Students see the **effective due date** (extended date if available)
- Original due date is preserved in the database
- Task status reflects the extended deadline (not marked overdue if within extension)

---

## API Response Changes

### `/api/tasks/student` Response:
Tasks now include extension information:
```json
{
  "id": 123,
  "title": "React Components Assignment",
  "dueDate": "2026-02-03T23:59:59.000Z",        // Extended date (if exists)
  "originalDueDate": "2026-02-01T23:59:59.000Z", // Original date
  "isExtended": true,
  "extensionDays": 2,
  "status": "revision",  // or "pending", "completed", "overdue"
  // ... other fields
}
```

---

## Frontend Integration Notes

To integrate these features in the frontend:

### 1. Display Extended Due Dates:
```jsx
{task.isExtended && (
  <div className="extension-notice">
    Due date extended by {task.extensionDays} day(s)
    <small>Original: {formatDate(task.originalDueDate)}</small>
  </div>
)}
```

### 2. Faculty Manual Extension Button:
```jsx
const handleExtendDeadline = async (taskId, studentId, days = 1) => {
  const response = await apiPut(
    `/tasks/extend/${taskId}/student/${studentId}`,
    { extension_days: days }
  );
  
  if (response.success) {
    alert(response.message);
    // Refresh submissions list
  }
};
```

### 3. Show Extension Info in Reports:
In the task submissions view for faculty, show:
- Current deadline (extended or original)
- Number of extensions granted
- Option to extend further if needed

---

## Testing

### Test Scenarios:

1. **Roadmap Visibility**:
   - Login as faculty assigned to a venue
   - Navigate to Tasks & Assignments > Study Roadmap
   - Select your assigned venue
   - Verify roadmap modules are displayed

2. **Automatic Extension**:
   - Create a task with a due date
   - Student submits the task
   - Faculty grades it with < 50%
   - Verify student sees extended due date (+1 day)
   - Grade it again with < 50%
   - Verify due date is extended again (+1 more day)

3. **Manual Extension**:
   - Use API call or (future) UI button
   - Extend a task deadline by 2 days for a specific student
   - Verify student sees the new extended deadline
   - Verify other students still see original deadline

---

## Future Enhancements

- [ ] Add UI button in faculty reports for manual extension
- [ ] Add extension history/audit log
- [ ] Allow bulk extensions for multiple students
- [ ] Add maximum extension limit configuration
- [ ] Send notification to student when deadline is extended
- [ ] Add extension reason field (optional comment from faculty)

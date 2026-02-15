# Student Submission & Faculty Assignment - Implementation Summary

## Overview
This system ensures that when students submit code assignments, they are properly assigned to the faculty member responsible for their **current venue**, and submissions follow students when they change venues.

## Database Schema

### Tables Involved

1. **web_code_submissions** - Stores web code (HTML/CSS/JS) submissions
   - `current_venue_id` - The venue the student was in at submission time (or current venue if moved)
   - `status` - 'Pending Review', 'Under Review', 'Graded'
   - `student_id` - The student who submitted
   
2. **web_submission_files** - Stores individual files (HTML, CSS, JS)
   - `submission_id` - Links to web_code_submissions
   - `file_content` - The actual code content
   
3. **task_submissions** - Stores regular file/link submissions
   - `current_venue_id` - The venue the student was in
   - Similar structure to web_code_submissions

4. **group_students** - Links students to venues through groups
   - `status` - 'Active' (currently in venue) or 'Dropped' (moved to another venue)

## Key Flows

### 1. Student Submits Code

**File**: `server/controllers/tasks.controller.js` - `submitWebCode()`

```javascript
// Get student's CURRENT venue (not task venue!)
const [studentVenueResult] = await connection.execute(
  `SELECT g.venue_id 
   FROM students s
   INNER JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
   INNER JOIN \`groups\` g ON gs.group_id = g.group_id
   WHERE s.student_id = ?`,
  [student_id]
);

const current_venue_id = studentVenueResult.length > 0 ? studentVenueResult[0].venue_id : null;

// Store submission with current venue
INSERT INTO web_code_submissions 
(task_id, student_id, question_id, current_venue_id, workspace_mode, ...)
VALUES (?, ?, ?, ?, ?, ...)
```

**Why current venue?**
- Tasks might be assigned to multiple venues
- Student might be in a different venue than where the task was created
- Faculty should see submissions from students in **their** venue

### 2. Student Changes Venue

**File**: `server/controllers/groups.controller.js` - `addIndividualStudentToVenue()`

When a student is moved to a new venue:

```javascript
// 1. Drop from old venue
UPDATE group_students SET status = 'Dropped' WHERE id = ?

// 2. Add to new venue  
INSERT INTO group_students (group_id, student_id, status) VALUES (?, ?, 'Active')

// 3. Update ungraded submissions to new venue (async)
updateSubmissionVenues(studentId, newVenueId)
```

**File**: `server/controllers/groups.controller.js` - `updateSubmissionVenues()` helper

```javascript
// Update web code submissions that are NOT graded yet
UPDATE web_code_submissions 
SET current_venue_id = ? 
WHERE student_id = ? 
  AND status IN ('Pending Review', 'Under Review')

// Update regular task submissions that are NOT graded yet
UPDATE task_submissions 
SET current_venue_id = ? 
WHERE student_id = ? 
  AND status IN ('Pending Review', 'Under Review')
```

**Important**: Only ungraded submissions move with the student. Graded submissions stay with the faculty who graded them for record-keeping.

### 3. Faculty Views Submissions

**File**: `server/controllers/tasks.controller.js` - `getWebCodeSubmissions()`

Faculty sees submissions for students in **their** venue:

```javascript
SELECT 
  wcs.*,
  t.title as task_title,
  u.name as student_name,
  qb.title as question_title
FROM web_code_submissions wcs
JOIN tasks t ON wcs.task_id = t.task_id
JOIN students s ON wcs.student_id = s.student_id
JOIN users u ON s.user_id = u.user_id
WHERE wcs.current_venue_id = ?  // Faculty's venue
  AND wcs.status = ?  // 'Pending Review' or 'all'
ORDER BY wcs.submitted_at DESC
```

### 4. Faculty Reviews Code

**File**: `server/controllers/tasks.controller.js` - `getWebCodeSubmissionDetail()`

Faculty can view the full code submission with all files:

```javascript
// Get submission details
SELECT wcs.*, t.title, u.name as student_name, qb.description
FROM web_code_submissions wcs
WHERE wcs.submission_id = ?

// Get all code files
SELECT file_id, file_name, file_type, file_content
FROM web_submission_files  
WHERE submission_id = ?
ORDER BY file_order
```

**Frontend**: Faculty can run the code live in the evaluation screen to see exactly what the student built.

### 5. Faculty Grades Submission

**File**: `server/controllers/tasks.controller.js` - `gradeWebCodeSubmission()`

```javascript
UPDATE web_code_submissions 
SET 
  grade = ?,
  max_score = ?,
  feedback = ?,
  status = 'Graded',
  graded_at = NOW(),
  graded_by = ?
WHERE submission_id = ?
```

## Scenario Examples

### Scenario 1: Student Submits, Faculty Reviews
1. Student (venue A) submits HTML/CSS code
2. Submission saved with `current_venue_id = A`
3. Faculty for venue A sees submission in "Pending Review"
4. Faculty grades it
5. Status changes to "Graded"

### Scenario 2: Student Moves Before Review
1. Student (venue A) submits code
2. Submission saved with `current_venue_id = A`
3. Student moves to venue B before faculty reviews
4. `updateSubmissionVenues()` runs automatically
5. Submission `current_venue_id` updated to B
6. Faculty for venue B now sees it (faculty A doesn't)
7. Faculty B reviews and grades

### Scenario 3: Student Moves After Review
1. Student (venue A) submits code
2. Faculty A reviews and grades (status = 'Graded')
3. Student moves to venue B
4. `updateSubmissionVenues()` skips this submission (already graded)
5. Faculty A still has record of grading this student
6. Faculty B doesn't see it (correct - already graded)

## Task Assignment by Skill Order

**File**: `server/controllers/tasks.controller.js` - `getTasksForStudent()`

Tasks are shown to students based on:
1. **Skill Filter**: Task must match student's current skill level
2. **Venue**: Student must be in an active venue
3. **Skill Order**: Tasks appear in the correct sequence

```javascript
SELECT DISTINCT
  t.*,
  CASE 
    WHEN ts.submission_id IS NOT NULL THEN ts.status
    ELSE 'Pending'
  END as completion_status
FROM tasks t
INNER JOIN skill_order so ON t.skillFilter = so.skill_name
INNER JOIN group_students gs ON gs.status = 'Active'
INNER JOIN \`groups\` g ON gs.group_id = g.group_id
WHERE gs.student_id = ?
  AND t.venue_id = g.venue_id
  AND t.status = 'Active'
ORDER BY so.order_index, t.created_at
```

## API Endpoints

### Student Endpoints
- `POST /tasks/:task_id/submit-web-code` - Submit HTML/CSS/JS code
- `GET /tasks/student/:task_id` - Get task details with question
- `GET /tasks/:task_id/questions` - Get assigned question(s)

### Faculty Endpoints  
- `GET /tasks/web-submissions/venue/:venue_id` - Get all submissions for venue
- `GET /tasks/web-submissions/:submission_id` - Get submission details with code
- `PUT /tasks/web-submissions/:submission_id/grade` - Grade a submission

## Database Migrations

Ensure these migrations have been run:
- `add_current_venue_to_submissions.sql` - Adds current_venue_id column
- `create_question_bank_tables.sql` - Creates question bank system
- `create_task_question_assignments.sql` - Links tasks to questions
- `add_skill_order_venue_year_associations.sql` - Skill order tracking

## Frontend Components

### Student Side
- `WebWorkspace.jsx` - Code editor for HTML/CSS/JS
- `MCQWorkspace.jsx` - Multiple choice questions
- `CodePracticePage.jsx` - Main practice page with workspace selector
- `WorkspaceSelector.jsx` - Choose between HTML+CSS or HTML+CSS+JS

### Faculty Side (TODO: Verify exists)
- Code evaluation screen with live preview
- Grading interface with feedback
- Submission history view

## Testing Checklist

- [ ] Student in venue A can submit code
- [ ] Faculty A sees the submission
- [ ] Student moves to venue B
- [ ] Faculty B now sees the submission
- [ ] Faculty A no longer sees it
- [ ] Faculty B can grade it
- [ ] Graded submissions don't move when student changes venue
- [ ] Tasks appear in correct skill order
- [ ] Questions are properly assigned to students
- [ ] Code files are stored and retrieved correctly

## Notes

1. **Performance**: The `updateSubmissionVenues()` runs asynchronously after student moves, so it doesn't block the venue change operation.

2. **Data Integrity**: Graded submissions are "frozen" and don't move with the student, preserving the historical record.

3. **Faculty Assignment**: Always based on **current** venue, not the venue where the task was originally created.

4. **Multiple Attempts**: Students can resubmit, each gets a new `attempt_number`.

5. **Violations Tracking**: Tab switches and fullscreen exits are tracked (though current implementation may not enforce this).

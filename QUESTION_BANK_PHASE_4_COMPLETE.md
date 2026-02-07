# Question Bank Phase 4: Student & Faculty Backend Implementation

## ✅ COMPLETED - February 7, 2026

Phase 4 has been successfully implemented, providing complete backend API support for both students and faculty to interact with the Question Bank system.

---

## 📦 Files Created

### Student Backend
1. **`server/controllers/studentQuestionBank.controller.js`** (753 lines)
   - Complete student-facing question bank controller
   
2. **`server/routes/studentQuestionBank.routes.js`** (44 lines)
   - Protected student routes with authentication

### Faculty Backend  
3. **`server/controllers/facultyQuestionBank.controller.js`** (741 lines)
   - Complete faculty grading and management controller
   
4. **`server/routes/facultyQuestionBank.routes.js`** (44 lines)
   - Protected faculty routes with authorization

### Integration
5. **`server/index.js`** (modified)
   - Added route imports and mount points

---

## 🎯 Student Backend Features

### **Endpoints Created:**

#### 1. **GET** `/api/student/question-bank/my-tasks`
**Purpose:** Get all assigned tasks with question bank integration

**Features:**
- Lists all active tasks with assigned questions
- Groups by status: pending, submitted, graded, needsRevision
- Shows MCQ and Coding task types
- Displays due dates and attempt numbers

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "student": { "student_id": 123, "name": "John Doe" },
    "summary": {
      "total": 10,
      "pending": 3,
      "submitted": 2,
      "graded": 4,
      "needsRevision": 1
    },
    "tasks": {
      "pending": [...],
      "submitted": [...],
      "graded": [...],
      "needsRevision": [...]
    }
  }
}
```

---

#### 2. **GET** `/api/student/question-bank/task/:taskId/question`
**Purpose:** Get specific question details for a task

**Security Features:**
- **Hides correct MCQ answers** from students
- Only shows MCQ explanation after submission
- Verifies student has active assignment

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "assignment": {
      "assignment_id": 456,
      "question_id": 789,
      "task_title": "HTML Basics Quiz",
      "due_date": "2026-02-15",
      "attempt_number": 1
    },
    "question": {
      "title": "What is HTML?",
      "description": "Choose the correct definition...",
      "question_type": "mcq",
      "difficulty_level": "Easy",
      "max_score": 100,
      "mcq_options": [
        { "id": "A", "text": "Option A" },
        { "id": "B", "text": "Option B" },
        { "id": "C", "text": "Option C" },
        { "id": "D", "text": "Option D" }
      ],
      "coding_starter_code": null,
      "supported_languages": []
    },
    "submission": null
  }
}
```

---

#### 3. **POST** `/api/student/question-bank/submit-mcq`
**Purpose:** Submit MCQ answer with instant auto-grading

**Request Body:**
```json
{
  "task_id": 123,
  "selected_answer": "B",
  "time_taken_minutes": 15
}
```

**Auto-Grading Logic:**
- Compares `selected_answer` with `mcq_correct_answer` from database
- Instantly calculates grade: 100 if correct, 0 if wrong
- **Auto-reassignment:** If grade < 50%, creates new attempt automatically
- Returns explanation after submission

**Response:**
```json
{
  "success": true,
  "message": "Correct answer! Well done!",
  "data": {
    "submission_id": 1001,
    "is_correct": true,
    "grade": 100,
    "max_score": 100,
    "explanation": "HTML stands for HyperText Markup Language...",
    "needs_reattempt": false,
    "new_attempt_number": null
  }
}
```

**If Failed (< 50%):**
```json
{
  "success": true,
  "message": "Incorrect answer. Please try again.",
  "data": {
    "is_correct": false,
    "grade": 0,
    "needs_reattempt": true,
    "new_attempt_number": 2
  }
}
```

---

#### 4. **POST** `/api/student/question-bank/submit-code`
**Purpose:** Submit coding solution for manual faculty grading

**Request Body:**
```json
{
  "task_id": 124,
  "code_content": "<!DOCTYPE html>\n<html>...</html>",
  "programming_language": "html",
  "time_taken_minutes": 45
}
```

**Validation:**
- Checks language is supported for the question
- Prevents duplicate submissions
- Tracks student's current venue

**Response:**
```json
{
  "success": true,
  "message": "Code submitted successfully! Awaiting faculty review.",
  "data": {
    "submission_id": 1002,
    "status": "Pending Review",
    "submitted_at": "2026-02-07T10:30:00.000Z"
  }
}
```

---

#### 5. **GET** `/api/student/question-bank/my-submissions/:taskId`
**Purpose:** View all submission attempts for a specific task

**Features:**
- Shows all previous attempts
- Displays grades, feedback, and status
- Includes grader information

**Response:**
```json
{
  "success": true,
  "data": {
    "task_id": 123,
    "total_attempts": 2,
    "submissions": [
      {
        "submission_id": 1002,
        "submission_type": "mcq",
        "mcq_selected_answer": "B",
        "mcq_is_correct": 1,
        "grade": 100,
        "status": "Auto-Graded",
        "submitted_at": "2026-02-07T10:00:00.000Z",
        "attempt_number": 2
      },
      {
        "submission_id": 1001,
        "mcq_selected_answer": "A",
        "mcq_is_correct": 0,
        "grade": 0,
        "status": "Auto-Graded",
        "submitted_at": "2026-02-07T09:00:00.000Z",
        "attempt_number": 1,
        "is_reassigned": 1
      }
    ]
  }
}
```

---

#### 6. **POST** `/api/student/question-bank/execute-code`
**Purpose:** Test code execution without submitting (Placeholder)

**Current Status:** Returns placeholder message
**Future Implementation:** Requires sandboxed environment (Docker, Judge0, AWS Lambda)

---

## 🎓 Faculty Backend Features

### **Endpoints Created:**

#### 1. **GET** `/api/faculty/question-bank/pending-submissions`
**Purpose:** Get all pending coding submissions from assigned venues

**Authorization:** Only shows submissions from faculty's assigned venues

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "faculty": {
      "faculty_id": 10,
      "name": "Dr. Smith"
    },
    "summary": {
      "total_pending": 15,
      "venues_count": 3
    },
    "submissions_by_venue": [
      {
        "venue_id": 1,
        "venue_name": "Venue A",
        "submissions": [
          {
            "submission_id": 2001,
            "student_first_name": "John",
            "student_last_name": "Doe",
            "roll_no": "CS2024001",
            "task_title": "JavaScript Functions",
            "question_title": "Implement Array Sort",
            "programming_language": "javascript",
            "submitted_at": "2026-02-07T08:00:00.000Z",
            "difficulty_level": "Medium"
          }
        ]
      }
    ]
  }
}
```

---

#### 2. **GET** `/api/faculty/question-bank/submission/:submissionId`
**Purpose:** Get detailed submission info for grading

**Authorization:** Faculty must be assigned to the student's venue

**Response:**
```json
{
  "success": true,
  "data": {
    "submission": {
      "submission_id": 2001,
      "coding_content": "function sortArray(arr) { ... }",
      "programming_language": "javascript",
      "submitted_at": "2026-02-07T08:00:00.000Z",
      "time_taken_minutes": 45,
      "attempt_number": 1,
      "status": "Pending Review"
    },
    "student": {
      "student_id": 123,
      "name": "John Doe",
      "roll_no": "CS2024001",
      "email": "john@example.com"
    },
    "question": {
      "title": "Implement Array Sort",
      "description": "Write a function that sorts an array...",
      "difficulty_level": "Medium",
      "expected_output": "Sorted array in ascending order",
      "starter_code": "function sortArray(arr) { \n  // Your code here\n}",
      "test_cases": [
        { "input": "[3,1,2]", "output": "[1,2,3]" },
        { "input": "[5,5,5]", "output": "[5,5,5]" }
      ]
    },
    "previous_attempts": []
  }
}
```

---

#### 3. **POST** `/api/faculty/question-bank/grade-submission`
**Purpose:** Grade a coding submission

**Request Body:**
```json
{
  "submission_id": 2001,
  "grade": 85,
  "feedback": "Good implementation! Minor optimization suggested for edge cases."
}
```

**Auto-Reassignment Logic:**
- If `grade < 50`: Automatically creates new attempt with same/different question
- If `grade >= 50`: Marks assignment as complete

**Response:**
```json
{
  "success": true,
  "message": "Submission graded successfully!",
  "data": {
    "submission_id": 2001,
    "grade": 85,
    "max_score": 100,
    "status": "Graded",
    "needs_reattempt": false,
    "new_attempt_number": null
  }
}
```

**If Student Failed:**
```json
{
  "success": true,
  "message": "Submission graded. Student scored below 50% and has been reassigned for reattempt.",
  "data": {
    "grade": 35,
    "needs_reattempt": true,
    "new_attempt_number": 2
  }
}
```

---

#### 4. **GET** `/api/faculty/question-bank/student-progress`
**Purpose:** View progress of all students in assigned venues

**Query Parameters:**
- `venue_id` (optional): Filter by specific venue

**Response:**
```json
{
  "success": true,
  "data": {
    "venue_summary": [
      {
        "venue_id": 1,
        "venue_name": "Venue A",
        "total_students": 30,
        "total_submissions": 120,
        "pending_reviews": 8
      }
    ],
    "student_progress": [
      {
        "student_id": 123,
        "first_name": "John",
        "last_name": "Doe",
        "roll_no": "CS2024001",
        "venue_name": "Venue A",
        "total_submissions": 5,
        "pending_count": 1,
        "graded_count": 4,
        "failed_count": 0,
        "average_grade": 87.5,
        "mcq_count": 2,
        "coding_count": 3
      }
    ]
  }
}
```

---

#### 5. **POST** `/api/faculty/question-bank/reassign-question`
**Purpose:** Manually assign a different question to a student

**Use Case:** If a student gets stuck or needs a different difficulty level

**Request Body:**
```json
{
  "task_id": 123,
  "student_id": 456,
  "new_question_id": 789
}
```

**Response:**
```json
{
  "success": true,
  "message": "Question reassigned successfully!",
  "data": {
    "task_id": 123,
    "student_id": 456,
    "new_question_id": 789,
    "new_attempt_number": 2
  }
}
```

---

#### 6. **GET** `/api/faculty/question-bank/graded-submissions`
**Purpose:** View all graded submissions (MCQ + Coding)

**Query Parameters:**
- `venue_id` (optional): Filter by venue
- `submission_type` (optional): Filter by 'mcq' or 'coding'

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "submissions": [
      {
        "submission_id": 3001,
        "student_first_name": "Jane",
        "student_last_name": "Smith",
        "roll_no": "CS2024002",
        "task_title": "CSS Positioning",
        "question_title": "Create Flexbox Layout",
        "submission_type": "coding",
        "grade": 92,
        "max_score": 100,
        "status": "Graded",
        "submitted_at": "2026-02-06T14:00:00.000Z",
        "graded_at": "2026-02-07T09:00:00.000Z",
        "graded_by_first_name": "Dr.",
        "graded_by_last_name": "Smith"
      }
    ]
  }
}
```

---

## 🔒 Security Features

### Authentication & Authorization
- **All routes** require JWT authentication via `authenticate` middleware
- **Student routes** use `studentOnly` middleware - students can only see their own data
- **Faculty routes** use `facultyOrAdmin` middleware - faculty only see their venue's data
- **Admin access** is allowed on all routes via `facultyOrAdmin`

### Data Protection
1. **MCQ Correct Answers Hidden:**
   - `mcq_correct_answer` never sent to frontend before submission
   - Explanation only shown after student submits

2. **Venue-Based Authorization:**
   - Faculty can only grade submissions from their assigned venues
   - Students can only access their own submissions

3. **Submission Locking:**
   - Prevents duplicate submissions
   - Once submitted, students can't resubmit (unless reassigned)

4. **SQL Injection Prevention:**
   - All queries use parameterized statements
   - No raw string concatenation in SQL

---

## 🔄 Auto-Grading & Reassignment Logic

### MCQ Auto-Grading (Instant)
```javascript
// Compare student's answer with correct answer
const is_correct = selected_answer.toUpperCase() === mcq_correct_answer.toUpperCase();
const grade = is_correct ? max_score : 0;

// If failed, auto-reassign
if (grade < 50) {
  // Mark current assignment inactive
  // Create new assignment with attempt_number + 1
  // Student gets another chance
}
```

### Coding Manual Grading (Faculty Review)
```javascript
// Faculty grades submission
if (grade < 50) {
  // Mark as "Needs Reassignment"
  // Create new assignment (same or different question)
  // Student must reattempt
} else {
  // Mark assignment complete
  // Student passes
}
```

---

## 📊 Database Schema Integration

### Tables Used

#### `task_question_assignments`
**Purpose:** Tracks which question is assigned to which student for which task

**Key Fields:**
- `task_id`: References tasks table
- `student_id`: References students table  
- `question_id`: References question_bank table
- `attempt_number`: Tracks reattempts (1, 2, 3...)
- `is_active`: 1 if current assignment, 0 if completed/reassigned

#### `student_submissions`
**Purpose:** Stores all MCQ and coding submissions

**Key Fields:**
- `submission_type`: 'mcq' or 'coding'
- `mcq_selected_answer`: Student's MCQ choice (A, B, C, D)
- `mcq_is_correct`: 1 or 0 (auto-calculated)
- `coding_content`: Student's code
- `status`: 'Pending Review', 'Auto-Graded', 'Graded', 'Needs Revision'
- `grade`: Score (0-100)
- `graded_by`: Faculty who graded (NULL for auto-graded MCQs)
- `is_reassigned`: 1 if student failed and needs reattempt

#### `code_execution_history`
**Purpose:** Logs all code test runs (for analytics)

**Note:** Currently placeholder - requires sandboxed environment

---

## 🎯 Workflow Examples

### Example 1: Student Takes MCQ Quiz
```
1. GET /api/student/question-bank/my-tasks
   → Student sees "HTML Quiz" assigned

2. GET /api/student/question-bank/task/123/question
   → Frontend displays question with 4 options (A, B, C, D)
   → Correct answer is hidden

3. POST /api/student/question-bank/submit-mcq
   Body: { task_id: 123, selected_answer: "B" }
   → Backend compares "B" with correct answer "B"
   → Instant grade: 100/100
   → Returns: { is_correct: true, explanation: "..." }

4. Frontend shows: ✅ Correct! Score: 100/100
```

### Example 2: Student Fails MCQ and Retries
```
1. POST /api/student/question-bank/submit-mcq
   Body: { task_id: 123, selected_answer: "A" }
   → Correct answer is "B"
   → Grade: 0/100
   → Auto-reassignment triggered
   → Response: { needs_reattempt: true, new_attempt_number: 2 }

2. Frontend shows: ❌ Incorrect. Try again!

3. GET /api/student/question-bank/task/123/question
   → Backend returns same question with attempt_number: 2
   → Student gets another chance
```

### Example 3: Student Submits Code for Faculty Review
```
1. GET /api/student/question-bank/task/124/question
   → Returns: "Implement sorting function"
   → Starter code provided

2. Student writes code in frontend editor

3. POST /api/student/question-bank/submit-code
   Body: {
     task_id: 124,
     code_content: "function sort(arr) { ... }",
     programming_language: "javascript"
   }
   → Status: "Pending Review"
   → Response: "Awaiting faculty review"

4. Frontend shows: ⏳ Submitted! Waiting for faculty to grade...
```

### Example 4: Faculty Grades Coding Submission
```
1. GET /api/faculty/question-bank/pending-submissions
   → Faculty sees 15 pending submissions

2. GET /api/faculty/question-bank/submission/2001
   → Shows: student code, question, expected output

3. Faculty reviews code

4. POST /api/faculty/question-bank/grade-submission
   Body: {
     submission_id: 2001,
     grade: 85,
     feedback: "Good work! Minor optimization needed."
   }
   → Grade: 85/100 (Pass)
   → Status: "Graded"
   → Assignment marked complete

5. Student sees: ✅ Graded! Score: 85/100
```

### Example 5: Student Fails Coding Task
```
1. Faculty grades: 35/100

2. POST /api/faculty/question-bank/grade-submission
   → Grade < 50, triggers auto-reassignment
   → Creates new assignment with attempt_number: 2
   → Response: { needs_reattempt: true }

3. Student sees: ❌ Failed. Please reattempt.

4. Student gets same or different question for attempt 2
```

---

## 🧪 Testing Checklist

### Student Backend
- [x] ✅ Student can view assigned tasks
- [x] ✅ Student can see question details (correct answer hidden)
- [x] ✅ MCQ submission auto-grades correctly
- [x] ✅ Failed MCQ creates new attempt automatically
- [x] ✅ Coding submission saves with "Pending Review"
- [x] ✅ Student can view submission history
- [x] ✅ Duplicate submissions blocked

### Faculty Backend
- [x] ✅ Faculty sees only their venue's submissions
- [x] ✅ Submission details include student code
- [x] ✅ Grading updates submission status
- [x] ✅ Grade < 50% triggers reassignment
- [x] ✅ Student progress dashboard works
- [x] ✅ Manual reassignment works

### Security
- [x] ✅ Students can't access other students' data
- [x] ✅ Faculty can't grade other venues' submissions
- [x] ✅ MCQ correct answers never sent to frontend
- [x] ✅ All SQL queries parameterized

---

## 📝 API Documentation Summary

### Student Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/student/question-bank/my-tasks` | List assigned tasks |
| GET | `/api/student/question-bank/task/:taskId/question` | Get question details |
| POST | `/api/student/question-bank/submit-mcq` | Submit MCQ (auto-graded) |
| POST | `/api/student/question-bank/submit-code` | Submit code (manual grading) |
| GET | `/api/student/question-bank/my-submissions/:taskId` | View submission history |
| POST | `/api/student/question-bank/execute-code` | Test code (placeholder) |

### Faculty Endpoints
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/faculty/question-bank/pending-submissions` | List pending grading |
| GET | `/api/faculty/question-bank/submission/:submissionId` | Get submission details |
| POST | `/api/faculty/question-bank/grade-submission` | Grade coding submission |
| GET | `/api/faculty/question-bank/student-progress` | View student analytics |
| POST | `/api/faculty/question-bank/reassign-question` | Reassign question |
| GET | `/api/faculty/question-bank/graded-submissions` | View all graded work |

---

## 🚀 Next Steps (Phase 5 & 6: Frontend)

### Phase 5: Student Frontend
- Create student question bank dashboard
- MCQ test interface with timer
- Code editor integration (Monaco Editor)
- Submission history viewer
- Result display with explanations

### Phase 6: Faculty Frontend
- Pending submissions dashboard
- Code review interface with syntax highlighting
- Grading form with feedback
- Student progress analytics
- Bulk operations support

---

## 📚 Code Quality

- **Total Lines of Code:** ~1,500 lines
- **Error Handling:** Comprehensive try-catch blocks
- **Transaction Safety:** All critical operations wrapped in transactions
- **SQL Injection:** 0 vulnerabilities (all queries parameterized)
- **Comments:** Extensive JSDoc-style documentation
- **Code Reusability:** Modular controller functions

---

## ✅ Phase 4 Status: COMPLETE

All backend APIs for student and faculty question bank functionality are now fully implemented and integrated!

**Ready for:** Frontend development (Phase 5 & 6)

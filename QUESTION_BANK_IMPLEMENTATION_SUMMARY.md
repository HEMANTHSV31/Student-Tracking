# Database Schema Summary - Question Bank & Code Practice System

## Created Files

1. **`create_question_bank_tables.sql`** - Complete SQL migration script
2. **`run-question-bank-migration.js`** - Node.js migration runner
3. **`QUESTION_BANK_MIGRATION_GUIDE.md`** - Comprehensive documentation

---

## Database Tables Created

### 📚 Core Tables (5 New Tables + 1 Modified)

| Table Name | Purpose | Key Fields | Relationships |
|------------|---------|------------|---------------|
| **question_bank** | Stores admin-created coding questions | question_id, title, description, skill associations | Links to faculties (creator) |
| **question_skills** | Maps questions to skills/courses | question_id, skill_name, course_type | Links to question_bank |
| **code_submissions** | Stores student code from compiler | submission_id, code_content, grade, status | Links to tasks, students, questions, faculties |
| **task_question_assignments** | Tracks random question assignments | task_id, student_id, question_id, attempt_number | Links to tasks, students, questions |
| **code_execution_history** | Logs all code test runs | execution_id, code_content, execution_result | Links to tasks, students, questions |
| **tasks** *(modified)* | Added task_type column | task_type ENUM('manual', 'code_practice') | Existing table enhanced |

---

## How It Works with Your Requirements

### ✅ Requirement 1: Keep Manual Assignment Module
**Solution:** `tasks.task_type = 'manual'`
- Existing file/PDF/GitHub link upload functionality preserved
- No changes to current `task_submissions` table for manual tasks

### ✅ Requirement 2: Skill-Based Task UI
**Solution:** Filter by `skill_filter` column in tasks
- When faculty selects "HTML / CSS Level1(frontend)" or "JavaScript Level1(frontend)"
- Frontend shows appropriate UI for `task_type = 'code_practice'`
- Fields: assignment title, target venue, description

### ✅ Requirement 3: Don't Show Completed Skills
**Solution:** Existing logic in `student_skills` table
- Check `status = 'Cleared'` before showing tasks
- Already implemented - no changes needed

### ✅ Requirement 4: Admin Question Bank
**Solution:** `question_bank` + `question_skills` tables
- Admin adds questions predefinedly
- Associates questions with skills via `question_skills`
- Questions stored and reused across multiple task assignments

### ✅ Requirement 5: Random Question Assignment
**Solution:** `task_question_assignments` table
- When task assigned, system randomly selects from `question_bank`
- Filters by `skill_name` and `course_type` matching the task
- Each student-task pair gets unique random question
- Tracked in `task_question_assignments`

### ✅ Requirement 6: Compiler Submission
**Solution:** `code_submissions` table
- Student writes code in integrated compiler
- Can run/test multiple times (tracked in `code_execution_history`)
- Final "Submit Test" button saves to `code_submissions`
- `code_content` field stores actual code

### ✅ Requirement 7: Faculty Evaluation
**Solution:** `code_submissions.graded_by` + `status` fields
- Faculty sees pending submissions filtered by their `current_venue_id`
- Can view code, add feedback, assign grade
- Updates `status` to 'Graded' and sets `graded_by` and `graded_at`

### ✅ Requirement 8: Auto-Reassignment if < 50%
**Solution:** `code_submissions.is_reassigned` + `attempt_number`
- When faculty grades and `grade < (max_score * 0.5)`
- System sets `is_reassigned = 1`
- Creates new entry in `task_question_assignments` with `attempt_number + 1`
- Student gets new random question for same skill

### ✅ Requirement 9: Reports Screen
**Solution:** Query `code_submissions` with joins
- Join `code_submissions` with `task_submissions` data
- Show code content, grade, feedback
- Display in existing Reports screen

---

## Database Relationships Diagram

```
┌─────────────────┐
│  faculties      │
│  (existing)     │
└────────┬────────┘
         │
         │ created_by
         │
         ↓
┌─────────────────────────┐
│   question_bank         │
│   - question_id (PK)    │
│   - title               │
│   - description         │
│   - starter_code        │
│   - test_cases (JSON)   │
│   - max_score           │
└────────┬────────────────┘
         │
         │ question_id
         │
         ↓
┌─────────────────────────┐         ┌──────────────────┐
│   question_skills       │         │   tasks          │
│   - question_id (FK)    │         │   - task_id (PK) │
│   - skill_name          │◄────────┤   - skill_filter │
│   - course_type         │ matches │   - task_type    │
└─────────────────────────┘         └────────┬─────────┘
                                             │
                    ┌────────────────────────┴────────────────────┐
                    │                                             │
                    ↓                                             ↓
         ┌──────────────────────────────┐          ┌────────────────────────────┐
         │ task_question_assignments    │          │   task_submissions         │
         │  - task_id (FK)              │          │   (existing - for manual)  │
         │  - student_id (FK)           │          │   - task_id (FK)           │
         │  - question_id (FK)          │          │   - file_path              │
         │  - attempt_number            │          │   - link_url               │
         │  - is_active                 │          └────────────────────────────┘
         └──────────┬───────────────────┘
                    │
                    │ assigns question to student
                    │
                    ↓
         ┌────────────────────────────┐
         │   code_submissions         │
         │   - submission_id (PK)     │
         │   - task_id (FK)           │
         │   - student_id (FK)        │
         │   - question_id (FK)       │
         │   - code_content (TEXT)    │
         │   - status                 │
         │   - grade                  │
         │   - graded_by (FK)         │
         │   - is_reassigned          │
         │   - attempt_number         │
         └──────────┬─────────────────┘
                    │
                    │ practice runs logged
                    │
                    ↓
         ┌────────────────────────────┐
         │  code_execution_history    │
         │   - execution_id (PK)      │
         │   - code_content           │
         │   - execution_result       │
         │   - is_successful          │
         └────────────────────────────┘
```

---

## Integration with Existing Tables

### Links to `students` table
- `code_submissions.student_id`
- `task_question_assignments.student_id`
- `code_execution_history.student_id`

### Links to `faculties` table
- `question_bank.created_by` (who created the question)
- `code_submissions.graded_by` (who evaluated the code)

### Links to `venue` table
- `code_submissions.current_venue_id` (student's venue at submission time)
- Used for filtering in faculty evaluation screen

### Links to `tasks` table
- `code_submissions.task_id`
- `task_question_assignments.task_id`
- `code_execution_history.task_id`
- Enhanced with `task_type` column

### Links to `student_skills` table
- Logic: Check if `course_name` matches `skill_filter` in tasks
- If student has `status = 'Cleared'` for that skill, don't show task
- If `grade < 50%` in code submission, don't update `status` to 'Cleared'

---

## Running the Migration

### Step 1: Backup Database (IMPORTANT!)
```bash
mysqldump -u root -p studentactivity > backup_before_question_bank_$(date +%Y%m%d).sql
```

### Step 2: Run Migration
```bash
cd d:\FullStack\Student-Tracker\server\migrations
node run-question-bank-migration.js
```

### Step 3: Verify Tables Created
```sql
USE studentactivity;

SHOW TABLES LIKE 'question%';
SHOW TABLES LIKE 'code_%';
SHOW TABLES LIKE 'task_question%';

DESC question_bank;
DESC code_submissions;
```

### Step 4: Check tasks table modification
```sql
SHOW COLUMNS FROM tasks LIKE 'task_type';
```

---

## What to Build Next (Backend)

### 1. Question Bank Controller (`questionBank.controller.js`)
```javascript
// CRUD operations
- createQuestion()      // Admin adds question
- getAllQuestions()     // List all questions
- getQuestionById()     // Get specific question
- updateQuestion()      // Edit question
- deleteQuestion()      // Remove question
- getQuestionsBySkill() // Filter by skill/course_type
```

### 2. Code Submission Controller (`codeSubmission.controller.js`)
```javascript
// Student operations
- assignRandomQuestion()      // When task assigned
- getAssignedQuestion()       // Student sees their question
- submitCode()                // Final submission
- executeCode()               // Test run (save to history)

// Faculty operations
- getPendingSubmissions()     // For evaluation screen
- gradeSubmission()           // Faculty grades + feedback
- checkAndReassign()          // If grade < 50%, assign new question
```

### 3. Enhanced Task Controller
```javascript
// Add to existing tasks.controller.js
- Update createTask() to handle task_type
- Update getStudentTasks() to filter by cleared skills
- Add logic to call assignRandomQuestion() for code_practice tasks
```

---

## What to Build Next (Frontend)

### 1. Admin Screens
- **Question Bank Management**
  - List all questions
  - Add/Edit/Delete questions
  - Associate with skills
  - Test case editor

### 2. Faculty Screens
- **Task Creation Enhancement**
  - Add task_type selector (manual vs code_practice)
  - Show appropriate fields based on type
  
- **Code Evaluation Screen**
  - List pending code submissions for faculty's venue
  - Code viewer with syntax highlighting
  - Grade input and feedback textarea
  - Submit evaluation button

### 3. Student Screens
- **Code Practice Interface**
  - Show assigned question
  - Integrated code editor (Monaco Editor or CodeMirror)
  - Language selector
  - "Run Code" button (test)
  - "Submit Test" button (final submission)
  - Show test results

- **Task List**
  - Show both manual and code_practice tasks
  - Filter out tasks for cleared skills
  - Different UI for each task type

### 4. Reports Screen
- **Enhanced Reports**
  - Show code submissions alongside manual submissions
  - Display code with syntax highlighting
  - Show grade, feedback, attempt number
  - Link to view full submission history

---

## Environment Variables Needed

Add to `.env`:
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=studentactivity

# Code Execution (if using external service)
CODE_EXECUTOR_API_KEY=your_key
CODE_EXECUTOR_TIMEOUT_MS=5000

# File Storage
CODE_SUBMISSIONS_PATH=./uploads/code_submissions
```

---

## Migration Status

- ✅ SQL migration file created
- ✅ Node.js runner script created
- ✅ Comprehensive documentation written
- ✅ All 5 new tables defined
- ✅ tasks table enhancement specified
- ✅ Foreign keys and indexes configured
- ⏳ **NEXT:** Run the migration
- ⏳ **NEXT:** Build backend controllers
- ⏳ **NEXT:** Update frontend UI

---

## Testing Checklist

After building backend/frontend:

- [ ] Admin can create questions
- [ ] Questions associate with skills correctly
- [ ] Random question assignment works
- [ ] Student sees assigned question in compiler
- [ ] Code can be executed (test runs)
- [ ] Code submission saves correctly
- [ ] Faculty sees submissions in their venue
- [ ] Grading updates database properly
- [ ] Auto-reassignment triggers when grade < 50%
- [ ] Reports show code and grades
- [ ] Manual tasks still work as before
- [ ] Skill completion logic prevents showing cleared tasks

---

**Status:** ✅ Database schema ready  
**Action Required:** Run migration script  
**Next Phase:** Backend API development

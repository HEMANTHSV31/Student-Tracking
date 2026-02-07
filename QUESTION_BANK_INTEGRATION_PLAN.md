# 🔗 Question Bank Integration Plan

## Current Status
- ✅ Database schema ready (task_type, practice_type columns added)
- ✅ Question Bank backend APIs complete
- ✅ Question Bank frontend components created
- ⏳ Need to integrate Question Bank into existing Tasks & Assignments workflow

## Integration Steps

### Step 1: Update Backend Tasks Controller
**File**: `server/controllers/tasks.controller.js`

**Changes Needed**:
1. Add support for `task_type` = 'practice' when creating tasks
2. Add `practice_type` (mcq/coding) parameter
3. Link to `course_id` from skill_courses table
4. Create task_question_assignments for all students in venue

### Step 2: Update Faculty Task Creation UI
**File**: `Frontend/src/pages/Faculty/Task&Assignments/TaskHeader/Task-Assignment-page/Task&assignments.jsx`

**Changes Needed**:
1. Add Task Type selector: "Regular Task" vs "Practice Question"
2. When "Practice Question" selected, show:
   - Question Type: MCQ vs Coding
   - Skill Course dropdown (from skill_courses table)
   - Auto-assign random questions to students
3. Hide file/link upload for practice questions

### Step 3: Update Student Tasks View
**File**: `Frontend/src/pages/Student/Tasks&Assignments/Tasks&Assignment.jsx`

**Changes Needed**:
1. Fetch practice tasks from `/api/student/question-bank/my-tasks`
2. Merge with regular tasks
3. Show both regular tasks AND question bank MCQs/Coding when filtering by skill
4. Add task type badge (Regular/MCQ/Coding)
5. Different click handlers:
   - Regular task → Open task details (existing behavior)
   - MCQ task → Navigate to `/student/question-bank/mcq/:taskId`
   - Coding task → Navigate to `/student/question-bank/coding/:taskId`

### Step 4: Update Task Backend API
**File**: `server/controllers/tasks.controller.js` → `getStudentTasks()`

**Changes Needed**:
1. Query both regular tasks AND practice tasks
2. For practice tasks, join with:
   - task_question_assignments
   - question_bank
   - student_submissions
3. Return combined list with status:
   - "pending" - Not attempted
   - "in_progress" - MCQ/Coding started but not submitted
   - "submitted" - Waiting for grading (Coding only)
   - "completed" - Graded

### Step 5: Faculty Grading Integration
**File**: `Frontend/src/pages/Faculty/studentsPage/studentHeader/Task&Grades/TaskGrade.jsx`

**Changes Needed**:
1. Show task type (Regular/MCQ/Coding)
2. For MCQ submissions:
   - Show "Auto-Graded" badge
   - Display score automatically calculated
   - Show selected answer vs correct answer
3. For Coding submissions:
   - Link to `/faculty/question-bank/grade/:submissionId`
   - Show manual grading interface

## File Updates Required

| File | Purpose | Status |
|------|---------|--------|
| `server/controllers/tasks.controller.js` | Add practice task creation & fetching | 🔄 In Progress |
| `Faculty/Task&assignments.jsx` | Add practice question UI | ⏳ Pending |
| `Student/Tasks&Assignment.jsx` | Show MCQs and Coding in tasks list | ⏳ Pending |
| `server/controllers/studentQuestionBank.controller.js` | Already complete | ✅ Done |
| `Frontend/src/pages/Student/MCQTest.jsx` | Already complete | ✅ Done |
| `Frontend/src/pages/Student/CodingTest.jsx` | Already complete | ✅ Done |
| `Frontend/src/pages/Faculty/GradeSubmission.jsx` | Already complete | ✅ Done |

## Expected User Flow

### Faculty Creates Practice Task:
1. Faculty goes to "Task & Assignments"
2. Selects "Practice Question" as task type
3. Chooses "MCQ" or "Coding"
4. Selects skill (HTML/CSS, Git/GitHub, etc.)
5. System auto-assigns random questions to all students in venue
6. Task appears in student's task list

### Student Takes MCQ:
1. Student sees "MCQ - HTML/CSS Level 1" in task list
2. Clicks "Start"
3. Opens MCQ test interface with timer
4. Selects answer, clicks Submit
5. **Instantly sees score** (auto-graded)
6. Task marked as "Completed"

### Student Submits Coding:
1. Student sees "Coding - HTML/CSS Level 1" in task list
2. Clicks "Start"
3. Opens code editor (Monaco)
4. Writes code, clicks Submit
5. Task marked as "Pending Review"
6. Waits for faculty grading

### Faculty Grades Coding:
1. Faculty goes to "Question Bank" → "Pending Submissions"
2. Sees list of ungraded coding submissions
3. Clicks "Grade"
4. Reviews code, enters score, provides feedback
5. If score < 50%, system auto-assigns new question
6. Student sees grade and feedback

## Next Actions
1. Update backend tasks.controller.js
2. Update faculty task creation UI
3. Update student tasks view
4. Test complete flow end-to-end

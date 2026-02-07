# Admin Question Management Workflow

## Overview

This document outlines the complete workflow for admin question management in the Student Tracker system.

---

## Skill Configuration

### Pre-configured Skills (skill_courses table)

| Skill | Course Name | MCQ Support | Coding Support | Tasks Required |
|-------|-------------|-------------|----------------|----------------|
| **HTML/CSS** | HTML / CSS Level1(frontend) | ✅ Yes | ✅ Yes | **2 tasks**: 1 MCQ + 1 Coding |
| **JavaScript** | Java Script Level1(frontend) | ❌ No | ✅ Yes | **1 task**: Coding only |
| **Git/GitHub** | Git & GitHub(frontend) | ✅ Yes | ❌ No | **1 task**: MCQ only |
| **Future Skills** | TBD | ✅ Yes | ❌ No | **1 task**: MCQ only (default) |

---

## Admin Workflow: Creating Questions

### Phase 1: Add Questions to Question Bank

#### Step 1.1: Create HTML/CSS MCQ Questions
```
Admin Dashboard → Question Bank → Add New Question

Fields to fill:
- Select Course: "HTML / CSS Level1(frontend)"
- Question Type: MCQ ✓
- Title: "What is the correct CSS syntax?"
- Description: Full question text
- Difficulty: Easy/Medium/Hard
- Options: 
  * Option A: "color: red;"
  * Option B: "red: color;"
  * Option C: "color = red"
  * Option D: "text-color: red"
- Correct Answer: A
- Explanation: "The correct CSS syntax is property: value;"
- Max Score: 10 (for MCQs typically lower than coding)
- Time Limit: 5 minutes
- Status: Active
```

**Database Storage:**
```sql
INSERT INTO question_bank (
  course_id, question_type, title, description, difficulty_level,
  mcq_options, mcq_correct_answer, mcq_explanation,
  max_score, time_limit_minutes, created_by, status
) VALUES (
  1, -- HTML/CSS course_id
  'mcq',
  'What is the correct CSS syntax?',
  'Choose the correct way to write CSS...',
  'Easy',
  '[
    {"id": "A", "text": "color: red;"},
    {"id": "B", "text": "red: color;"},
    {"id": "C", "text": "color = red"},
    {"id": "D", "text": "text-color: red"}
  ]',
  'A',
  'The correct CSS syntax is property: value;',
  10,
  5,
  1, -- faculty_id of admin
  'Active'
);
```

#### Step 1.2: Create HTML/CSS Coding Questions
```
Admin Dashboard → Question Bank → Add New Question

Fields to fill:
- Select Course: "HTML / CSS Level1(frontend)"
- Question Type: Coding ✓
- Title: "Create a Responsive Navigation Bar"
- Description: |
    Create a responsive navigation bar using HTML and CSS that:
    1. Has a logo on the left
    2. Has menu items on the right
    3. Changes to hamburger menu on mobile
    4. Uses flexbox for layout
    5. Has hover effects
- Difficulty: Medium
- Starter Code: (Pre-filled HTML/CSS template)
- Supported Languages: html, css, javascript
- Test Cases (Optional): JSON array of test criteria
- Expected Output: Description of working navigation
- Max Score: 100
- Time Limit: 60 minutes
- Status: Active
```

**Database Storage:**
```sql
INSERT INTO question_bank (
  course_id, question_type, title, description, difficulty_level,
  coding_starter_code, coding_language_support, coding_test_cases,
  coding_expected_output, max_score, time_limit_minutes, created_by, status
) VALUES (
  1, -- HTML/CSS course_id
  'coding',
  'Create a Responsive Navigation Bar',
  'Create a responsive navigation bar...',
  'Medium',
  '<!DOCTYPE html>\n<html>...</html>',
  'html,css,javascript',
  NULL, -- Or JSON test cases
  'A fully responsive navigation bar with logo, menu items, mobile hamburger menu',
  100,
  60,
  1,
  'Active'
);
```

#### Step 1.3: Create JavaScript Coding Questions
```
Admin Dashboard → Question Bank → Add New Question

Fields to fill:
- Select Course: "Java Script Level1(frontend)"
- Question Type: Coding ✓ (Only option available)
- Title: "Array Filter - Even Numbers"
- Description: |
    Write a function that filters even numbers from an array.
    
    Function signature:
    function filterEvenNumbers(arr) { ... }
    
    Example:
    Input: [1,2,3,4,5,6]
    Output: [2,4,6]
- Difficulty: Easy
- Starter Code: |
    function filterEvenNumbers(arr) {
      // Write your code here
      
    }
- Supported Languages: javascript
- Test Cases: |
    [
      {
        "input": "[1,2,3,4,5,6]",
        "expected": "[2,4,6]",
        "description": "Basic even filter"
      },
      {
        "input": "[10,15,20,25]",
        "expected": "[10,20]",
        "description": "Mixed even/odd"
      }
    ]
- Max Score: 100
- Time Limit: 30 minutes
```

#### Step 1.4: Create Git/GitHub MCQ Questions
```
Admin Dashboard → Question Bank → Add New Question

Fields to fill:
- Select Course: "Git & GitHub(frontend)"
- Question Type: MCQ ✓ (Only option available)
- Title: "What is the command to initialize a Git repository?"
- Description: "Choose the correct Git command..."
- Difficulty: Easy
- Options:
  * A: git init
  * B: git start
  * C: git create
  * D: git new
- Correct Answer: A
- Explanation: "git init initializes a new Git repository"
- Max Score: 10
- Time Limit: 3 minutes
```

---

## Admin Workflow: Creating Tasks

### Phase 2: Create Practice Tasks

Once questions are added to the question bank, admin/faculty can create tasks:

#### Task Creation for HTML/CSS (2 Tasks Required)

##### Task 1: HTML/CSS MCQ Task
```
Tasks → Create New Task

Fields:
- Task Type: Practice ✓
- Practice Type: MCQ ✓
- Title: "HTML/CSS Fundamentals Quiz"
- Description: "Test your HTML and CSS knowledge"
- Select Course/Skill: "HTML / CSS Level1(frontend)"
- Target Venue: Select venue(s)
- Day: 5
- Due Date: 2026-02-15
- Status: Active

System Behavior:
✓ Automatically links to HTML/CSS MCQ questions from question_bank
✓ Will randomly assign one MCQ question per student
✓ Auto-grades when student submits (compares with correct answer)
```

**Database Storage:**
```sql
INSERT INTO tasks (
  title, description, task_type, practice_type,
  venue_id, faculty_id, day, due_date,
  skill_filter, course_type, status
) VALUES (
  'HTML/CSS Fundamentals Quiz',
  'Test your HTML and CSS knowledge',
  'practice',
  'mcq',
  1, -- venue_id
  1, -- faculty_id
  5,
  '2026-02-15',
  'HTML / CSS Level1(frontend)',
  'frontend',
  'Active'
);
```

##### Task 2: HTML/CSS Coding Task
```
Tasks → Create New Task

Fields:
- Task Type: Practice ✓
- Practice Type: Coding ✓
- Title: "HTML/CSS Responsive Design Challenge"
- Description: "Build a responsive component using HTML/CSS"
- Select Course/Skill: "HTML / CSS Level1(frontend)"
- Target Venue: Select venue(s)
- Day: 10
- Due Date: 2026-02-20
- Status: Active

System Behavior:
✓ Automatically links to HTML/CSS Coding questions from question_bank
✓ Will randomly assign one coding question per student
✓ Student uses integrated compiler
✓ Faculty manually grades
```

#### Task Creation for JavaScript (1 Task Required)

```
Tasks → Create New Task

Fields:
- Task Type: Practice ✓
- Practice Type: Coding ✓ (Only option for JS)
- Title: "JavaScript Programming Challenge"
- Description: "Solve a JavaScript coding problem"
- Select Course/Skill: "Java Script Level1(frontend)"
- Target Venue: Select venue(s)
- Day: 15
- Due Date: 2026-02-25
- Status: Active
```

#### Task Creation for Git/GitHub (1 Task Required)

```
Tasks → Create New Task

Fields:
- Task Type: Practice ✓
- Practice Type: MCQ ✓ (Only option for Git)
- Title: "Git and GitHub Basics Quiz"
- Description: "Test your Git knowledge"
- Select Course/Skill: "Git & GitHub(frontend)"
- Target Venue: Select venue(s)
- Day: 3
- Due Date: 2026-02-10
- Status: Active
```

---

## System Behavior After Task Creation

### For Students

#### When Student Opens HTML/CSS MCQ Task:
1. System queries `skill_courses` → checks student hasn't cleared "HTML / CSS Level1(frontend)"
2. System queries `task_question_assignments` → checks if student already has assigned question
3. If NOT assigned:
   ```sql
   -- Get random MCQ question for HTML/CSS
   SELECT question_id FROM question_bank
   WHERE course_id = 1 -- HTML/CSS
     AND question_type = 'mcq'
     AND status = 'Active'
   ORDER BY RAND() LIMIT 1;
   ```
4. Insert into `task_question_assignments` with the random question
5. Student sees:
   - Question title and description
   - 4 radio button options (A, B, C, D)
   - Timer showing time limit
   - "Submit Answer" button

#### When Student Submits MCQ:
```sql
INSERT INTO student_submissions (
  task_id, student_id, question_id, current_venue_id,
  submission_type, mcq_selected_answer, mcq_is_correct,
  submitted_at, time_taken_minutes, attempt_number, status, grade, max_score
) VALUES (
  1, -- task_id
  100, -- student_id
  5, -- question_id
  1, -- venue_id
  'mcq',
  'A', -- Student's answer
  1, -- Auto-checked: correct=1, wrong=0
  NOW(),
  4, -- Took 4 minutes
  1,
  'Auto-Graded',
  10, -- Full score if correct, 0 if wrong
  10
);
```

**Auto-Grading Logic:**
- Compare `mcq_selected_answer` with `question_bank.mcq_correct_answer`
- If match: `mcq_is_correct = 1`, `grade = max_score`
- If no match: `mcq_is_correct = 0`, `grade = 0`
- If grade < 50% (which is 0 for MCQ): `is_reassigned = 1` and assign new question

#### When Student Opens JavaScript Coding Task:
1. System assigns random JavaScript coding question
2. Student sees:
   - Question description
   - Code editor (Monaco/CodeMirror) with starter code
   - Language selector (JavaScript)
   - "Run Code" button (test without submitting)
   - "Submit Solution" button
3. Student can run code multiple times:
   ```sql
   INSERT INTO code_execution_history (
     task_id, student_id, question_id, code_content,
     programming_language, execution_result, is_successful
   ) VALUES (...);
   ```
4. When ready, student clicks "Submit Solution"
5. Code saved to `student_submissions` with `status = 'Pending Review'`

---

## Faculty Workflow: Grading

### For MCQ Tasks:
✅ **Auto-graded** - Faculty can only view results in reports
- No action needed
- Students see results immediately
- If failed (score 0), new question auto-assigned

### For Coding Tasks:
📝 **Manual grading required**

```
Faculty Dashboard → Code Evaluation

View:
- List of all pending coding submissions for their venue
- Filters: By skill, by student, by date
- Shows: Student name, task title, submission date, attempt number

Click on submission:
- See full question
- See student's code with syntax highlighting
- See execution history (how many times they tested)
- Test case results (if auto-testable)

Grade:
- Input score (0-100)
- Add feedback text
- Click "Submit Grade"

System checks:
- If grade >= 50%: Mark as completed, update student_skills
- If grade < 50%: Set is_reassigned=1, assign new random question
```

---

## Database Query Examples

### Get all questions for a course
```sql
SELECT * FROM question_bank
WHERE course_id = (
  SELECT course_id FROM skill_courses 
  WHERE course_name = 'HTML / CSS Level1(frontend)'
)
AND status = 'Active';
```

### Get random MCQ question for HTML/CSS
```sql
SELECT qb.* FROM question_bank qb
JOIN skill_courses sc ON qb.course_id = sc.course_id
WHERE sc.course_name = 'HTML / CSS Level1(frontend)'
  AND qb.question_type = 'mcq'
  AND qb.status = 'Active'
ORDER BY RAND() LIMIT 1;
```

### Check if student can see task (skill not cleared)
```sql
SELECT t.* FROM tasks t
LEFT JOIN student_skills ss ON 
  ss.student_id = 100
  AND ss.course_name = t.skill_filter
  AND ss.status = 'Cleared'
WHERE t.venue_id = 1
  AND t.task_type = 'practice'
  AND t.status = 'Active'
  AND ss.id IS NULL -- Student hasn't cleared
ORDER BY t.day;
```

### Get pending coding submissions for faculty
```sql
SELECT 
  ss.submission_id,
  s.name as student_name,
  t.title as task_title,
  qb.title as question_title,
  ss.submitted_at,
  ss.attempt_number
FROM student_submissions ss
JOIN students s ON ss.student_id = s.student_id
JOIN tasks t ON ss.task_id = t.task_id
JOIN question_bank qb ON ss.question_id = qb.question_id
WHERE ss.current_venue_id = 1
  AND ss.submission_type = 'coding'
  AND ss.status = 'Pending Review'
ORDER BY ss.submitted_at DESC;
```

---

## UI Screens Needed

### Admin Screens

#### 1. Question Bank Management
- **List View**: Table with all questions
  - Columns: ID, Title, Course, Type (MCQ/Coding), Difficulty, Status, Actions
  - Filters: By course, by type, by difficulty
  - Search: By title/description
  - Actions: Edit, Delete, Duplicate, View

- **Add/Edit Question Form**:
  - Course selector (dropdown from skill_courses)
  - Question type selector (MCQ/Coding) - disabled based on course support
  - Common fields: Title, Description, Difficulty, Max Score, Time Limit
  - **If MCQ selected:**
    - Option A input
    - Option B input
    - Option C input
    - Option D input
    - Correct answer dropdown (A/B/C/D)
    - Explanation textarea
  - **If Coding selected:**
    - Code editor for starter code
    - Language support checkboxes
    - Test cases JSON editor (optional)
    - Expected output textarea
  - Hints textarea (optional)
  - Status dropdown (Active/Inactive/Draft)
  - Save button

#### 2. Course Configuration (Optional)
- View `skill_courses` table
- Add new skills with MCQ/Coding support flags
- Edit existing skill configurations

### Student Screens

#### 1. Task List (Enhanced)
```
My Tasks
┌─────────────────────────────────────────────┐
│ □ Manual Tasks                              │
│   • Portfolio Website - Due: Feb 15         │
│                                             │
│ □ Practice Tasks                            │
│   🎯 HTML/CSS Quiz - MCQ - Due: Feb 12     │
│   💻 HTML/CSS Coding - Coding - Due: Feb 18│
│   💻 JavaScript Challenge - Due: Feb 25     │
│   🎯 Git Basics Quiz - MCQ - Due: Feb 10   │
└─────────────────────────────────────────────┘
```

#### 2. MCQ Test Interface
```
HTML/CSS Fundamentals Quiz
Time Remaining: 4:32

Question: What is the correct CSS syntax?

○ A. color: red;
○ B. red: color;
○ C. color = red
○ D. text-color: red

Hint: [Show Hint] (if available)

[Submit Answer]
```

#### 3. Coding Interface
```
JavaScript Programming Challenge
Time Remaining: 28:15

Question: Write a function that filters even numbers...

┌─────────────────────────────────────────────┐
│ // Code Editor                              │
│ function filterEvenNumbers(arr) {           │
│   // Write your code here                   │
│                                             │
│ }                                           │
└─────────────────────────────────────────────┘

[Run Code]  [Submit Solution]

Console Output:
> Test 1: Passed ✓
> Test 2: Failed ✗
```

### Faculty Screens

#### 1. Code Evaluation Screen
```
Code Submissions - Pending Review

Filter: [All Skills ▼] [All Students ▼] [Date Range]

┌────────────────────────────────────────────────┐
│ Student: John Doe                              │
│ Task: JavaScript Challenge                     │
│ Question: Array Filter - Even Numbers          │
│ Submitted: Feb 7, 2026 10:30 AM               │
│ Attempt: 1                                     │
│                                                │
│ [View Code] [Grade Now]                        │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ Student: Jane Smith                            │
│ Task: HTML/CSS Coding Challenge                │
│ ...                                            │
└────────────────────────────────────────────────┘
```

#### 2. Grading Modal
```
Grade Submission - John Doe
Question: Array Filter - Even Numbers

┌─────────────────────────────────────────────┐
│ // Student's Code                           │
│ function filterEvenNumbers(arr) {           │
│   return arr.filter(num => num % 2 === 0); │
│ }                                           │
└─────────────────────────────────────────────┘

Test Results:
✓ Test 1: Passed
✓ Test 2: Passed
✓ Test 3: Passed

Execution History: 5 runs before submission

Grade: [____] / 100

Feedback:
┌─────────────────────────────────────────────┐
│                                             │
│                                             │
└─────────────────────────────────────────────┘

[Submit Grade]  [Need Revision]
```

---

## Implementation Priority

### Phase 1: Database (DONE ✅)
- ✅ Run migration script
- ✅ Verify tables created
- ✅ Verify skill_courses populated

### Phase 2: Backend - Admin Question Management (NEXT)
1. Create `questionBank.controller.js`
2. Implement CRUD operations
3. Add course configuration endpoints
4. Create routes

### Phase 3: Frontend - Admin Screens (AFTER BACKEND)
1. Question Bank list page
2. Add/Edit question form
3. Course configuration page

### Phase 4: Backend - Student & Assignment Logic
1. Random question assignment
2. MCQ auto-grading
3. Code submission handling

### Phase 5: Frontend - Student Screens
1. Task list with practice tasks
2. MCQ test interface
3. Code editor integration

### Phase 6: Backend - Faculty Grading
1. Pending submissions retrieval
2. Grading endpoints
3. Reassignment logic

### Phase 7: Frontend - Faculty Screens
1. Code evaluation page
2. Grading interface
3. Reports integration

---

**Current Status:** Phase 1 Complete ✅  
**Next Step:** Run migration and start Phase 2 (Admin Backend)

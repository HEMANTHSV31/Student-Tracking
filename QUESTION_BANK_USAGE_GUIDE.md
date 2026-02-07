# Question Bank System - Usage Guide

## Overview

The Question Bank System enables admins to create and manage MCQ (Multiple Choice Questions) and Coding questions for different skill courses. Students can take tests and practice coding, while faculty can evaluate submissions and provide grades.

## Database Migration

### Step 1: Run the Migration

Execute the migration to create all required tables:

```bash
cd server
node migrations/run-question-bank-migration.js
```

This will create:
- `skill_courses` (pre-loaded with HTML/CSS, JavaScript, Git/GitHub)
- `question_bank` (stores all questions)
- `student_submissions` (tracks student answers)
- `task_question_assignments` (assigns random questions to students)
- `code_execution_history` (logs code test runs)

### Verify Migration

Check that tables were created:

```sql
SHOW TABLES LIKE '%skill%';
SHOW TABLES LIKE '%question%';
SHOW TABLES LIKE '%submission%';
```

## Features by Role

### 1. Admin Features

#### Access Question Bank Dashboard
Navigate to: `/admin/question-bank`

**Features:**
- View statistics (total questions, MCQ/Coding breakdown)
- See difficulty distribution
- Course-wise question counts
- Status overview (Active/Inactive/Draft)

#### Manage Questions
Navigate to: `/admin/question-bank/questions`

**Features:**
- List all questions with filters:
  - By course (HTML/CSS, JavaScript, Git/GitHub)
  - By type (MCQ, Coding)
  - By difficulty (Easy, Medium, Hard)
  - By status (Active, Inactive, Draft)
  - Search by title/description
- View, edit, or delete questions
- Soft delete (if submissions exist) or hard delete

#### Create MCQ Questions
Navigate to: `/admin/question-bank/questions/create`

**Steps:**
1. Select course (must support MCQ)
2. Choose "Multiple Choice (MCQ)" type
3. Enter title and description
4. Set difficulty, max score, time limit, status
5. Fill in 4 options (A, B, C, D)
6. Select correct answer
7. Click "Create Question"

**Example:**
- Course: HTML/CSS
- Title: "What is the correct HTML tag for a paragraph?"
- Options:
  - A: `<p>`
  - B: `<para>`
  - C: `<paragraph>`
  - D: `<text>`
- Correct Answer: A

#### Create Coding Questions
Navigate to: `/admin/question-bank/questions/create`

**Steps:**
1. Select course (must support Coding)
2. Choose "Coding Challenge" type
3. Enter title and description
4. Set difficulty, max score, time limit, status
5. Select programming language
6. Add starter code (optional)
7. Add solution code (for faculty reference)
8. Create test cases:
   - Input value
   - Expected output
   - Mark as hidden (optional)
9. Click "Create Question"

**Example:**
- Course: JavaScript
- Title: "Sum of Array Elements"
- Description: "Write a function that returns the sum of all elements in an array"
- Language: JavaScript
- Starter Code:
  ```javascript
  function sumArray(arr) {
    // Your code here
  }
  ```
- Test Case 1:
  - Input: `[1, 2, 3, 4]`
  - Expected Output: `10`
  - Hidden: No
- Test Case 2:
  - Input: `[10, -5, 3]`
  - Expected Output: `8`
  - Hidden: Yes

### 2. Student Features (Coming Soon)

#### MCQ Test Interface
- View assigned MCQ questions
- Select answers with radio buttons
- Submit test (auto-graded immediately)
- View score and correct answers

#### Code Practice
- View assigned coding questions
- Write code in Monaco/CodeMirror editor
- Run test cases to validate solution
- Submit code for faculty evaluation
- Track execution history

### 3. Faculty Features (Coming Soon)

#### View Pending Submissions
- List all student code submissions
- Filter by course, student, date
- See submission status (Pending, Graded, Reassigned)

#### Evaluate Code
- View student code side-by-side with reference solution
- Test code against all test cases
- Provide feedback comments
- Assign grade (pass/fail or score)
- Request reassignment if score < 50%

## API Endpoints

### Courses
- `GET /api/question-bank/courses` - List all skill courses
- `POST /api/question-bank/courses` - Create new course
- `PUT /api/question-bank/courses/:id` - Update course
- `DELETE /api/question-bank/courses/:id` - Delete course

### Questions
- `GET /api/question-bank/questions` - List questions with filters
- `GET /api/question-bank/questions/:id` - Get question details
- `POST /api/question-bank/questions` - Create question
- `PUT /api/question-bank/questions/:id` - Update question
- `DELETE /api/question-bank/questions/:id` - Delete question
- `GET /api/question-bank/questions/by-course/:courseId` - Filter by course

### Statistics
- `GET /api/question-bank/statistics` - Dashboard metrics

### Example API Call

**Create MCQ Question:**
```bash
curl -X POST http://localhost:5001/pbl/api/question-bank/questions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": 1,
    "question_type": "mcq",
    "title": "CSS Box Model",
    "description": "Which property is NOT part of the CSS box model?",
    "difficulty_level": "Easy",
    "max_score": 5,
    "time_limit_minutes": 5,
    "status": "Active",
    "mcq_options": "{\"option_a\":\"margin\",\"option_b\":\"padding\",\"option_c\":\"border\",\"option_d\":\"color\"}",
    "mcq_correct_answer": "D"
  }'
```

**Create Coding Question:**
```bash
curl -X POST http://localhost:5001/pbl/api/question-bank/questions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "course_id": 2,
    "question_type": "coding",
    "title": "Reverse String",
    "description": "Write a function to reverse a string",
    "difficulty_level": "Easy",
    "max_score": 10,
    "time_limit_minutes": 15,
    "status": "Active",
    "coding_language": "javascript",
    "coding_starter_code": "function reverseString(str) {\n  // Your code\n}",
    "coding_solution_code": "function reverseString(str) {\n  return str.split(\"\").reverse().join(\"\");\n}",
    "coding_test_cases": "[{\"input\":\"hello\",\"expected_output\":\"olleh\",\"is_hidden\":false}]"
  }'
```

## Course Configuration

### Pre-loaded Courses

The migration automatically creates these courses:

| Course       | Supports MCQ | Supports Coding |
|--------------|--------------|-----------------|
| HTML/CSS     | ✅           | ✅              |
| JavaScript   | ❌           | ✅              |
| Git & GitHub | ✅           | ❌              |

### Validation Rules

- HTML/CSS questions can be MCQ OR Coding
- JavaScript questions must be Coding only
- Git/GitHub questions must be MCQ only

The API will reject questions that violate these rules.

## Workflow Example

### Scenario: Adding HTML/CSS Practice Questions

**Admin:**
1. Navigate to `/admin/question-bank`
2. Click "Create Question"
3. Create 5 MCQ questions (Easy difficulty)
4. Create 3 Coding questions (Medium difficulty)
5. Set all to "Active" status

**Student (Future):**
1. Navigate to `/student/code-practice`
2. Select HTML/CSS course
3. System assigns 2 random MCQs + 1 random coding question
4. Complete MCQ test → Auto-graded
5. Write code → Submit for faculty review

**Faculty (Future):**
1. Navigate to `/faculty/submissions`
2. See pending HTML/CSS submissions
3. Review student code
4. Provide feedback and grade
5. Student notified of result

## Best Practices

### Question Creation

1. **Clear Titles**: Use descriptive, concise titles
2. **Detailed Descriptions**: Explain what is expected
3. **Realistic Time Limits**: 
   - MCQ: 3-5 minutes per question
   - Coding: 15-30 minutes depending on complexity
4. **Test Cases**: 
   - Include edge cases
   - Mix visible and hidden test cases
   - Validate expected outputs match solution

### Difficulty Guidelines

- **Easy**: Basic concepts, straightforward logic
- **Medium**: Combines multiple concepts, requires problem-solving
- **Hard**: Complex algorithms, optimization required

### Status Management

- **Draft**: Work in progress, not visible to students
- **Active**: Live and assignable to students
- **Inactive**: Temporarily disabled (e.g., outdated content)

## Troubleshooting

### Migration Fails

**Error:** "Table already exists"
```bash
# Drop tables and re-run migration
mysql -u root -p studentactivity < migrations/cleanup_unused_tables.sql
node migrations/run-question-bank-migration.js
```

### Question Creation Fails

**Error:** "Course does not support this question type"
- Verify course_id is correct
- Check `skill_courses` table for `supports_mcq` and `supports_coding` flags
- Ensure question type matches course capabilities

### Authentication Issues

**Error:** "No token provided"
- Ensure JWT token is in localStorage
- Check Authorization header: `Bearer <token>`
- Verify token hasn't expired

## Next Steps

1. **Phase 4**: Implement student assignment logic (random question selection)
2. **Phase 5**: Build student MCQ test and coding interfaces
3. **Phase 6**: Create faculty evaluation backend (grading, feedback)
4. **Phase 7**: Build faculty code review UI

## Support

For issues or questions, check:
- Migration logs: `server/migrations/migration_[timestamp].log`
- Server logs: Check console output when API calls fail
- Browser console: Check for frontend errors

## Data Structure Reference

### Question Bank Table
```sql
question_id         INT (Primary Key)
course_id           INT (Foreign Key → skill_courses)
question_type       ENUM('mcq', 'coding')
title               VARCHAR(500)
description         TEXT
difficulty_level    ENUM('Easy', 'Medium', 'Hard')
max_score           INT
time_limit_minutes  INT
status              ENUM('Active', 'Inactive', 'Draft')
-- MCQ fields
mcq_options         JSON {"option_a": "...", "option_b": "...", ...}
mcq_correct_answer  ENUM('A', 'B', 'C', 'D')
-- Coding fields
coding_language     ENUM('javascript', 'python', 'java', 'cpp', 'html_css')
coding_starter_code TEXT
coding_solution_code TEXT
coding_test_cases   JSON [{"input": "...", "expected_output": "...", "is_hidden": true/false}]
```

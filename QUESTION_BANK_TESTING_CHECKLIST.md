# Question Bank Testing Checklist

## Pre-Testing Setup

### 1. Database Migration
```bash
cd server
node migrations/run-question-bank-migration.js
```

**Expected Output:**
```
✓ Migration file found
✓ Database connection established
✓ skill_courses table created
✓ question_bank table created
✓ student_submissions table created
✓ task_question_assignments table created
✓ code_execution_history table created
✓ tasks table altered
✓ Default courses inserted
Migration completed successfully!
```

**Verify Tables:**
```sql
USE studentactivity;
SHOW TABLES LIKE '%skill%';
SHOW TABLES LIKE '%question%';
SHOW TABLES LIKE '%submission%';

SELECT * FROM skill_courses;
-- Should show: HTML/CSS, JavaScript, Git & GitHub
```

---

## Backend API Testing

### Test 1: Get All Courses
```http
GET http://localhost:5001/pbl/api/question-bank/courses
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "course_id": 1,
      "course_name": "HTML/CSS",
      "supports_mcq": 1,
      "supports_coding": 1
    },
    {
      "course_id": 2,
      "course_name": "JavaScript",
      "supports_mcq": 0,
      "supports_coding": 1
    },
    {
      "course_id": 3,
      "course_name": "Git & GitHub",
      "supports_mcq": 1,
      "supports_coding": 0
    }
  ]
}
```

**Status:** [ ] Pass [ ] Fail

---

### Test 2: Create MCQ Question
```http
POST http://localhost:5001/pbl/api/question-bank/questions
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "course_id": 1,
  "question_type": "mcq",
  "title": "What does CSS stand for?",
  "description": "Select the correct full form of CSS",
  "difficulty_level": "Easy",
  "max_score": 5,
  "time_limit_minutes": 3,
  "status": "Active",
  "mcq_options": "{\"option_a\":\"Cascading Style Sheets\",\"option_b\":\"Creative Style Sheets\",\"option_c\":\"Computer Style Sheets\",\"option_d\":\"Colorful Style Sheets\"}",
  "mcq_correct_answer": "A"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "question_id": 1
  }
}
```

**Status:** [ ] Pass [ ] Fail

---

### Test 3: Create Coding Question
```http
POST http://localhost:5001/pbl/api/question-bank/questions
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "course_id": 2,
  "question_type": "coding",
  "title": "Sum of Two Numbers",
  "description": "Write a function that returns the sum of two numbers",
  "difficulty_level": "Easy",
  "max_score": 10,
  "time_limit_minutes": 15,
  "status": "Active",
  "coding_language": "javascript",
  "coding_starter_code": "function sum(a, b) {\n  // Your code here\n}",
  "coding_solution_code": "function sum(a, b) {\n  return a + b;\n}",
  "coding_test_cases": "[{\"input\":\"2, 3\",\"expected_output\":\"5\",\"is_hidden\":false},{\"input\":\"10, 20\",\"expected_output\":\"30\",\"is_hidden\":true}]"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "question_id": 2
  }
}
```

**Status:** [ ] Pass [ ] Fail

---

### Test 4: Get All Questions
```http
GET http://localhost:5001/pbl/api/question-bank/questions
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "question_id": 1,
      "course_id": 1,
      "course_name": "HTML/CSS",
      "question_type": "mcq",
      "title": "What does CSS stand for?",
      "difficulty_level": "Easy",
      "max_score": 5,
      "time_limit_minutes": 3,
      "status": "Active",
      "created_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "question_id": 2,
      "course_id": 2,
      "course_name": "JavaScript",
      "question_type": "coding",
      "title": "Sum of Two Numbers",
      "difficulty_level": "Easy",
      "max_score": 10,
      "time_limit_minutes": 15,
      "status": "Active",
      "created_at": "2024-01-15T10:35:00.000Z"
    }
  ]
}
```

**Status:** [ ] Pass [ ] Fail

---

### Test 5: Filter Questions by Course
```http
GET http://localhost:5001/pbl/api/question-bank/questions?course_id=2
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected:** Only JavaScript questions returned

**Status:** [ ] Pass [ ] Fail

---

### Test 6: Search Questions
```http
GET http://localhost:5001/pbl/api/question-bank/questions?search=sum
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected:** Questions with "sum" in title/description

**Status:** [ ] Pass [ ] Fail

---

### Test 7: Get Single Question
```http
GET http://localhost:5001/pbl/api/question-bank/questions/1
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "question_id": 1,
    "course_id": 1,
    "course_name": "HTML/CSS",
    "question_type": "mcq",
    "title": "What does CSS stand for?",
    "description": "Select the correct full form of CSS",
    "difficulty_level": "Easy",
    "max_score": 5,
    "time_limit_minutes": 3,
    "status": "Active",
    "mcq_options": {
      "option_a": "Cascading Style Sheets",
      "option_b": "Creative Style Sheets",
      "option_c": "Computer Style Sheets",
      "option_d": "Colorful Style Sheets"
    },
    "mcq_correct_answer": "A",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": null
  }
}
```

**Status:** [ ] Pass [ ] Fail

---

### Test 8: Update Question
```http
PUT http://localhost:5001/pbl/api/question-bank/questions/1
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "What does CSS stand for? (Updated)",
  "max_score": 8
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Question updated successfully"
}
```

**Status:** [ ] Pass [ ] Fail

---

### Test 9: Delete Question (No Submissions)
```http
DELETE http://localhost:5001/pbl/api/question-bank/questions/1
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Question deleted permanently"
}
```

**Status:** [ ] Pass [ ] Fail

---

### Test 10: Get Statistics
```http
GET http://localhost:5001/pbl/api/question-bank/statistics
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total_questions": 5,
      "mcq_questions": 2,
      "coding_questions": 3,
      "active_questions": 4
    },
    "difficulty_breakdown": {
      "Easy": 3,
      "Medium": 2,
      "Hard": 0
    },
    "course_breakdown": [
      {
        "course_name": "HTML/CSS",
        "total_questions": 2
      },
      {
        "course_name": "JavaScript",
        "total_questions": 2
      },
      {
        "course_name": "Git & GitHub",
        "total_questions": 1
      }
    ],
    "status_breakdown": {
      "Active": 4,
      "Inactive": 0,
      "Draft": 1
    }
  }
}
```

**Status:** [ ] Pass [ ] Fail

---

## Frontend UI Testing

### Test 11: Access Dashboard
1. Login as admin
2. Navigate to `/admin/question-bank`

**Expected:**
- Statistics cards show correct numbers
- Difficulty breakdown displays bars
- Course breakdown table shows all courses
- Status indicators visible

**Status:** [ ] Pass [ ] Fail

---

### Test 12: View Question List
1. Click "Question List" button
2. Verify table loads

**Expected:**
- All questions displayed in table
- Type badges (MCQ/Coding) visible
- Difficulty badges color-coded
- Action buttons (View/Edit/Delete) work

**Status:** [ ] Pass [ ] Fail

---

### Test 13: Filter Questions
1. Select course from dropdown
2. Select difficulty
3. Type in search box

**Expected:**
- Table updates with each filter
- Active filter count shows
- "Clear all" button works

**Status:** [ ] Pass [ ] Fail

---

### Test 14: Create MCQ Question
1. Click "Create Question"
2. Select "HTML/CSS" course
3. Choose "Multiple Choice (MCQ)"
4. Fill title: "Test MCQ"
5. Fill description
6. Set difficulty: "Easy"
7. Fill all 4 options
8. Select correct answer
9. Click "Create Question"

**Expected:**
- Form validates all fields
- Success message appears
- Redirects to question list
- New question visible in list

**Status:** [ ] Pass [ ] Fail

---

### Test 15: Create Coding Question
1. Click "Create Question"
2. Select "JavaScript" course
3. Choose "Coding Challenge"
4. Fill title: "Test Coding"
5. Fill description
6. Select language: "javascript"
7. Add starter code
8. Add solution code
9. Add test case (input + output)
10. Click "Add Test Case" (add 2nd test case)
11. Mark 2nd test case as hidden
12. Click "Create Question"

**Expected:**
- Test cases dynamically added
- Hidden checkbox works
- Success message appears
- New question in list

**Status:** [ ] Pass [ ] Fail

---

### Test 16: View Question Detail
1. Click eye icon on a question
2. Verify all details displayed

**Expected MCQ:**
- All 4 options shown
- Correct answer highlighted green
- Metadata cards visible

**Expected Coding:**
- Language displayed
- Starter code shown in code block
- Solution code shown
- All test cases listed
- Hidden test cases marked

**Status:** [ ] Pass [ ] Fail

---

### Test 17: Edit Question
1. Click "Edit" button on a question
2. Modify title
3. Change difficulty
4. Update status
5. Click "Update Question"

**Expected:**
- Form pre-fills with existing data
- Changes save successfully
- Redirects to question list
- Updates visible

**Status:** [ ] Pass [ ] Fail

---

### Test 18: Delete Question
1. Click "Delete" button
2. Confirm deletion in prompt

**Expected:**
- Confirmation dialog appears
- Question removed from list
- Success alert shown

**Status:** [ ] Pass [ ] Fail

---

### Test 19: Validation Tests
**Test 19a: Empty Title**
1. Try to create question without title
2. Expected: Error "Please enter a question title"

**Test 19b: Incomplete MCQ Options**
1. Create MCQ but leave option C empty
2. Expected: Error "Please fill all MCQ options"

**Test 19c: No Correct Answer**
1. Create MCQ but don't select correct answer
2. Expected: Error "Please select the correct answer"

**Test 19d: Empty Test Case**
1. Create Coding question with empty test case input
2. Expected: Error "Please fill all test case inputs and expected outputs"

**Test 19e: Wrong Course Type**
1. Try to create MCQ for JavaScript course (coding only)
2. Expected: Warning "⚠️ This course doesn't support MCQ"

**Status:** [ ] Pass [ ] Fail

---

### Test 20: Responsive Design
1. Resize browser to mobile width (375px)
2. Navigate through all pages

**Expected:**
- Dashboard cards stack vertically
- Filter dropdowns full width
- Table scrolls horizontally
- Action buttons stack
- Forms remain usable

**Status:** [ ] Pass [ ] Fail

---

## Integration Tests

### Test 21: Full Workflow - MCQ
1. Create MCQ question
2. Verify it appears in dashboard statistics
3. Filter by course
4. View detail page
5. Edit title
6. Change status to "Inactive"
7. Verify dashboard active count decreased
8. Delete question
9. Verify statistics updated

**Status:** [ ] Pass [ ] Fail

---

### Test 22: Full Workflow - Coding
1. Create Coding question with 3 test cases
2. Mark 2nd test case as hidden
3. View detail page
4. Verify hidden indicator shows
5. Edit and add 4th test case
6. Remove 3rd test case
7. Save and verify changes

**Status:** [ ] Pass [ ] Fail

---

### Test 23: Multi-User Test
1. Login as admin
2. Create 5 questions
3. Logout
4. Login as different admin
5. View question list
6. Edit a question created by first admin
7. Expected: All operations work seamlessly

**Status:** [ ] Pass [ ] Fail

---

## Performance Tests

### Test 24: Large Dataset
1. Create 50 questions (mix of MCQ and Coding)
2. Load question list
3. Apply filters
4. Expected: Page loads in < 2 seconds

**Status:** [ ] Pass [ ] Fail

---

### Test 25: Concurrent Requests
1. Open 3 browser tabs
2. Load question list in all tabs
3. Create question in tab 1
4. Refresh tab 2
5. Expected: New question appears

**Status:** [ ] Pass [ ] Fail

---

## Security Tests

### Test 26: Authentication Required
1. Logout
2. Try to access `/admin/question-bank`
3. Expected: Redirect to login

**Status:** [ ] Pass [ ] Fail

---

### Test 27: Authorization Required
1. Login as student
2. Try to access `/admin/question-bank`
3. Expected: Access denied or redirect

**Status:** [ ] Pass [ ] Fail

---

### Test 28: Token Expiry
1. Get JWT token
2. Wait for token expiry
3. Try to create question
4. Expected: 401 Unauthorized error

**Status:** [ ] Pass [ ] Fail

---

## Error Handling Tests

### Test 29: Network Error
1. Turn off backend server
2. Try to load question list
3. Expected: Error message displayed

**Status:** [ ] Pass [ ] Fail

---

### Test 30: Invalid Question ID
1. Navigate to `/admin/question-bank/questions/99999`
2. Expected: "Question not found" message

**Status:** [ ] Pass [ ] Fail

---

## Summary

**Total Tests:** 30
**Passed:** ___
**Failed:** ___
**Pass Rate:** ___%

**Critical Issues Found:**
1. _____________________________
2. _____________________________
3. _____________________________

**Blocker Issues:**
- _____________________________

**Non-Critical Issues:**
- _____________________________

**Tested By:** _____________________
**Date:** _____________________
**Environment:** Development / Staging / Production
**Browser:** Chrome / Firefox / Safari / Edge
**Device:** Desktop / Mobile

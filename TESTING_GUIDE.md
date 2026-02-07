# 🧪 Quick Testing Guide - Question Bank Integration

## ✅ What Was Fixed

1. **Navigation Paths Fixed** - Removed `/student/` prefix from routes
2. **All Components Connected** - Using real backend APIs
3. **No Dummy Data** - Everything fetches from database

---

## 🚀 Step-by-Step Testing

### Prerequisites:
```bash
# 1. Install Monaco Editor (if not installed)
cd Frontend
npm install @monaco-editor/react

# 2. Ensure questions exist in database
# Run this SQL query:
SELECT COUNT(*) FROM question_bank WHERE status = 'Active';
# Should return > 0
```

---

### Test 1: Faculty Creates MCQ Practice Task

**Steps:**
1. Login as **Faculty**
2. Go to **Tasks & Assignments** page
3. Fill in task details:
   - Title: "HTML Quiz - Day 1"
   - Day: 1
   - Due Date: Tomorrow
   - Max Score: 100
   - **Skill Filter**: Select "HTML/CSS" (or any skill you have questions for)
4. **Task Type**: Click "Practice Question" button
5. **Question Type**: Click "MCQ" button
6. Click **"Publish Assignment"**

**Expected Result:**
✅ Task created successfully
✅ Console shows: "Assignment published successfully!"
✅ Check database:
```sql
SELECT * FROM tasks WHERE task_type = 'practice' ORDER BY created_at DESC LIMIT 1;
-- Should show the new task with practice_type = 'mcq'

SELECT * FROM task_question_assignments WHERE task_id = [new_task_id];
-- Should show one entry per student
```

---

### Test 2: Student Views and Takes MCQ Test

**Steps:**
1. Login as **Student**
2. Go to **Tasks & Assignments** page
3. Look for the task you just created

**Expected Result:**
✅ Task appears in the list with blue **"MCQ"** badge
✅ No errors in console

4. **Click on the MCQ task card**

**Expected Result:**
✅ Navigate to `/question-bank/mcq/:taskId`
✅ MCQ test page loads showing:
   - Question text
   - 4 options (radio buttons)
   - Timer (if time_limit set)
   - Submit button

**If you see an error** - Check browser console:
- If "Failed to load question": Question might not be assigned or doesn't exist
- Check: `SELECT * FROM task_question_assignments WHERE task_id = [task_id] AND student_id = [student_id];`

5. **Select an answer and click Submit**

**Expected Result:**
✅ Result page shows instantly:
   - "Correct Answer!" or "Incorrect Answer"
   - Score percentage
   - Explanation (if provided)
   - Correct answer shown if wrong
✅ Navigate back to tasks page shows updated status

---

### Test 3: Faculty Creates Coding Practice Task

**Steps:**
1. Login as **Faculty**
2. Go to **Tasks & Assignments**
3. Create new task:
   - Title: "JavaScript Coding - Day 2"
   - **Task Type**: Practice Question
   - **Question Type**: Coding
   - **Skill Filter**: "JavaScript" (or any skill with coding questions)
4. Click Publish

**Expected Result:**
✅ Task created
✅ Database check:
```sql
SELECT * FROM tasks WHERE task_type = 'practice' AND practice_type = 'coding' ORDER BY created_at DESC LIMIT 1;
```

---

### Test 4: Student Solves Coding Question

**Steps:**
1. Login as **Student**
2. Go to Tasks & Assignments
3. Look for coding task

**Expected Result:**
✅ Task shows yellow **"CODING"** badge

4. Click on the coding task

**Expected Result:**
✅ Navigate to `/question-bank/coding/:taskId`
✅ Page loads with:
   - Left panel: Problem description, test cases
   - Right panel: Monaco code editor
   - Language selector (Python, JavaScript, Java, C++)

5. Write some code and click **Submit Solution**

**Expected Result:**
✅ Alert: "Solution submitted successfully!"
✅ Navigate back to tasks
✅ Database check:
```sql
SELECT * FROM student_submissions WHERE task_id = [task_id] AND student_id = [student_id];
-- Should show status = 'Pending Review'
```

---

### Test 5: Faculty Grades Coding Submission

**Steps:**
1. Login as **Faculty**
2. Navigate directly to: `http://localhost:5173/faculty/question-bank/pending`
   OR add a link in your faculty dashboard

**Expected Result:**
✅ Page loads showing pending submissions list
✅ Student's coding submission appears

3. Click **"Grade"** button on a submission

**Expected Result:**
✅ Navigate to `/faculty/question-bank/grade/:submissionId`
✅ Page shows:
   - Student info
   - Problem description
   - Student's code (read-only Monaco editor)
   - Score input field (0-100)
   - Feedback textarea

4. Enter score (e.g., 75) and feedback, click **Submit Grade**

**Expected Result:**
✅ Alert: "Grade submitted successfully! Student scored 75%."
✅ Navigate back to pending submissions page
✅ That submission no longer appears in pending list
✅ Database:
```sql
SELECT * FROM student_submissions WHERE submission_id = [submission_id];
-- Should show status = 'Graded', score = 75
```

---

## 🔍 Troubleshooting

### Problem: MCQ/Coding badges not showing
**Solution:** 
- Check task has `task_type='practice'` in database
- Check browser console for errors
- Verify `getStudentTasks()` API is returning `taskType` and `practiceType` fields

### Problem: "Failed to load question" error
**Solution:**
```sql
-- Check if question is assigned
SELECT * FROM task_question_assignments 
WHERE task_id = [task_id] AND student_id = [student_id];

-- Check if question exists
SELECT * FROM question_bank WHERE question_id = [question_id];
```

### Problem: Monaco editor not loading
**Solution:**
```bash
# Install Monaco Editor
cd Frontend
npm install @monaco-editor/react
npm run build
```

### Problem: Navigation not working (page doesn't change)
**Solution:**
- Check browser console for route errors
- Verify routes in `AppNavigator.jsx`:
  ```jsx
  <Route path="question-bank/mcq/:taskId" element={<MCQTest />} />
  <Route path="question-bank/coding/:taskId" element={<CodingTest />} />
  ```
- Ensure imports are correct at top of AppNavigator.jsx

### Problem: API returns 404 or 500 error
**Solution:**
- Check backend server is running
- Verify API routes in:
  - `server/routes/studentQuestionBank.routes.js`
  - `server/routes/facultyQuestionBank.routes.js`
- Check these routes are registered in `server/index.js`

---

## 📊 Verification Checklist

After testing, verify:

- [ ] Faculty can create MCQ practice tasks
- [ ] Faculty can create Coding practice tasks
- [ ] Students see blue MCQ badges on MCQ tasks
- [ ] Students see yellow CODING badges on Coding tasks
- [ ] Clicking MCQ task opens MCQ test page
- [ ] Clicking Coding task opens code editor
- [ ] MCQ submissions auto-grade instantly
- [ ] Coding submissions go to pending list
- [ ] Faculty can grade coding submissions
- [ ] Grades save to database
- [ ] Student sees updated status after grading

---

## 🎯 Quick Debug Commands

```bash
# Check backend logs
cd server
npm start
# Watch for API errors

# Check frontend console
# Open browser DevTools (F12)
# Go to Console tab
# Look for:
# - "Failed to load question"
# - "Network error"
# - 404/500 errors

# Check database
mysql -u root -p studentactivity

# View practice tasks
SELECT task_id, title, task_type, practice_type, skill_filter FROM tasks WHERE task_type = 'practice';

# View question assignments
SELECT tqa.*, qb.question_text FROM task_question_assignments tqa
JOIN question_bank qb ON tqa.question_id = qb.question_id
LIMIT 10;

# View submissions
SELECT s.*, st.name FROM student_submissions s
JOIN students st ON s.student_id = st.student_id
WHERE status = 'Pending Review'
LIMIT 10;
```

---

## ✅ Success Criteria

Everything is working if:

1. **Faculty** can create practice tasks with task type selector visible
2. **Students** see colored badges (MCQ=blue, CODING=yellow) on practice tasks
3. **Clicking practice tasks** opens the test/editor (not the detail panel)
4. **MCQ tests** load questions and auto-grade on submit
5. **Coding editor** loads Monaco with the problem
6. **Faculty grading page** shows pending submissions and allows grading
7. **No dummy data** - all data comes from database

If all these work, **integration is complete**! 🎉

---

## 📞 Still Having Issues?

Check:
1. Browser console (F12) for JavaScript errors
2. Network tab (F12) for failed API calls
3. Backend terminal for server errors
4. Database for missing data

Common fixes:
- Clear browser cache (Ctrl+Shift+Delete)
- Restart backend server
- Rebuild frontend (`npm run build`)
- Check .env file has correct API_URL

# 📋 Question Bank Integration - Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Changes Complete
- [x] Backend: `tasks.controller.js` - createTask() updated
- [x] Backend: `tasks.controller.js` - getStudentTasks() updated
- [x] Frontend: Faculty task creation UI updated
- [x] Frontend: Student task display updated
- [x] Frontend: Routes added to AppNavigator
- [x] CSS: Fixed empty ruleset error

### ✅ Files Modified (5 total)
1. `server/controllers/tasks.controller.js`
2. `Frontend/src/pages/Faculty/Task&Assignments/TaskHeader/Task-Assignment-page/Task&assignments.jsx`
3. `Frontend/src/pages/Student/Tasks&Assignments/Tasks&Assignment.jsx`
4. `Frontend/src/Navigation/AppNavigator.jsx`
5. `Frontend/src/styles/GradeSubmission.css`

### ✅ Files Created (3 total)
1. `QUESTION_BANK_INTEGRATION_COMPLETE.md` (Technical documentation)
2. `QUESTION_BANK_QUICK_REFERENCE.md` (User guide)
3. `DEPLOYMENT_CHECKLIST.md` (This file)

---

## Database Verification

### Check Schema Updates
Run these queries on production database:

```sql
-- Verify task_type column exists
SHOW COLUMNS FROM tasks LIKE 'task_type';
-- Expected: task_type | enum('manual','practice') | NO | | manual |

-- Verify practice_type column exists
SHOW COLUMNS FROM tasks LIKE 'practice_type';
-- Expected: practice_type | enum('mcq','coding') | YES | | NULL |

-- Check if question bank tables exist
SHOW TABLES LIKE 'question_bank';
SHOW TABLES LIKE 'task_question_assignments';
SHOW TABLES LIKE 'student_submissions';
SHOW TABLES LIKE 'skill_courses';

-- Verify sample questions exist
SELECT COUNT(*) FROM question_bank WHERE status = 'Active';
-- Should return > 0 (if questions were added)
```

### If Schema Missing:
```bash
cd server/migrations
node run-question-bank-migration.js
# OR run the SQL file manually
```

---

## Backend Deployment

### 1. Verify Node Environment
```bash
cd server
node --version  # Should be v20.x or higher
npm list        # Check all dependencies installed
```

### 2. Check Environment Variables
Ensure these are set in `.env`:
```
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=studentactivity
JWT_SECRET=your_jwt_secret
PORT=5000
```

### 3. Test Backend Locally (Optional)
```bash
cd server
npm start
# Server should start without errors
# Check logs for any migration warnings
```

### 4. Deploy Backend
```bash
# On production server:
cd server
git pull origin main
npm install
pm2 restart server
# OR
systemctl restart your-backend-service
```

### 5. Verify Backend Health
```bash
curl https://pcdp.bitsathy.ac.in/pbl/api/health
# Should return: {"status":"ok"}
```

---

## Frontend Deployment

### 1. Install Monaco Editor
```bash
cd Frontend
npm install @monaco-editor/react
```

**IMPORTANT**: This is the ONLY new dependency. Do NOT skip this step.

### 2. Verify Dependencies
```bash
cd Frontend
npm list @monaco-editor/react
# Should show: @monaco-editor/react@4.x.x
```

### 3. Build Frontend
```bash
cd Frontend
npm run build
# This will create the dist/ folder
```

### 4. Check Build Output
```bash
ls -lh dist/
# Should see:
# - index.html
# - assets/
# - Other static files
```

### 5. Deploy Frontend
```bash
# Copy dist/ contents to web server
# Example for nginx:
sudo cp -r dist/* /var/www/html/student-tracker/
sudo systemctl restart nginx

# Example for Apache:
sudo cp -r dist/* /var/www/html/student-tracker/
sudo systemctl restart apache2
```

### 6. Clear Browser Cache
Instruct users to:
- Press `Ctrl + Shift + R` (Windows/Linux)
- Press `Cmd + Shift + R` (Mac)
- Or clear cache manually in browser settings

---

## Post-Deployment Testing

### Backend Testing

#### Test 1: Create Regular Task
```bash
# Use Postman or curl to create a regular task
POST /api/tasks/create
Body: {
  "title": "Test Regular Task",
  "venue_id": 1,
  "day": 1,
  "max_score": 100,
  "task_type": "manual",
  "material_type": "link",
  "external_url": "https://example.com"
}
```
**Expected**: Task created with `task_type='manual'`

#### Test 2: Create MCQ Practice Task
```bash
POST /api/tasks/create
Body: {
  "title": "Test MCQ Task",
  "venue_id": 1,
  "day": 2,
  "max_score": 100,
  "task_type": "practice",
  "practice_type": "mcq",
  "skill_filter": "HTML/CSS"
}
```
**Expected**: 
- Task created with `task_type='practice'`, `practice_type='mcq'`
- Entries in `task_question_assignments` table

#### Test 3: Create Coding Practice Task
```bash
POST /api/tasks/create
Body: {
  "title": "Test Coding Task",
  "venue_id": 1,
  "day": 3,
  "max_score": 100,
  "task_type": "practice",
  "practice_type": "coding",
  "skill_filter": "HTML/CSS"
}
```
**Expected**: Similar to Test 2, but with `practice_type='coding'`

#### Test 4: Get Student Tasks
```bash
GET /api/tasks/student
Headers: {
  "Authorization": "Bearer <student_token>"
}
```
**Expected**: Returns array of tasks with `taskType` and `practiceType` fields

### Frontend Testing

#### Test 1: Faculty Task Creation UI
1. Login as faculty
2. Go to **Tasks & Assignments**
3. Check for:
   - [x] Task Type selector (Regular | Practice)
   - [x] Question Type selector (MCQ | Coding) - shown only when Practice selected
   - [x] File/Link upload - shown only when Regular selected
4. Create a practice task
5. Verify no errors in browser console

#### Test 2: Student Task View
1. Login as student
2. Go to **Tasks & Assignments**
3. Check for:
   - [x] Practice tasks show MCQ or CODING badge
   - [x] Badge colors: MCQ=blue, CODING=yellow
   - [x] Regular tasks have no badge
4. Click on MCQ task
   - [x] Navigates to `/student/question-bank/mcq/:taskId`
5. Click on Coding task
   - [x] Navigates to `/student/question-bank/coding/:taskId`

#### Test 3: MCQ Test Interface
1. Click on an MCQ task
2. Check for:
   - [x] Question loads
   - [x] Timer shows countdown
   - [x] Radio buttons for options
   - [x] Submit button enabled after selecting answer
3. Complete test and submit
4. Check for:
   - [x] Score shown immediately
   - [x] Correct answers highlighted
   - [x] Explanation visible

#### Test 4: Coding Test Interface
1. Click on a Coding task
2. Check for:
   - [x] Monaco editor loads
   - [x] Problem statement visible
   - [x] Language selector works
   - [x] Code can be typed
3. Submit code
4. Check for:
   - [x] Submission successful message
   - [x] No errors in console

#### Test 5: Faculty Grading Interface
1. Login as faculty
2. Navigate to `/faculty/question-bank/pending`
3. Check for:
   - [x] List of pending submissions
   - [x] Student details visible
   - [x] Grade button works
4. Click Grade on a submission
5. Check for:
   - [x] Code displayed in read-only Monaco editor
   - [x] Score input field
   - [x] Feedback textarea
   - [x] Submit grade button works

---

## Smoke Test Checklist

Run this complete workflow:

### Scenario: HTML/CSS MCQ Practice
1. [ ] **Admin**: Add questions to Question Bank (skill: HTML/CSS, type: MCQ)
2. [ ] **Faculty**: Create practice task (Task Type: Practice, Question Type: MCQ, Skill: HTML/CSS)
3. [ ] **Student**: See MCQ task with blue badge in Tasks list
4. [ ] **Student**: Click task → Opens MCQ test
5. [ ] **Student**: Complete test → See instant results
6. [ ] **Student**: Check Tasks list → Task marked as completed

### Scenario: JavaScript Coding Practice
1. [ ] **Admin**: Add questions to Question Bank (skill: JavaScript, type: Coding)
2. [ ] **Faculty**: Create practice task (Task Type: Practice, Question Type: Coding, Skill: JavaScript)
3. [ ] **Student**: See Coding task with yellow badge in Tasks list
4. [ ] **Student**: Click task → Opens code editor
5. [ ] **Student**: Write and submit code
6. [ ] **Faculty**: Navigate to Pending Submissions
7. [ ] **Faculty**: Grade submission with feedback
8. [ ] **Student**: See grade and feedback in task

### Scenario: Regular File Upload Task
1. [ ] **Faculty**: Create regular task (Task Type: Regular, Material: File)
2. [ ] **Student**: See task without badge in Tasks list
3. [ ] **Student**: Click task → Opens detail panel (not navigation)
4. [ ] **Student**: Upload file → Submission successful

---

## Rollback Plan

### If Issues Arise:

#### Backend Rollback:
```bash
cd server
git checkout HEAD~1 controllers/tasks.controller.js
pm2 restart server
```

#### Frontend Rollback:
```bash
cd Frontend
git checkout HEAD~1 src/pages/Faculty/Task&Assignments/...
git checkout HEAD~1 src/pages/Student/Tasks&Assignments/...
git checkout HEAD~1 src/Navigation/AppNavigator.jsx
npm run build
# Deploy old build
```

#### Database Rollback (if needed):
```sql
-- Remove practice tasks
DELETE FROM tasks WHERE task_type = 'practice';

-- Remove task_question_assignments
DELETE FROM task_question_assignments;

-- (Optional) Remove columns
ALTER TABLE tasks DROP COLUMN task_type;
ALTER TABLE tasks DROP COLUMN practice_type;
```

---

## Monitoring

### Things to Monitor:

1. **Error Logs**:
   - Check `pm2 logs` for backend errors
   - Check browser console for frontend errors

2. **Database**:
   - Monitor `tasks` table for new practice tasks
   - Monitor `task_question_assignments` for question assignments
   - Monitor `student_submissions` for submission activity

3. **User Feedback**:
   - Watch for reports of missing badges
   - Watch for navigation issues
   - Watch for grading problems

### Monitoring Commands:
```bash
# Backend logs
pm2 logs server --lines 100

# Check recent practice tasks
mysql -u root -p studentactivity -e "SELECT task_id, title, task_type, practice_type FROM tasks WHERE task_type='practice' ORDER BY created_at DESC LIMIT 10;"

# Check question assignments
mysql -u root -p studentactivity -e "SELECT COUNT(*) FROM task_question_assignments;"

# Check submissions
mysql -u root -p studentactivity -e "SELECT COUNT(*) FROM student_submissions WHERE status='pending';"
```

---

## Success Criteria

Deployment is successful if:

- [x] No errors in backend logs
- [x] No errors in browser console
- [x] Faculty can create practice tasks
- [x] Students see MCQ/CODING badges
- [x] Clicking practice tasks navigates correctly
- [x] MCQ tests auto-grade
- [x] Faculty can grade coding submissions
- [x] Regular tasks still work as before

---

## Documentation Links

- **Technical Details**: `QUESTION_BANK_INTEGRATION_COMPLETE.md`
- **User Guide**: `QUESTION_BANK_QUICK_REFERENCE.md`
- **API Reference**: `QUESTION_BANK_PHASE_4_COMPLETE.md`
- **Integration Guide**: `QUESTION_BANK_INTEGRATION_GUIDE.md`

---

## Support Contacts

- **System Administrator**: [Your contact]
- **Developer**: [Your contact]
- **Emergency Rollback**: [Your procedure]

---

## Post-Deployment Actions

### Within 24 hours:
- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Verify no performance degradation
- [ ] Run smoke tests again

### Within 1 week:
- [ ] Collect faculty feedback on UI
- [ ] Collect student feedback on test experience
- [ ] Check grading accuracy for coding tasks
- [ ] Review question assignment randomness

### Within 1 month:
- [ ] Analyze usage patterns
- [ ] Optimize question assignment algorithm
- [ ] Add any requested features
- [ ] Plan next phase enhancements

---

**Deployment Status**: ⏳ **READY TO DEPLOY**

**Last Updated**: January 2025

**Next Step**: Begin Backend Deployment → Frontend Deployment → Testing

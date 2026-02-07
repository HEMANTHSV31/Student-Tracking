# 🚀 Question Bank Integration - Implementation Steps

## ✅ What's Already Complete

1. **Database Schema** - `task_type` and `practice_type` columns added to tasks table
2. **Question Bank Backend APIs** - All 18 endpoints working
3. **Student Frontend Components** - MCQ Test, Coding Test, Submission History
4. **Faculty Frontend Components** - Pending Submissions, Grading Interface
5. **Auto-grading Logic** - MCQs auto-grade on submission
6. **Manual Grading Logic** - Faculty can grade coding submissions

## 🔧 What Needs Integration

### Phase 1: Backend Integration (Server)

#### File 1: `server/controllers/tasks.controller.js` 
**Function: `createTask`**

Add support for `task_type = 'practice'`:

```javascript
const { 
  title, description, venue_id, day, due_date, max_score, 
  material_type, external_url, skill_filter, course_type, 
  apply_to_all_venues,
  // NEW FIELDS:
  task_type,        // 'manual' or 'practice'
  practice_type,    // 'mcq' or 'coding' (if task_type = 'practice')
  course_id         // Link to skill_courses table
} = req.body;

// When creating practice task:
if (task_type === 'practice') {
  // Insert with practice_type
  await connection.query(`
    INSERT INTO tasks (
      group_id, title, description, venue_id, faculty_id, day, due_date, max_score,
      task_type, practice_type, course_type, skill_filter, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'practice', ?, ?, ?, 'Active', NOW())
  `, [group_id, title, description, target_venue_id, venue_faculty_id, day, due_date, max_score,
      practice_type, course_type, skill_filter]);
  
  const taskId = taskResult.insertId;
  
  // For each eligible student, assign a random question
  for (const student of eligibleStudents) {
    // Get random question from question_bank for this skill and practice_type
    const [questions] = await connection.query(`
      SELECT question_id FROM question_bank qb
      JOIN skill_courses sc ON qb.course_id = sc.course_id
      WHERE sc.skill_name = ? AND qb.question_type = ? AND qb.status = 'Active'
      ORDER BY RAND() LIMIT 1
    `, [skill_filter, practice_type]);
    
    if (questions.length > 0) {
      // Create task_question_assignment
      await connection.query(`
        INSERT INTO task_question_assignments (task_id, student_id, question_id, assigned_at)
        VALUES (?, ?, ?, NOW())
      `, [taskId, student.student_id, questions[0].question_id]);
    }
  }
}
```

#### File 2: `server/controllers/tasks.controller.js`
**Function: `getStudentTasks`**

Merge regular tasks with practice tasks:

```javascript
export const getStudentTasks = async (req, res) => {
  try {
    const userId = req.user.user_id;
    
    // Get student_id
    const [student] = await connection.query(
      'SELECT student_id FROM students WHERE user_id = ?', 
      [userId]
    );
    
    if (student.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    
    const studentId = student[0].student_id;
    
    // Query 1: Get regular tasks (task_type = 'manual')
    const [regularTasks] = await connection.query(`
      SELECT 
        t.task_id as id, t.title, t.description, t.day, t.due_date as dueDate,
        t.max_score as score, t.course_type as courseType, t.skill_filter,
        t.status, t.material_type, t.external_url,
        v.venue_name,
        ts.file_path as filePath, ts.file_name as fileName, ts.link_url,
        ts.submitted_at as submittedDate, ts.grade, ts.feedback, ts.status as submissionStatus,
        f.name as instructor,
        'manual' as task_type
      FROM tasks t
      INNER JOIN venue v ON t.venue_id = v.venue_id
      INNER JOIN groups g ON g.venue_id = v.venue_id
      INNER JOIN group_students gs ON gs.group_id = g.group_id
      LEFT JOIN task_submissions ts ON t.task_id = ts.task_id AND ts.student_id = ?
      LEFT JOIN faculties f ON t.faculty_id = f.faculty_id
      WHERE gs.student_id = ? AND gs.status = 'Active' 
        AND t.status = 'Active' AND (t.task_type = 'manual' OR t.task_type IS NULL)
      ORDER BY t.created_at DESC
    `, [studentId, studentId]);
    
    // Query 2: Get practice tasks (task_type = 'practice')
    const [practiceTasks] = await connection.query(`
      SELECT 
        t.task_id as id, t.title, t.description, t.day, t.due_date as dueDate,
        t.max_score as score, t.course_type as courseType, t.skill_filter,
        t.status, t.practice_type,
        v.venue_name,
        tqa.question_id, tqa.assigned_at,
        qb.title as question_title, qb.question_type, qb.difficulty_level,
        ss.submission_id, ss.status as submissionStatus, ss.grade, ss.feedback,
        ss.submitted_at as submittedDate, ss.attempt_number,
        f.name as instructor,
        'practice' as task_type
      FROM tasks t
      INNER JOIN venue v ON t.venue_id = v.venue_id
      INNER JOIN groups g ON g.venue_id = v.venue_id
      INNER JOIN group_students gs ON gs.group_id = g.group_id
      INNER JOIN task_question_assignments tqa ON t.task_id = tqa.task_id AND tqa.student_id = gs.student_id
      INNER JOIN question_bank qb ON tqa.question_id = qb.question_id
      LEFT JOIN student_submissions ss ON t.task_id = ss.task_id AND ss.student_id = gs.student_id
      LEFT JOIN faculties f ON t.faculty_id = f.faculty_id
      WHERE gs.student_id = ? AND gs.status = 'Active' 
        AND t.status = 'Active' AND t.task_type = 'practice'
        AND tqa.is_active = 1
      ORDER BY t.created_at DESC
    `, [studentId]);
    
    // Combine both task types
    const allTasks = [...regularTasks, ...practiceTasks];
    
    res.status(200).json({
      success: true,
      data: {
        groupedTasks: { all: { tasks: allTasks } },
        skill_progression: []
      }
    });
    
  } catch (error) {
    console.error('Error fetching student tasks:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
};
```

### Phase 2: Faculty Frontend Integration

#### File 3: `Frontend/src/pages/Faculty/Task&Assignments/TaskHeader/Task-Assignment-page/Task&assignments.jsx`

Add task type selector in the form:

```jsx
// Add state
const [taskType, setTaskType] = useState('manual'); // 'manual' or 'practice'
const [practiceType, setPracticeType] = useState('mcq'); // 'mcq' or 'coding'
const [courseId, setCourseId] = useState('');

// Add to form UI:
<div style={styles.fieldGroup}>
  <label style={styles.fieldLabel}>Task Type *</label>
  <select
    style={styles.selectInput}
    value={taskType}
    onChange={e => setTaskType(e.target.value)}
  >
    <option value="manual">Regular Task (File/Link Upload)</option>
    <option value="practice">Practice Question (MCQ/Coding)</option>
  </select>
</div>

{taskType === 'practice' && (
  <>
    <div style={styles.fieldGroup}>
      <label style={styles.fieldLabel}>Practice Type *</label>
      <select
        style={styles.selectInput}
        value={practiceType}
        onChange={e => setPracticeType(e.target.value)}
      >
        <option value="mcq">Multiple Choice Question (MCQ)</option>
        <option value="coding">Coding Question</option>
      </select>
    </div>
    
    <div style={styles.infoBox}>
      <strong>ℹ️ Practice Question Info:</strong>
      <p>
        {practiceType === 'mcq' 
          ? '• MCQs are auto-graded instantly when students submit'
          : '• Coding questions require manual grading by faculty'}
      </p>
      <p>• Questions are randomly assigned from the Question Bank</p>
      <p>• Students with score < 50% get auto-reassigned a different question</p>
    </div>
  </>
)}

// Hide file/link upload for practice questions
{taskType === 'manual' && (
  // ... existing material_type, file upload, external_url fields
)}

// In publishAssignment function:
const formData = new FormData();
formData.append('title', title.trim());
formData.append('description', description.trim());
formData.append('venue_id', group);
formData.append('day', day);
formData.append('due_date', dueDate);
formData.append('max_score', score);
formData.append('skill_filter', skillFilter.trim());
formData.append('course_type', selectedCourseType || 'frontend');
formData.append('apply_to_all_venues', isAllVenues);

// NEW FIELDS:
formData.append('task_type', taskType);
if (taskType === 'practice') {
  formData.append('practice_type', practiceType);
} else {
  formData.append('material_type', materialType);
  if (materialType === 'link') {
    formData.append('external_url', externalUrl);
  } else {
    files.forEach(file => formData.append('files', file));
  }
}
```

### Phase 3: Student Frontend Integration

#### File 4: `Frontend/src/pages/Student/Tasks&Assignments/Tasks&Assignment.jsx`

Update task card display to handle practice tasks:

```jsx
// In TaskCard component:
const TaskCard = ({ task }) => {
  const isManualTask = !task.task_type || task.task_type === 'manual';
  const isPracticeTask = task.task_type === 'practice';
  
  const handleTaskClick = () => {
    if (isManualTask) {
      setSelectedTaskId(task.id);
    } else if (isPracticeTask) {
      // Navigate to question bank interface
      if (task.practice_type === 'mcq') {
        navigate(`/student/question-bank/mcq/${task.id}`);
      } else if (task.practice_type === 'coding') {
        navigate(`/student/question-bank/coding/${task.id}`);
      }
    }
  };
  
  return (
    <div className="task-card" onClick={handleTaskClick}>
      <div className="task-header">
        <h3>{task.title}</h3>
        <div className="task-badges">
          {isPracticeTask && (
            <span className={`badge badge-${task.practice_type === 'mcq' ? 'primary' : 'info'}`}>
              {task.practice_type === 'mcq' ? 'MCQ' : 'Coding'}
            </span>
          )}
          {task.difficulty_level && (
            <span className={`badge badge-${task.difficulty_level.toLowerCase()}`}>
              {task.difficulty_level}
            </span>
          )}
          <span className={`badge badge-${getStatusColor(task.submissionStatus)}`}>
            {task.submissionStatus || 'Not Started'}
          </span>
        </div>
      </div>
      
      <p className="task-description">{task.description}</p>
      
      <div className="task-meta">
        <div className="meta-item">
          <Calendar size={16} />
          <span>{task.dueDate || 'No due date'}</span>
        </div>
        {task.score && (
          <div className="meta-item">
            <strong>Score:</strong> {task.grade || 'Not graded'} / {task.score}
          </div>
        )}
      </div>
      
      {isPracticeTask && task.submissionStatus === 'Auto-Graded' && task.grade && (
        <div className="auto-grade-indicator">
          <CheckCircle2 size={16} color="#10b981" />
          <span>Auto-Graded: {task.grade}%</span>
        </div>
      )}
    </div>
  );
};
```

### Phase 4: Update Routes

#### File 5: `Frontend/src/Navigation/AppNavigator.jsx`

Add Question Bank routes:

```jsx
import QuestionBankDashboard from '../pages/Student/QuestionBankDashboard';
import MCQTest from '../pages/Student/MCQTest';
import CodingTest from '../pages/Student/CodingTest';
import SubmissionHistory from '../pages/Student/SubmissionHistory';
import FacultyPendingSubmissions from '../pages/Faculty/FacultyPendingSubmissions';
import GradeSubmission from '../pages/Faculty/GradeSubmission';

// In student routes:
<Route path="question-bank" element={<QuestionBankDashboard />} />
<Route path="question-bank/mcq/:taskId" element={<MCQTest />} />
<Route path="question-bank/coding/:taskId" element={<CodingTest />} />
<Route path="question-bank/history/:taskId" element={<SubmissionHistory />} />

// In faculty routes:
<Route path="question-bank/pending" element={<FacultyPendingSubmissions />} />
<Route path="question-bank/grade/:submissionId" element={<GradeSubmission />} />
```

## 🎯 Testing Checklist

### For Faculty:
1. ✅ Create Regular Task → Uploads file/link → Students see it
2. ✅ Create MCQ Practice Task → System assigns random MCQs → Students see MCQ questions
3. ✅ Create Coding Practice Task → System assigns random coding questions → Students see coding editor
4. ✅ Filter by skill (HTML/CSS) → Shows both regular tasks AND practice questions for that skill

### For Students:
1. ✅ See all tasks (regular + MCQ + coding) in one list
2. ✅ Click MCQ task → Opens MCQ interface → Auto-grades on submit
3. ✅ Click Coding task → Opens code editor → Submits for manual grading
4. ✅ Filter by skill → Shows only tasks for that skill
5. ✅ View submission history → See all attempts with feedback

### For Faculty Grading:
1. ✅ MCQ submissions show "Auto-Graded" badge
2. ✅ Coding submissions show "Pending Review" → Click Grade → Opens grading interface
3. ✅ Grade with score < 50% → System auto-assigns new question
4. ✅ Student sees feedback and new question

## 📋 Implementation Order

1. **Backend First** - Update tasks.controller.js (both createTask and getStudentTasks)
2. **Faculty UI** - Add task type selector and practice question support
3. **Student UI** - Update task display to handle practice tasks
4. **Routes** - Add Question Bank routes
5. **Test** - Complete end-to-end workflow
6. **Remove Dummy Data** - Verify all data comes from backend APIs

---

This integration will make your Tasks & Assignments system work seamlessly with the Question Bank feature! 🚀

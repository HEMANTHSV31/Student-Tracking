# Quick Integration Guide - Question Bank Frontend

## 🚀 3-Minute Setup

### Step 1: Install Package
```bash
cd Frontend
npm install @monaco-editor/react
```

### Step 2: Add to App.jsx

**Import components (add to imports section):**
```javascript
// Student Question Bank
import QuestionBankDashboard from './pages/Student/QuestionBankDashboard';
import MCQTest from './pages/Student/MCQTest';
import CodingTest from './pages/Student/CodingTest';
import SubmissionHistory from './pages/Student/SubmissionHistory';

// Faculty Question Bank
import FacultyPendingSubmissions from './pages/Faculty/FacultyPendingSubmissions';
import GradeSubmission from './pages/Faculty/GradeSubmission';
```

**Add routes (inside <Routes>):**
```javascript
{/* Student Routes */}
<Route path="/student/question-bank" element={<QuestionBankDashboard />} />
<Route path="/student/question-bank/mcq/:taskId" element={<MCQTest />} />
<Route path="/student/question-bank/coding/:taskId" element={<CodingTest />} />
<Route path="/student/question-bank/history/:taskId" element={<SubmissionHistory />} />

{/* Faculty Routes */}
<Route path="/faculty/question-bank/pending" element={<FacultyPendingSubmissions />} />
<Route path="/faculty/question-bank/grade/:submissionId" element={<GradeSubmission />} />
```

### Step 3: Add Navigation Links

**Student menu:**
```javascript
<NavLink to="/student/question-bank">Question Bank</NavLink>
```

**Faculty menu:**
```javascript
<NavLink to="/faculty/question-bank/pending">Question Bank</NavLink>
```

### Step 4: Test

1. Login as student → Navigate to Question Bank
2. Click "Start" on a task
3. Submit answer
4. Login as faculty → Navigate to Question Bank
5. Grade a submission

## ✅ Done!

All components are fully functional with:
- ✅ API integration
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design
- ✅ Role-based access

See `QUESTION_BANK_PHASE_5_6_COMPLETE.md` for detailed documentation.

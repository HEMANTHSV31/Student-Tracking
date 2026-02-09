import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";

// Layout
import SideTab from "../components/TabRouter/SideTab";

// Pages
import Login from "../pages/LoginPage/Login";

// Super Admin Pages
//Super Admin -> Dashboard
import AdminDashboard from "../pages/SuperAdmin/DashboardPanal/Dashboard";
//Super Admin -> Faculty & Accounts
import FacultyAccounts from "../pages/SuperAdmin/Faculty&Accounts/Faculty&Accounts";
//Super Admin -> Attendance
import Attendance from "../pages/SuperAdmin/AttendancePage/Attendance";
//Super Admin -> Classes & Groups
import GroupsClasses from "../pages/SuperAdmin/Classes&Groups/Classes&Groups";
import ClassDetails from "../pages/SuperAdmin/Classes&Groups/ClassDetails/ClassDetails";
//Super Admin -> Reports & Analytics
import ReportsAnalytics from "../pages/SuperAdmin/Reports&Analytics/Reporst&analytics";
//Super Admin -> Students
import StudentHeader from "../pages/SuperAdmin/studentsPage/studentHeader/StudentHeader";
import StudentPage from "../pages/SuperAdmin/studentsPage/AllStudents/studentsPage";
//Super Admin -> Task & Assignments
import TaskHeader from "../pages/SuperAdmin/Task&Assignments/TaskHeader/TaskHeader";
//Super Admin -> Skill Reports
import AdminSkillReport from "../pages/SuperAdmin/SkillReports/AdminSkillReport";
//Super Admin -> Group Insights
import AdminGroupInsights from "../pages/SuperAdmin/GroupInsights/GroupInsights";
//Super Admin -> Question Bank (Practice Courses)
import CourseList from "../pages/SuperAdmin/QuestionBank/CourseList/CourseList";
import QuestionBank from "../pages/SuperAdmin/QuestionBank/QuestionBank/QuestionBank";
//Super Admin -> Venue Allocation
import VenueAllocation from "../pages/SuperAdmin/VenueAllocation/VenueAllocation";

// Faculty Pages
//Faculty -> Dashboard / Class & Group
import FacultyClassDetails from "../pages/Faculty/Class&Group/ClassDetails/ClassDetails";
//Faculty -> Students
import FacultyStudentsPage from "../pages/Faculty/studentsPage/AllStudents/studentsPage";
import FacultyStudentHeader from "../pages/Faculty/studentsPage/studentHeader/StudentHeader";
//Faculty -> Group Insights
import FacultyGroupInsights from "../pages/Faculty/GroupInsights copy/GroupInsights";
//Faculty -> Attendance
import FacultyAttendance from "../pages/SuperAdmin/AttendancePage/Attendance";
//Faculty -> Task & Assignments
import FacultyTaskHeader from "../pages/Faculty/Task&Assignments/TaskHeader/TaskHeader";
//Faculty -> Reports & Analytics
import FacultyReports from "../pages/SuperAdmin/Reports&Analytics/Reporst&analytics";
//Faculty -> Code Evaluation
import SubmissionsList from "../pages/Faculty/CodeEvaluation/SubmissionList/SubmissionsList";
import CodeEvaluation from "../pages/Faculty/CodeEvaluation/CodeReviewer/CodeEvaluation";

// Student Pages
// import StudentDashboard from "../pages/Student/Dashboard/StudentDashboard";
import MyClassRoom from "../pages/Student/MyClassRoom/MyClassRoom";
import StudentAttendance from "../pages/Student/StudentAttendance/Attendance";
import TasksAssignments from "../pages/Student/Tasks&Assignments/Tasks&Assignment";
import StudentRoadmap from "../pages/Student/RoadMap&Material/RoadMap&Material";
import StudentDashboard from "../pages/Student/Dashboard/StudentDashboard";
import CodePracticePage from "../pages/Student/CodePractice/CodePracticePage";

const AppNavigator = () => {
  const user = useAuthStore((s) => s.user);
  const isRestoring = useAuthStore((s) => s.isRestoring);

  // Show loading screen while restoring authentication
  if (isRestoring) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter basename="/pbl/">
      <Routes>
        {/* COMMON */}
        <Route path="/login" element={<Login />} />

        {/* Not logged in → only login */}
        {!user && <Route path="*" element={<Navigate to="/login" replace />} />}

        {/* ADMIN (role === "admin") */}
        {user?.role === "admin" && (
          <Route path="/" element={<SideTab />}>
            <Route index element={<AdminDashboard />} />
            <Route path="faculty" element={<FacultyAccounts />} />
            <Route path="classes">
              <Route index element={<GroupsClasses />} />
              <Route path=":venueId" element={<ClassDetails />} />
            </Route>
            <Route path="students">
              <Route index element={<StudentPage />} />
              <Route path=":studentId" element={<StudentHeader />} />
            </Route>
            <Route path="attendance" element={<Attendance />} />
            <Route path="tasks" element={<TaskHeader />} />
            <Route path="skill-reports" element={<AdminSkillReport />} />
            <Route path="group-insights" element={<AdminGroupInsights />} />
            <Route path="reports" element={<ReportsAnalytics />} />
            {/* Question Bank / Practice Courses */}
            <Route path="courses" element={<CourseList />} />
            <Route path="question-bank/:courseId" element={<QuestionBank />} />
            {/* Venue Allocation */}
            <Route path="venue-allocation" element={<VenueAllocation />} />
          </Route>
        )}

        {/* FACULTY (role === "faculty") */}
        {user?.role === "faculty" && (
          <Route path="/" element={<SideTab />}>
            <Route index element={<FacultyClassDetails />} />
            <Route path="classes" element={<FacultyClassDetails />} />
            <Route path="classes/:venueId" element={<FacultyClassDetails />} />
            <Route path="students">
              <Route index element={<FacultyStudentsPage />} />
              <Route path=":studentId" element={<FacultyStudentHeader />} />
            </Route>
            <Route path="attendance" element={<FacultyAttendance />} />
            <Route path="group-insights" element={<FacultyGroupInsights />} />
            <Route path="tasks" element={<FacultyTaskHeader />} />
            <Route path="reports" element={<FacultyReports />} />
            <Route path="submissions" element={<SubmissionsList />} />
            <Route path="submissions/:submissionId" element={<CodeEvaluation />} />
          </Route>
        )}

        {/* STUDENT (role === "student") */}
        {user?.role === "student" && (
          <Route path="/" element={<SideTab />}>
             <Route index element={<StudentDashboard />} /> 
             <Route path="classes" element={<MyClassRoom />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="roadmap" element={<StudentRoadmap />} />
            <Route path="tasks" element={<TasksAssignments />} /> 
            {/* P Skills Workspace - HTML+CSS and HTML+CSS+JS */}
            <Route path="code-practice" element={<CodePracticePage />} />
            <Route path="code-practice/:taskId" element={<CodePracticePage />} />
          </Route>
        )}

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppNavigator;
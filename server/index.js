import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import authRoutes from "./routes/auth.routes.js";
import facultyRoutes from "./routes/faculty.routes.js";
import studentRoutes from "./routes/student.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import groupsRoutes from "./routes/groups.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import roadmapRoutes from "./routes/roadmap.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import skillReportRoutes from "./routes/skillReportRoutes.js";
import skillCompletionRoutes from "./routes/skillCompletionRoutes.js";
import scheduleRoutes from "./routes/schedule.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import assignmentsRoutes from "./routes/assignments.routes.js";
import gradesRoutes from "./routes/grades.routes.js";
import skillOrderRoutes from "./routes/skillOrder.routes.js";
import questionBankRoutes from "./routes/questionBank.routes.js";
import studentQuestionBankRoutes from "./routes/studentQuestionBank.routes.js";
import facultyQuestionBankRoutes from "./routes/facultyQuestionBank.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
// import facultyDashboardRoutes from './routes/facultyDashboardRoutes.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true // Allow cookies
}));
app.use(cookieParser()); // Parse cookies

// Conditional body parser - skip COMPLETELY for file upload routes
app.use((req, res, next) => {
  const fullPath = req.originalUrl || req.url;
  
  // Skip ALL body parsing for file upload routes (multer handles it)
  if (fullPath.includes('/upload') || 
      fullPath.includes('/submit') ||
      fullPath.includes('/resources')) {
    // console.log(`[BODY PARSER] ✓ Bypassing ALL body parsers for: ${req.method} ${fullPath}`);
    return next();
  }
  
  // Apply body parsers for non-upload routes
  express.json({ limit: '100mb' })(req, res, (err) => {
    if (err) {
      console.error('[BODY PARSER] JSON parsing error:', err.message);
      return res.status(413).json({ success: false, message: 'Request entity too large' });
    }
    express.urlencoded({ extended: true, limit: '100mb' })(req, res, next);
  });
});

// Increase timeout for large file uploads (10 minutes for 5000+ records)
app.use((req, res, next) => {
  req.setTimeout(600000); // 10 minutes
  res.setTimeout(600000); // 10 minutes
  
  // Log request details for debugging
  if (req.originalUrl.includes('/upload')) {
    // console.log(`[SERVER] Upload request - Size: ${req.headers['content-length']} bytes, Type: ${req.headers['content-type']}`);
  }
  next();
});

// Optional API prefix (e.g. "/pbl" in production)
const API_PREFIX = process.env.API_PREFIX || '';

// Serve uploaded files statically with inline disposition for preview
app.use(`${API_PREFIX}/api/uploads`, (req, res, next) => {
  // Set Content-Disposition to inline for preview instead of download
  res.setHeader('Content-Disposition', 'inline');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use(`${API_PREFIX}/api/auth`, authRoutes);
app.use(`${API_PREFIX}/api/faculty`, facultyRoutes);
app.use(`${API_PREFIX}/api/students`, studentRoutes);
app.use(`${API_PREFIX}/api/attendance`, attendanceRoutes);
app.use(`${API_PREFIX}/api/groups`, groupsRoutes);
app.use(`${API_PREFIX}/api/tasks`, tasksRoutes);
 app.use(`${API_PREFIX}/api/roadmap`, roadmapRoutes);
app.use(`${API_PREFIX}/api/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/api/assignments`, assignmentsRoutes);
app.use(`${API_PREFIX}/api/grades`, gradesRoutes);
app.use(`${API_PREFIX}/api/skill-reports`, skillReportRoutes);
app.use(`${API_PREFIX}/api/skill-completion`, skillCompletionRoutes);
app.use(`${API_PREFIX}/api/schedule`, scheduleRoutes);
app.use(`${API_PREFIX}/api/activity`, activityRoutes);
app.use(`${API_PREFIX}/api/skill-order`, skillOrderRoutes);
app.use(`${API_PREFIX}/api/question-bank`, questionBankRoutes);
app.use(`${API_PREFIX}/api/student/question-bank`, studentQuestionBankRoutes);
app.use(`${API_PREFIX}/api/faculty/question-bank`, facultyQuestionBankRoutes);
app.use(`${API_PREFIX}/api/leaderboard`, leaderboardRoutes);
// app.use('/api/faculty/dashboard', facultyDashboardRoutes); 
// Cron job to update schedule daily at 8 PM
cron.schedule('0 20 * * *', () => {
    // console.log('Running daily schedule update at 8 PM...');
    updateDailySchedule();
}, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Adjust timezone as needed
});

// Function to update daily schedule
async function updateDailySchedule() {
    try {
        // console.log('Starting daily schedule update...');
        
        // Import db connection
        const { default: db } = await import('./config/db.js');
        
        // Get current date info
        const today = new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = days[today.getDay()];
        
        // console.log(`Daily update running for: ${currentDay} - ${today.toDateString()}`);
        
        // 1. Check active student enrollments
        const [activeStudents] = await db.execute(`
            SELECT COUNT(DISTINCT s.student_id) as active_students
            FROM students s
            INNER JOIN group_students gs ON s.student_id = gs.student_id
            WHERE gs.status = 'Active'
        `);
        
        // 2. Check active groups with schedules
        const [activeGroups] = await db.execute(`
            SELECT COUNT(DISTINCT g.group_id) as active_groups,
                   COUNT(DISTINCT CASE WHEN g.schedule_days IS NOT NULL THEN g.group_id END) as scheduled_groups
            FROM \`groups\` g
            WHERE g.status = 'Active'
        `);
        
        // 3. Log summary
        // console.log(`Schedule Update Summary:
        //     - Active Students: ${activeStudents[0].active_students}
        //     - Active Groups: ${activeGroups[0].active_groups}
        //     - Scheduled Groups: ${activeGroups[0].scheduled_groups}
        //     - Current Day: ${currentDay}
        // `);
        
        // 4. Optional: Clear any cached schedule data if you have caching
        // await clearScheduleCache();
        
        // 5. Optional: Update any schedule-related statistics
        // await updateScheduleStatistics();
        
        // console.log('Daily schedule update completed successfully');
        
    } catch (error) {
        console.error('Error in daily schedule update:', error);
    }
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
     console.log(`Server running on ${PORT}`);
     console.log('Daily schedule update cron job scheduled for 8 PM');
});
import db from '../config/db.js';

export const getStudentSchedule = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const dateParam = req.query.date ? new Date(req.query.date) : new Date();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[dateParam.getDay()];
        
        // console.log(`Fetching schedule for user ${userId} on ${dayName} (${dateParam.toDateString()})`);

        // 1. First check if student exists and is enrolled in any groups
        const [studentCheck] = await db.execute(`
            SELECT s.student_id, s.user_id, COUNT(gs.group_id) as enrolled_groups
            FROM students s
            LEFT JOIN group_students gs ON s.student_id = gs.student_id AND gs.status = 'Active'
            WHERE s.user_id = ?
            GROUP BY s.student_id, s.user_id
        `, [userId]);

        if (studentCheck.length === 0) {
            // console.log('Student not found for user_id:', userId);
            return res.json({ success: true, data: [], message: 'Student not found' });
        }

        const studentId = studentCheck[0].student_id;
        // console.log(`Student found - student_id: ${studentId}, enrolled_groups: ${studentCheck[0].enrolled_groups}`);

        // 2. Check what groups the student is in
        const [groupCheck] = await db.execute(`
            SELECT g.group_id, g.group_name, g.schedule_days, g.schedule_time, g.status as group_status, gs.status as enrollment_status
            FROM group_students gs
            JOIN \`groups\` g ON gs.group_id = g.group_id  
            WHERE gs.student_id = ?
        `, [studentId]);

        // console.log(`Student is in ${groupCheck.length} groups total:`);
        groupCheck.forEach(g => {
            // console.log(`- Group ${g.group_name}: days=${g.schedule_days}, time=${g.schedule_time}, group_status=${g.group_status}, enrollment_status=${g.enrollment_status}`);
        });

        // 2. Fetch schedule data
        const [rows] = await db.execute(`
            SELECT 
                g.group_id,
                g.group_name as subject,
                g.group_code as code,
                g.schedule_days,
                g.schedule_time,
                g.department,
                v.venue_name,
                v.location,
                u_fac.name as instructor_name
            FROM students s
            JOIN group_students gs ON s.student_id = gs.student_id
            JOIN \`groups\` g ON gs.group_id = g.group_id
            JOIN venue v ON g.venue_id = v.venue_id
            LEFT JOIN faculties f ON g.faculty_id = f.faculty_id
            LEFT JOIN users u_fac ON f.user_id = u_fac.user_id
            WHERE s.user_id = ? 
            AND gs.status = 'Active'
            AND g.status = 'Active'
        `, [userId]);

        // console.log(`Found ${rows.length} total active groups for student`);
        rows.forEach(row => {
            // console.log(`Group: ${row.subject}, Days: ${row.schedule_days}, Time: ${row.schedule_time}`);
        });

        // 2. Helper to parse time string (e.g., "09:00 AM") to minutes
        const getMinutes = (timeStr) => {
            if (!timeStr) return 0;
            // Handle formats like "09:00 AM - 10:30 AM" -> extract start time
            const startStr = timeStr.split('-')[0].trim(); 
            const [time, modifier] = startStr.split(' ');
            let [hours, minutes] = time.split(':');
            hours = parseInt(hours);
            minutes = parseInt(minutes);
            if (hours === 12 && modifier === 'AM') hours = 0;
            if (hours !== 12 && modifier === 'PM') hours += 12;
            return hours * 60 + minutes;
        };

        // 3. Define the 4 Standard Sessions (start times in minutes)
        // 8:45 AM = 525 mins
        // 10:40 AM = 640 mins
        // 1:30 PM = 810 mins
        // 3:25 PM = 925 mins
        const SLOT_1_START = 8 * 60 + 45;  // 8:45
        const SLOT_2_START = 10 * 60 + 40; // 10:40
        const SLOT_3_START = 13 * 60 + 30; // 1:30 PM
        const SLOT_4_START = 15 * 60 + 25; // 3:25 PM

        // 4. Process Data based on date logic
        const schedule = [];
        
        // Check if it's Sunday - always show no venue for Sundays
        if (dayName === 'Sunday') {
            // console.log(`Sunday detected - showing no venue allocated`);
            return res.json({ success: true, data: [], message: 'No venue allocated' });
        }
        
        // Get current date and time for comparison
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const requestedDate = new Date(dateParam.getFullYear(), dateParam.getMonth(), dateParam.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Check if it's past 8 PM today (20:00)
        const isPast8PM = now.getHours() >= 20;
        
        // console.log(`Date comparison:
        //     - Today: ${today.toDateString()}
        //     - Requested: ${requestedDate.toDateString()}
        //     - Tomorrow: ${tomorrow.toDateString()}
        //     - Current time: ${now.toTimeString().slice(0,8)}
        //     - Is past 8 PM: ${isPast8PM}
        // `);
        
        // Determine if we should show schedule
        let shouldShowSchedule = false;
        let reason = '';
        
        if (requestedDate < today) {
            // Previous days - always show
            shouldShowSchedule = true;
            reason = 'Previous day';
        } else if (requestedDate.getTime() === today.getTime()) {
            // Today - always show
            shouldShowSchedule = true;
            reason = 'Today';
        } else if (requestedDate.getTime() === tomorrow.getTime()) {
            // Tomorrow - only show if past 8 PM today
            shouldShowSchedule = isPast8PM;
            reason = isPast8PM ? 'Tomorrow (past 8 PM)' : 'Tomorrow (before 8 PM)';
        } else {
            // Future days beyond tomorrow - don't show
            shouldShowSchedule = false;
            reason = 'Future date';
        }
        
        // console.log(`Schedule decision: ${shouldShowSchedule ? 'SHOW' : 'HIDE'} - ${reason}`);
        
        if (shouldShowSchedule && rows.length > 0) {
            // Show the venue schedule with 4 sessions
            const item = rows[0];
            // console.log(`Creating 4 sessions for: ${item.subject} at ${item.venue_name}`);
            
            let type = 'Lecture';
            if (item.subject.toLowerCase().includes('lab')) type = 'Laboratory';
            
            const baseSessionData = {
                subject: item.subject,
                code: item.code,
                type: type,
                venue: `${item.venue_name} (${item.location})`,
                instructor: item.instructor_name || 'TBA',
                db_time: item.schedule_time
            };
            
            // Create 4 sessions for the day
            for (let slotId = 1; slotId <= 4; slotId++) {
                schedule.push({
                    id: `${item.group_id}-${slotId}`,
                    slotId: slotId,
                    ...baseSessionData
                });
            }
        } else if (!shouldShowSchedule && requestedDate > today) {
            // For future days, return empty with message
            // console.log(`No venue allocated for ${dayName} - future date`);
        } else if (rows.length === 0) {
            // No group enrollment
            // console.log(`No venue allocated for ${dayName} - not enrolled in any group`);
        }

        const responseMessage = shouldShowSchedule ? 
            (schedule.length > 0 ? 'Schedule loaded' : 'No venue allocated') :
            'No venue allocated';
            
        // console.log(`Final response: ${schedule.length} sessions, Message: ${responseMessage}`);
        res.json({ success: true, data: schedule, message: responseMessage });

    } catch (error) {
        console.error('Error fetching schedule:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};


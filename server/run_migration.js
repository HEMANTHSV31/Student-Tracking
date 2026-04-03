import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'GCN@6677',
            database: process.env.DB_NAME || 'studentactivity'
        });
        console.log('Connected to DB');
        
        try {
            await db.query(`ALTER TABLE assessment_year_courses ADD COLUMN course_type VARCHAR(50) NOT NULL DEFAULT 'CORE' AFTER course_code`);
            console.log('Added course_type column');
        } catch(e) {
            if(e.message.includes('Duplicate column')) {
                console.log('course_type column already exists');
            } else {
                throw e;
            }
        }
        
        await db.query(`UPDATE assessment_year_courses SET course_type = 'CORE' WHERE course_type IS NULL OR course_type = ''`);
        console.log('Updated existing rows');
        
        try {
            await db.query('ALTER TABLE assessment_year_courses ADD KEY idx_year_course_type (year, course_type)');
            console.log('Added index');
        } catch(e) {
            console.log('Index error/exists:', e.message);
        }
        
        console.log('Migration successful');
        await db.end();
    } catch(err) {
        console.error('Migration failed:', err.message);
    }
}

migrate();

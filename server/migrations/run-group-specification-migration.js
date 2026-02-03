import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting group_specification migration...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'student_tracking',
      multipleStatements: true
    });

    console.log('✅ Database connection established');

    // Read and execute the SQL file
    const sqlFile = join(__dirname, 'add_group_specification_to_venue.sql');
    const sql = readFileSync(sqlFile, 'utf8');
    
    console.log('📝 Executing migration SQL...');
    await connection.query(sql);
    
    console.log('✅ group_specification column added successfully!');
    console.log('✅ Index created on group_specification');
    
    // Verify the column was added
    const [columns] = await connection.query(`
      SHOW COLUMNS FROM venue LIKE 'group_specification'
    `);
    
    if (columns.length > 0) {
      console.log('✅ Migration verified - column exists in database');
      console.log('Column details:', columns[0]);
    } else {
      console.error('❌ Migration verification failed - column not found');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

runMigration();

// Migration runner for skill_order venue and year associations
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'student_tracker',
      multipleStatements: true
    });

    console.log('✓ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, 'add_skill_order_venue_year_associations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('✓ Migration file loaded');
    console.log('\nRunning migration...\n');

    // Execute migration
    await connection.query(migrationSQL);

    console.log('✓ Migration completed successfully!');
    console.log('\nCreated:');
    console.log('  - skill_order_venues table');
    console.log('  - skill_order_years table');
    console.log('  - apply_to_all_venues column');
    console.log('  - apply_to_all_years column');
    console.log('\nYou can now create skills with venue and year targeting!');

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✓ Database connection closed');
    }
  }
};

runMigration();

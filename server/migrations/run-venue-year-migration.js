import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('Connected to database');
  console.log('Checking if year column exists in venue table...');

  try {
    // Check if column already exists
    const [columns] = await connection.query('SHOW COLUMNS FROM venue LIKE "year"');
    
    if (columns.length > 0) {
      console.log('✓ Year column already exists in venue table');
    } else {
      console.log('Adding year column to venue table...');
      
      // Add year column
      await connection.query(`
        ALTER TABLE venue 
        ADD COLUMN year INT DEFAULT NULL COMMENT 'Academic year (1, 2, 3, or 4)' AFTER location
      `);
      console.log('✓ Year column added successfully');
      
      // Add index
      try {
        await connection.query('CREATE INDEX idx_venue_year ON venue(year)');
        console.log('✓ Index idx_venue_year created successfully');
      } catch (indexError) {
        if (indexError.code === 'ER_DUP_KEYNAME') {
          console.log('✓ Index idx_venue_year already exists');
        } else {
          throw indexError;
        }
      }
    }
    
    // Verify by showing current table structure
    const [cols] = await connection.query('SHOW COLUMNS FROM venue');
    console.log('\nCurrent venue table structure:');
    cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
    
    console.log('\n✓ Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
import db from './config/db.js';

async function applySoftDeleteMigration() {
  try {
    console.log('Applying soft delete migration to tasks table...');
    
    // Check if columns already exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tasks' 
      AND TABLE_SCHEMA = DATABASE() 
      AND COLUMN_NAME IN ('deleted', 'deleted_at')
    `);
    
    if (columns.length === 0) {
      // Add soft delete columns
      await db.execute('ALTER TABLE tasks ADD COLUMN deleted TINYINT(1) DEFAULT 0');
      await db.execute('ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP NULL');
      console.log('Soft delete columns added successfully!');
    } else {
      console.log('Soft delete columns already exist.');
    }
    
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applySoftDeleteMigration();
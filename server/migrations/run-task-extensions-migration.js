// Migration script to create task_extensions table
import db from '../config/db.js';

async function createTaskExtensionsTable() {
  try {
    console.log('Creating task_extensions table...');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS task_extensions (
        extension_id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        student_id INT NOT NULL,
        original_due_date DATETIME NOT NULL,
        extended_due_date DATETIME NOT NULL,
        extension_days INT NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
        
        UNIQUE KEY unique_task_student (task_id, student_id),
        
        INDEX idx_task_id (task_id),
        INDEX idx_student_id (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await db.query(createTableSQL);
    
    console.log('✅ task_extensions table created successfully!');
    console.log('Migration completed.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating task_extensions table:', error);
    process.exit(1);
  }
}

createTaskExtensionsTable();

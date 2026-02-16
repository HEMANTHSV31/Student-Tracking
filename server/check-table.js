import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

try {
  // Check code_submissions table
  const [tables] = await connection.query("SHOW TABLES LIKE 'code_submissions'");
  console.log('code_submissions exists:', tables.length > 0);
  
  if (tables.length > 0) {
    const [columns] = await connection.query('DESCRIBE code_submissions');
    console.log('code_submissions Columns:');
    columns.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type}`);
    });
  }

  console.log('\n---\n');

  // Check for web_code_submissions table
  const [webTables] = await connection.query("SHOW TABLES LIKE 'web_code_submissions'");
  console.log('web_code_submissions exists:', webTables.length > 0);
  
  if (webTables.length > 0) {
    const [webColumns] = await connection.query('DESCRIBE web_code_submissions');
    console.log('web_code_submissions Columns:');
    webColumns.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type}`);
    });
  }

  console.log('\n---\n');

  // Check student_submissions table
  const [studentTables] = await connection.query("SHOW TABLES LIKE 'student_submissions'");
  console.log('student_submissions exists:', studentTables.length > 0);
  
  if (studentTables.length > 0) {
    const [studentColumns] = await connection.query('DESCRIBE student_submissions');
    console.log('student_submissions Columns:');
    studentColumns.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type}`);
    });
  }

} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}

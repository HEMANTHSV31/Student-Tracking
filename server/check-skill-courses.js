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
  const [columns] = await connection.query("DESCRIBE skill_courses");
  console.log('skill_courses columns:');
  columns.forEach(col => {
    console.log(`  ${col.Field} - ${col.Type}`);
  });

} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}

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
  const [columns] = await connection.query("SHOW COLUMNS FROM task_submissions WHERE Field = 'status'");
  console.log('task_submissions status column:');
  console.log(JSON.stringify(columns[0], null, 2));

} catch (error) {
  console.error('Error:', error);
} finally {
  await connection.end();
}

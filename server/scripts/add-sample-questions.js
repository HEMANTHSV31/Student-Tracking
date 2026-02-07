/**
 * Script to add sample questions to the database for testing
 * Run: node server/scripts/add-sample-questions.js
 */

import db from '../config/db.js';

async function addSampleQuestions() {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('🚀 Adding sample questions...\n');
    
    // 1. Add HTML/CSS Course
    console.log('📚 Adding HTML/CSS course...');
    const [htmlCourse] = await connection.query(
      'INSERT INTO skill_courses (skill_name, description, status) VALUES (?, ?, ?)',
      ['HTML/CSS', 'HTML and CSS Fundamentals', 'Active']
    );
    const htmlCourseId = htmlCourse.insertId;
    console.log(`✅ HTML/CSS course added (ID: ${htmlCourseId})\n`);
    
    // 2. Add JavaScript Course
    console.log('📚 Adding JavaScript course...');
    const [jsCourse] = await connection.query(
      'INSERT INTO skill_courses (skill_name, description, status) VALUES (?, ?, ?)',
      ['JavaScript', 'JavaScript Programming Basics', 'Active']
    );
    const jsCourseId = jsCourse.insertId;
    console.log(`✅ JavaScript course added (ID: ${jsCourseId})\n`);
    
    // 3. Add MCQ Questions for HTML/CSS
    console.log('❓ Adding MCQ questions for HTML/CSS...');
    await connection.query(`
      INSERT INTO question_bank (course_id, question_type, question_text, option_1, option_2, option_3, option_4, correct_option, explanation, difficulty, status, created_at)
      VALUES 
      (?, 'MCQ', 'What does HTML stand for?', 
        'Hyper Text Markup Language', 
        'High Tech Modern Language', 
        'Home Tool Markup Language', 
        'Hyperlinks and Text Markup Language', 
        1, 'HTML stands for Hyper Text Markup Language', 'Easy', 'Active', NOW()),
      
      (?, 'MCQ', 'Which HTML tag is used to define an internal style sheet?', 
        '<script>', 
        '<style>', 
        '<css>', 
        '<link>', 
        2, 'The <style> tag is used to define internal CSS', 'Easy', 'Active', NOW()),
      
      (?, 'MCQ', 'Which property is used to change the background color in CSS?', 
        'color', 
        'bgcolor', 
        'background-color', 
        'bg-color', 
        3, 'The background-color property changes the background', 'Easy', 'Active', NOW()),
      
      (?, 'MCQ', 'How do you select an element with id "demo" in CSS?', 
        '.demo', 
        '#demo', 
        'demo', 
        '*demo', 
        2, 'Use # symbol to select elements by ID', 'Medium', 'Active', NOW()),
      
      (?, 'MCQ', 'Which CSS property controls the text size?', 
        'font-size', 
        'text-size', 
        'text-style', 
        'font-style', 
        1, 'font-size property controls text size', 'Easy', 'Active', NOW())
    `, [htmlCourseId, htmlCourseId, htmlCourseId, htmlCourseId, htmlCourseId]);
    console.log('✅ 5 MCQ questions added for HTML/CSS\n');
    
    // 4. Add Coding Questions for HTML/CSS
    console.log('💻 Adding Coding questions for HTML/CSS...');
    await connection.query(`
      INSERT INTO question_bank (course_id, question_type, question_text, starter_code, test_cases, expected_output, difficulty, status, created_at)
      VALUES 
      (?, 'Coding', 
        'Create a simple HTML page with a heading and paragraph',
        '<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <!-- Add your code here -->\n</body>\n</html>',
        '[{"input":"","expected_output":"HTML with h1 and p tags"}]',
        'HTML page with heading and paragraph',
        'Easy', 'Active', NOW()),
      
      (?, 'Coding',
        'Create a CSS class that centers text and makes it blue',
        '.centered-blue {\n  /* Add CSS properties here */\n}',
        '[{"input":"","expected_output":"text-align: center and color: blue"}]',
        'CSS with centering and blue color',
        'Easy', 'Active', NOW())
    `, [htmlCourseId, htmlCourseId]);
    console.log('✅ 2 Coding questions added for HTML/CSS\n');
    
    // 5. Add MCQ Questions for JavaScript
    console.log('❓ Adding MCQ questions for JavaScript...');
    await connection.query(`
      INSERT INTO question_bank (course_id, question_type, question_text, option_1, option_2, option_3, option_4, correct_option, explanation, difficulty, status, created_at)
      VALUES 
      (?, 'MCQ', 'Which keyword is used to declare a variable in JavaScript?', 
        'var', 
        'int', 
        'string', 
        'variable', 
        1, 'var, let, and const are used to declare variables', 'Easy', 'Active', NOW()),
      
      (?, 'MCQ', 'What is the correct way to write a JavaScript array?', 
        'var colors = "red", "green", "blue"', 
        'var colors = (1:"red", 2:"green", 3:"blue")', 
        'var colors = ["red", "green", "blue"]', 
        'var colors = 1 = ("red"), 2 = ("green"), 3 = ("blue")', 
        3, 'Arrays use square brackets with comma-separated values', 'Easy', 'Active', NOW()),
      
      (?, 'MCQ', 'How do you call a function named "myFunction"?', 
        'call myFunction()', 
        'myFunction()', 
        'call function myFunction', 
        'Call.myFunction()', 
        2, 'Functions are called using functionName()', 'Easy', 'Active', NOW()),
      
      (?, 'MCQ', 'What will "typeof null" return?', 
        'null', 
        'undefined', 
        'object', 
        'string', 
        3, 'typeof null returns "object" - this is a known quirk', 'Medium', 'Active', NOW())
    `, [jsCourseId, jsCourseId, jsCourseId, jsCourseId]);
    console.log('✅ 4 MCQ questions added for JavaScript\n');
    
    // 6. Add Coding Questions for JavaScript
    console.log('💻 Adding Coding questions for JavaScript...');
    await connection.query(`
      INSERT INTO question_bank (course_id, question_type, question_text, starter_code, test_cases, expected_output, difficulty, status, created_at)
      VALUES 
      (?, 'Coding',
        'Write a function that adds two numbers',
        'function add(a, b) {\n  // Write your code here\n}',
        '[{"input":[2, 3],"expected_output":5},{"input":[10, 20],"expected_output":30}]',
        '5, 30',
        'Easy', 'Active', NOW()),
      
      (?, 'Coding',
        'Write a function that checks if a number is even',
        'function isEven(num) {\n  // Write your code here\n}',
        '[{"input":4,"expected_output":true},{"input":7,"expected_output":false}]',
        'true, false',
        'Easy', 'Active', NOW()),
      
      (?, 'Coding',
        'Write a function that returns the length of a string',
        'function getLength(str) {\n  // Write your code here\n}',
        '[{"input":"hello","expected_output":5},{"input":"world","expected_output":5}]',
        '5, 5',
        'Easy', 'Active', NOW())
    `, [jsCourseId, jsCourseId, jsCourseId]);
    console.log('✅ 3 Coding questions added for JavaScript\n');
    
    await connection.commit();
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Sample questions added successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log(`   • 2 Courses added`);
    console.log(`   • HTML/CSS: 5 MCQ + 2 Coding = 7 questions`);
    console.log(`   • JavaScript: 4 MCQ + 3 Coding = 7 questions`);
    console.log(`   • Total: 14 questions`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🎯 Next Steps:');
    console.log('1. Login as Faculty');
    console.log('2. Go to Tasks & Assignments');
    console.log('3. Create a practice task:');
    console.log('   - Task Type: Practice Question');
    console.log('   - Question Type: MCQ or Coding');
    console.log('   - Skill Filter: HTML/CSS or JavaScript');
    console.log('4. Login as Student and take the test!\n');
    
    // Show course IDs for reference
    console.log('📝 Course IDs for reference:');
    console.log(`   • HTML/CSS: ${htmlCourseId}`);
    console.log(`   • JavaScript: ${jsCourseId}\n`);
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error adding questions:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

// Run the script
addSampleQuestions().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

import db from './config/db.js';

async function checkStudent() {
  try {
    // Get student basic info
    const [students] = await db.query(`
      SELECT u.ID, u.name, u.email, s.student_id, s.assigned_faculty_id
      FROM users u
      INNER JOIN students s ON u.user_id = s.user_id
      WHERE u.ID = '3105'
    `);

    if (students.length === 0) {
      console.log('❌ Student 3105 not found');
      process.exit(0);
    }

    const student = students[0];
    console.log('\n👤 Student Information:');
    console.log(`ID: ${student.ID}`);
    console.log(`Name: ${student.name}`);
    console.log(`Email: ${student.email}`);
    console.log(`Student ID: ${student.student_id}`);
    console.log(`Assigned Faculty ID: ${student.assigned_faculty_id || 'None'}`);

    // Get group assignment
    const [groups] = await db.query(`
      SELECT gs.id, gs.group_id, gs.status, g.group_name, g.venue_id, v.venue_name, v.assigned_faculty_id as venue_faculty_id
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      INNER JOIN venue v ON g.venue_id = v.venue_id
      WHERE gs.student_id = ? 
      ORDER BY gs.id DESC
    `, [student.student_id]);

    console.log(`\n🏢 Group Assignments (${groups.length}):`);
    groups.forEach((g, i) => {
      console.log(`\n--- Assignment ${i + 1} ---`);
      console.log(`Group ID: ${g.group_id}`);
      console.log(`Group Name: ${g.group_name}`);
      console.log(`Status: ${g.status}`);
      console.log(`Venue ID: ${g.venue_id}`);
      console.log(`Venue Name: ${g.venue_name}`);
      console.log(`Venue Faculty ID: ${g.venue_faculty_id || 'None'}`);
    });

    const activeGroup = groups.find(g => g.status === 'Active');
    if (activeGroup) {
      console.log(`\n✅ Currently Active in: ${activeGroup.venue_name} (Venue ID: ${activeGroup.venue_id})`);
    } else {
      console.log('\n⚠️  No active group assignment');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudent();

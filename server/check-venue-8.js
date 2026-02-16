import db from './config/db.js';

async function checkVenue8() {
  try {
    console.log('🔍 Checking Venue ID 8...\n');
    
    // Get venue details
    const [venue] = await db.query(`
      SELECT venue_id, venue_name, deleted_at, assigned_faculty_id
      FROM venue 
      WHERE venue_id = 8
    `);
    
    if (venue.length === 0) {
      console.log('❌ Venue 8 not found');
      process.exit(0);
    }
    
    console.log('📍 Venue Details:');
    console.log(venue[0]);
    console.log('');
    
    // Check groups
    const [groups] = await db.query(`
      SELECT group_id, group_name, faculty_id 
      FROM \`groups\` 
      WHERE venue_id = 8
    `);
    
    console.log(`👥 Groups on Venue 8: ${groups.length}`);
    if (groups.length > 0) {
      console.table(groups);
    }
    console.log('');
    
    // Check students in groups
    const [students] = await db.query(`
      SELECT COUNT(*) as student_count
      FROM group_students gs
      INNER JOIN \`groups\` g ON gs.group_id = g.group_id
      WHERE g.venue_id = 8
    `);
    
    console.log(`🎓 Students in Groups on Venue 8: ${students[0].student_count}`);
    console.log('');
    
    console.log('\n💡 Solution:');
    if (groups.length > 0 || students[0].student_count > 0) {
      console.log('Cannot hard DELETE venue 8 because it has associated data.');
      console.log(`\n📊 Data to handle:`);
      console.log(`   - ${groups.length} group(s)`);
      console.log(`   - ${students[0].student_count} student(s)`);
      console.log('\n✅ RECOMMENDED: Venue is already SOFT DELETED (deleted_at set)');
      console.log('   This is the correct approach - it preserves historical data.');
      console.log('\n⚠️  Alternative Options:');
      console.log('   1. Reassign groups to another venue first');
      console.log('   2. Delete the group (will cascade to group_students)');
    } else {
      console.log('Venue 8 has groups but no students - can delete group first.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkVenue8();

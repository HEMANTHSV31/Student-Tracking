import db from './config/db.js';

async function checkDuplicateVenues() {
  try {
    // Find all venues with "Learning Center - I Floor" name
    const [venues] = await db.query(`
      SELECT 
        v.venue_id,
        v.venue_name,
        v.capacity,
        v.assigned_faculty_id,
        v.created_at,
        COUNT(DISTINCT g.group_id) as active_groups_count,
        COUNT(DISTINCT gs.student_id) as student_count,
        GROUP_CONCAT(DISTINCT g.group_name) as group_names
      FROM venue v
      LEFT JOIN \`groups\` g ON v.venue_id = g.venue_id AND g.status = 'Active'
      LEFT JOIN group_students gs ON g.group_id = gs.group_id AND gs.status = 'Active'
      WHERE v.venue_name = 'Learning Center - I Floor' 
        AND v.deleted_at IS NULL
      GROUP BY v.venue_id
      ORDER BY v.venue_id
    `);

    console.log('\n🏢 Duplicate Venues Found:\n');
    venues.forEach((venue, index) => {
      console.log(`\n--- Venue ${index + 1} ---`);
      console.log(`Venue ID: ${venue.venue_id}`);
      console.log(`Venue Name: ${venue.venue_name}`);
      console.log(`Capacity: ${venue.capacity}`);
      console.log(`Active Groups: ${venue.active_groups_count}`);
      console.log(`Group Names: ${venue.group_names || 'None'}`);
      console.log(`Students Enrolled: ${venue.student_count}`);
      console.log(`Created At: ${venue.created_at}`);
      console.log(`Faculty ID: ${venue.assigned_faculty_id || 'Not assigned'}`);
      
      if (venue.active_groups_count === 0 && venue.student_count === 0) {
        console.log('⚠️  **This venue is EMPTY and can be safely deleted**');
      } else {
        console.log('✅ This venue is ACTIVE and has data');
      }
    });

    console.log('\n\n📋 Recommendation:');
    const emptyVenue = venues.find(v => v.active_groups_count === 0 && v.student_count === 0);
    if (emptyVenue) {
      console.log(`Delete Venue ID ${emptyVenue.venue_id} - it has no groups or students`);
      console.log(`\nSQL to delete:`);
      console.log(`DELETE FROM venue WHERE venue_id = ${emptyVenue.venue_id};`);
      console.log(`-- OR soft delete:`);
      console.log(`UPDATE venue SET deleted_at = NOW() WHERE venue_id = ${emptyVenue.venue_id};`);
    } else {
      console.log('Both venues have data. Consider renaming one to make them unique.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDuplicateVenues();

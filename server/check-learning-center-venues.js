import db from './config/db.js';

async function checkVenues() {
  const connection = await db.getConnection();
  
  try {
    console.log('=== LEARNING CENTER VENUES ===\n');
    
    const [venues] = await connection.query(`
      SELECT 
        venue_id, 
        venue_name,
        CHAR_LENGTH(venue_name) as name_length,
        CHAR_LENGTH(TRIM(venue_name)) as trimmed_length,
        HEX(venue_name) as hex_representation,
        deleted_at,
        status,
        assigned_faculty_id
      FROM venue 
      WHERE venue_name LIKE '%Learning Center%I Floor%'
      ORDER BY venue_id
    `);
    
    console.log(`Found ${venues.length} venue(s):\n`);
    
    venues.forEach(venue => {
      console.log(`Venue ID: ${venue.venue_id}`);
      console.log(`Name: "${venue.venue_name}"`);
      console.log(`Length: ${venue.name_length}, Trimmed: ${venue.trimmed_length}`);
      console.log(`Hex: ${venue.hex_representation}`);
      console.log(`Deleted: ${venue.deleted_at ? 'YES (' + venue.deleted_at + ')' : 'NO'}`);
      console.log(`Status: ${venue.status}`);
      console.log(`Faculty ID: ${venue.assigned_faculty_id || 'None'}`);
      
      // Show each character
      console.log('Character breakdown:');
      for (let i = 0; i < venue.venue_name.length; i++) {
        const char = venue.venue_name[i];
        const code = venue.venue_name.charCodeAt(i);
        console.log(`  [${i}] '${char}' (code: ${code}${code === 32 ? ' - SPACE' : code === 45 ? ' - HYPHEN' : ''})`);
      }
      console.log('\n' + '='.repeat(60) + '\n');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkVenues();

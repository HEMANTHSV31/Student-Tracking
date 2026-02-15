// Helper function to update submission venues when student changes venue
// Add this to tasks.controller.js or create a separate helper file

/**
 * Update current_venue_id for ungraded submissions when student changes venue
 * This ensures faculty in the new venue can see pending submissions
 * 
 * @param {number} studentId - The student's ID
 * @param {number} newVenueId - The new venue ID
 */
export const updateSubmissionVenues = async (studentId, newVenueId) => {
  const connection = await db.getConnection();
  try {
    console.log(`[UPDATE VENUES] Updating submission venues for student ${studentId} to venue ${newVenueId}`);
    
    // Update web code submissions that are NOT graded yet
    await connection.execute(
      `UPDATE web_code_submissions 
       SET current_venue_id = ? 
       WHERE student_id = ? 
         AND status IN ('Pending Review', 'Under Review')`,
      [newVenueId, studentId]
    );
    
    // Update regular task submissions that are NOT graded yet  
    await connection.execute(
      `UPDATE task_submissions 
       SET current_venue_id = ? 
       WHERE student_id = ? 
         AND status IN ('Pending Review', 'Under Review')`,
      [newVenueId, studentId]
    );
    
    console.log(`[UPDATE VENUES] Successfully updated submission venues for student ${studentId}`);
  } catch (error) {
    console.error('[UPDATE VENUES] Error updating submission venues:', error);
    // Don't throw - this is a non-critical operation
  } finally {
    connection.release();
  }
};

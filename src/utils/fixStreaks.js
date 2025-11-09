/**
 * Utility script to retroactively fix streaks and badges for completed assignments
 * Run this if assignments were completed directly in the database without going through the API
 */
import { prisma } from '../server.js';
import { updateStreaks, checkBadges } from './gamification.js';
import { logActivity } from './activityLogger.js';

export const fixStreaksForCompletedAssignments = async (userId) => {
  try {
    console.log(`🔧 Fixing streaks and badges for user ${userId}...`);

    // Find all completed assignments that don't have activity logs
    const completedAssignments = await prisma.assignment.findMany({
      where: {
        userId,
        status: 'completed',
      },
    });

    console.log(`Found ${completedAssignments.length} completed assignments`);

    for (const assignment of completedAssignments) {
      // Check if activity log exists
      const existingLog = await prisma.activityLog.findFirst({
        where: {
          userId,
          action: 'assignment_completed',
          entityType: 'assignment',
          entityId: assignment.id,
        },
      });

      if (!existingLog) {
        console.log(`  📝 Creating activity log for assignment: ${assignment.title}`);
        await logActivity(userId, 'assignment_completed', 'assignment', assignment.id);
      }

      // Update streaks (both types)
      console.log(`  🔥 Updating streaks for assignment: ${assignment.title}`);
      await updateStreaks(userId, 'assignment_completion');
      await updateStreaks(userId, 'daily_study');

      // Check badges
      console.log(`  🏅 Checking badges for assignment: ${assignment.title}`);
      await checkBadges(userId, 'assignment_completed');
    }

    console.log('✅ Done fixing streaks and badges!');
    return { fixed: completedAssignments.length };
  } catch (error) {
    console.error('❌ Error fixing streaks:', error);
    throw error;
  }
};

// This function can be called via the API endpoint: POST /api/fix/streaks


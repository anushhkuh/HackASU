import { prisma } from '../server.js';

/**
 * Update or create streak for user
 */
export const updateStreaks = async (userId, type) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const streak = await prisma.streak.findUnique({
      where: {
        userId_type: {
          userId,
          type,
        },
      },
    });

    if (streak) {
      const lastUpdated = new Date(streak.lastUpdated);
      lastUpdated.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today - lastUpdated) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Already updated today
        return streak;
      } else if (daysDiff === 1) {
        // Consecutive day
        const newCurrent = streak.current + 1;
        await prisma.streak.update({
          where: {
            userId_type: {
              userId,
              type,
            },
          },
          data: {
            current: newCurrent,
            longest: Math.max(streak.longest, newCurrent),
            lastUpdated: today,
          },
        });
      } else {
        // Streak broken, reset
        await prisma.streak.update({
          where: {
            userId_type: {
              userId,
              type,
            },
          },
          data: {
            current: 1,
            lastUpdated: today,
          },
        });
      }
    } else {
      // Create new streak
      await prisma.streak.create({
        data: {
          userId,
          type,
          current: 1,
          longest: 1,
          lastUpdated: today,
        },
      });
    }
  } catch (error) {
    console.error('Error updating streak:', error);
  }
};

/**
 * Check and award badges based on achievements
 */
export const checkBadges = async (userId, action, metadata = {}) => {
  try {
    const badges = [];

    // Check for various badge conditions
    if (action === 'assignment_completed') {
      const completedCount = await prisma.assignment.count({
        where: {
          userId,
          status: 'completed',
        },
      });

      // First assignment badge
      if (completedCount === 1) {
        badges.push('first_assignment');
      }

      // 10 assignments badge
      if (completedCount === 10) {
        badges.push('ten_assignments');
      }

      // 50 assignments badge
      if (completedCount === 50) {
        badges.push('fifty_assignments');
      }
    }

    if (action === 'session_completed') {
      const sessionCount = await prisma.studySession.count({
        where: {
          userId,
          completed: true,
        },
      });

      // First session badge
      if (sessionCount === 1) {
        badges.push('first_session');
      }

      // 10 hours of study (600 minutes)
      const totalMinutes = await prisma.studySession.aggregate({
        where: {
          userId,
          completed: true,
        },
        _sum: {
          duration: true,
        },
      });

      if (totalMinutes._sum.duration && totalMinutes._sum.duration >= 600) {
        badges.push('ten_hours_study');
      }
    }

    // Streak badges
    const streaks = await prisma.streak.findMany({
      where: { userId },
    });

    for (const streak of streaks) {
      if (streak.current === 7) {
        badges.push('week_streak');
      }
      if (streak.current === 30) {
        badges.push('month_streak');
      }
      if (streak.longest === 100) {
        badges.push('century_streak');
      }
    }

    // Award badges
    for (const badgeName of badges) {
      const badge = await prisma.badge.findUnique({
        where: { name: badgeName },
      });

      if (badge) {
        // Check if user already has this badge
        const existing = await prisma.userBadge.findUnique({
          where: {
            userId_badgeId: {
              userId,
              badgeId: badge.id,
            },
          },
        });

        if (!existing) {
          await prisma.userBadge.create({
            data: {
              userId,
              badgeId: badge.id,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking badges:', error);
  }
};


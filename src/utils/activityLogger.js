import { prisma } from '../server.js';

/**
 * Log user activity for ML/recommendations
 */
export const logActivity = async (userId, action, entityType = null, entityId = null, metadata = {}) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging shouldn't break the main flow
  }
};


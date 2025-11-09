/**
 * Route to fix streaks and badges retroactively
 * Useful when assignments were completed directly in the database
 */
import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { fixStreaksForCompletedAssignments } from '../utils/fixStreaks.js';

const router = express.Router();

// Fix streaks and badges for current user
router.post('/streaks', authenticate, async (req, res, next) => {
  try {
    const result = await fixStreaksForCompletedAssignments(req.user.id);
    res.json({
      message: 'Streaks and badges fixed successfully',
      fixed: result.fixed,
    });
  } catch (error) {
    next(error);
  }
});

export default router;


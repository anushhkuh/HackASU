import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getRecommendations } from '../utils/recommendations.js';

const router = express.Router();

// Get personalized recommendations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const recommendations = await getRecommendations(req.user.id);
    res.json({ recommendations });
  } catch (error) {
    next(error);
  }
});

export default router;


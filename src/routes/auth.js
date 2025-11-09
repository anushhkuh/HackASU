import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../server.js';
import { authenticate } from '../middleware/auth.js';
import { exchangeCanvasCode, CanvasAPI, getCanvasAuthUrl } from '../utils/canvas.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Log activity
    await logActivity(user.id, 'user_registered', 'user', user.id);

    // Generate JWT token for immediate login
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token, message: 'User created successfully' });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log activity
    await logActivity(user.id, 'user_logged_in', 'user', user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        hasCanvasConnection: !!user.canvasToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        canvasUserId: true,
        canvasInstanceUrl: true,
        hasCanvasConnection: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Canvas OAuth - Initiate
router.get('/canvas/authorize', authenticate, (req, res) => {
  const state = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const authUrl = getCanvasAuthUrl(state);
  res.json({ authUrl, state });
});

// Canvas OAuth - Callback
router.post('/canvas/callback', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange code for token
    const tokenData = await exchangeCanvasCode(code);

    // Get user info from Canvas
    const canvasAPI = new CanvasAPI(tokenData.access_token, process.env.CANVAS_BASE_URL);
    const canvasUser = await canvasAPI.getCurrentUser();

    // Update user with Canvas credentials
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        canvasToken: tokenData.access_token,
        canvasUserId: canvasUser.id.toString(),
        canvasInstanceUrl: process.env.CANVAS_BASE_URL,
      },
      select: {
        id: true,
        email: true,
        canvasUserId: true,
      },
    });

    // Log activity
    await logActivity(user.id, 'canvas_connected', 'user', user.id);

    res.json({
      message: 'Canvas connected successfully',
      canvasUserId: canvasUser.id,
    });
  } catch (error) {
    next(error);
  }
});

// Disconnect Canvas
router.post('/canvas/disconnect', authenticate, async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        canvasToken: null,
        canvasUserId: null,
        canvasInstanceUrl: null,
      },
    });

    await logActivity(req.user.id, 'canvas_disconnected', 'user', req.user.id);

    res.json({ message: 'Canvas disconnected successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;


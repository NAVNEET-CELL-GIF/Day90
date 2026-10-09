const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authGuard } = require('../middleware/auth');
const Routine = require('../models/Routine');
const CheckIn = require('../models/CheckIn');
const WeeklyLog = require('../models/WeeklyLog');
const { computeAdherence, computeRatingTrend } = require('../services/verdictService');
const { getWeeklyReflection, askRoutineQuestion } = require('../services/groqService');
const { AI_RATE_LIMIT_WINDOW_MS, AI_RATE_LIMIT_MAX } = require('../config/thresholds');

// Per-user AI rate limiting
const aiLimiter = rateLimit({
  windowMs: AI_RATE_LIMIT_WINDOW_MS,
  max: AI_RATE_LIMIT_MAX,
  keyGenerator: (req) => req.userId || req.ip,
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many AI requests. Please wait an hour and try again.' },
});

router.use(authGuard);

// POST /api/ai/ask — scoped Q&A
router.post('/ask', aiLimiter, async (req, res, next) => {
  try {
    const { question, routineId } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length < 3) {
      return res.status(400).json({ error: 'Please enter a question.' });
    }
    if (question.trim().length > 500) {
      return res.status(400).json({ error: 'Question too long. Please keep it under 500 characters.' });
    }

    const routine = await Routine.findOne({ _id: routineId, userId: req.userId });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const checkIns = await CheckIn.find({ routineId: routine._id }).select('date');
    const adherenceData = computeAdherence(checkIns.map((c) => c.date), routine.startDate, todayStr);
    const weeklyLogs = await WeeklyLog.find({ routineId: routine._id }).select('weekNumber');

    const result = await askRoutineQuestion({
      question: question.trim(),
      category: routine.category,
      goal: routine.goal,
      weekNumber: weeklyLogs.length,
      adherence: adherenceData.adherence,
    });

    res.json({ answer: result.text, fromFallback: result.fromFallback });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/weekly-reflection
router.post('/weekly-reflection', aiLimiter, async (req, res, next) => {
  try {
    const { routineId, weekNumber, rating, notes } = req.body;

    if (!routineId || !weekNumber || !rating) {
      return res.status(400).json({ error: 'routineId, weekNumber, and rating are required.' });
    }

    const routine = await Routine.findOne({ _id: routineId, userId: req.userId });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const checkIns = await CheckIn.find({ routineId: routine._id }).select('date');
    const adherenceData = computeAdherence(checkIns.map((c) => c.date), routine.startDate, todayStr);

    const result = await getWeeklyReflection({
      userId: req.userId,
      routineId: routine._id,
      weekNumber,
      rating,
      adherence: adherenceData.adherence,
      notes: Array.isArray(notes) ? notes : [],
    });

    res.json({ reflection: result.text, fromCache: result.fromCache, fromFallback: result.fromFallback });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

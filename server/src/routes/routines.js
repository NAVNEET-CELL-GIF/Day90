const express = require('express');
const router = express.Router();
const { authGuard } = require('../middleware/auth');
const Routine = require('../models/Routine');
const CheckIn = require('../models/CheckIn');
const WeeklyLog = require('../models/WeeklyLog');
const { CATEGORIES, GOALS, STATUS } = require('../config/thresholds');
const {
  getDaysElapsed,
  computeAdherence,
  computeRatingTrend,
  computeVerdict,
  buildDayStrip,
  isDateInAllowedWindow,
} = require('../services/verdictService');
const { getVerdictExplanation } = require('../services/groqService');

// All routes require auth
router.use(authGuard);

// POST /api/routines — create a new routine
router.post('/', async (req, res, next) => {
  try {
    const { category, goal, startDate, productPrice, packDays } = req.body;

    if (!CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid product category.' });
    }
    if (!GOALS.includes(goal)) {
      return res.status(400).json({ error: 'Invalid goal.' });
    }
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ error: 'Start date must be in YYYY-MM-DD format.' });
    }

    // Pause any existing active routine
    await Routine.updateMany(
      { userId: req.userId, status: STATUS.ACTIVE },
      { status: STATUS.PAUSED }
    );

    const routine = await Routine.create({
      userId: req.userId,
      category,
      goal,
      startDate,
      productPrice: productPrice != null ? Number(productPrice) : null,
      packDays: packDays != null ? Number(packDays) : null,
      status: STATUS.ACTIVE,
    });

    res.status(201).json({ routine });
  } catch (err) {
    next(err);
  }
});

// GET /api/routines/current — current active routine + computed stats
router.get('/current', async (req, res, next) => {
  try {
    const routine = await Routine.findOne({ userId: req.userId, status: STATUS.ACTIVE }).sort({ createdAt: -1 });

    if (!routine) {
      return res.status(404).json({ error: 'No active routine found.', code: 'NO_ROUTINE' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const checkIns = await CheckIn.find({ routineId: routine._id }).select('date');
    const checkInDates = checkIns.map((c) => c.date);
    const weeklyLogs = await WeeklyLog.find({ routineId: routine._id }).select('weekNumber rating note');

    const adherenceData = computeAdherence(checkInDates, routine.startDate, todayStr);
    const { trend } = computeRatingTrend(weeklyLogs);
    const weeksElapsed = Math.floor(adherenceData.daysElapsed / 7);
    const verdictResult = computeVerdict({ weeksElapsed, adherence: adherenceData.adherence, trend });

    const todayCheckedIn = checkInDates.includes(todayStr);
    const currentWeekNumber = weeksElapsed + 1;
    const hasWeeklyLogThisWeek = weeklyLogs.some((w) => w.weekNumber === currentWeekNumber);

    res.json({
      routine,
      stats: {
        ...adherenceData,
        daysMissed: Math.max(0, adherenceData.daysElapsed - adherenceData.daysUsed),
        weeksElapsed,
        trend,
        ...verdictResult,
        todayCheckedIn,
        currentWeekNumber,
        hasWeeklyLogThisWeek,
        costPerDay:
          routine.productPrice && routine.packDays
            ? Math.round((routine.productPrice / routine.packDays) * 100) / 100
            : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/routines/:id/checkin — idempotent daily check-in
router.post('/:id/checkin', async (req, res, next) => {
  try {
    const { date, note } = req.body;

    // Validate date
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format.' });
    }
    if (!isDateInAllowedWindow(date)) {
      return res.status(400).json({ error: 'Check-ins are only allowed for today or yesterday.' });
    }

    // Verify routine ownership
    const routine = await Routine.findOne({ _id: req.params.id, userId: req.userId });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found.' });
    }
    if (routine.status !== STATUS.ACTIVE) {
      return res.status(400).json({ error: 'Routine is not active.' });
    }

    // Validate date is on or after start date
    if (date < routine.startDate) {
      return res.status(400).json({ error: 'Cannot check in before routine start date.' });
    }

    // Upsert — idempotent
    const checkIn = await CheckIn.findOneAndUpdate(
      { routineId: routine._id, date },
      {
        userId: req.userId,
        routineId: routine._id,
        date,
        note: note ? String(note).slice(0, 280) : '',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ checkIn, message: 'Checked in.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/routines/:id/weekly — submit or update weekly rating
router.post('/:id/weekly', async (req, res, next) => {
  try {
    const { weekNumber, rating, note, hasPhoto } = req.body;

    if (!weekNumber || typeof weekNumber !== 'number' || weekNumber < 1) {
      return res.status(400).json({ error: 'Invalid week number.' });
    }
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }

    const routine = await Routine.findOne({ _id: req.params.id, userId: req.userId });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found.' });
    }

    const log = await WeeklyLog.findOneAndUpdate(
      { routineId: routine._id, weekNumber },
      {
        userId: req.userId,
        routineId: routine._id,
        weekNumber,
        rating,
        note: note ? String(note).slice(0, 500) : '',
        hasPhoto: Boolean(hasPhoto),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ log, message: 'Weekly log saved.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/routines/:id/progress — full strip data + trend + adherence
router.get('/:id/progress', async (req, res, next) => {
  try {
    const routine = await Routine.findOne({ _id: req.params.id, userId: req.userId });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const checkIns = await CheckIn.find({ routineId: routine._id }).select('date note');
    const weeklyLogs = await WeeklyLog.find({ routineId: routine._id }).sort('weekNumber').select('weekNumber rating note hasPhoto');

    const checkInDates = checkIns.map((c) => c.date);
    const adherenceData = computeAdherence(checkInDates, routine.startDate, todayStr);
    const { trend, slope } = computeRatingTrend(weeklyLogs);
    const weeksElapsed = Math.floor(adherenceData.daysElapsed / 7);
    const verdictResult = computeVerdict({ weeksElapsed, adherence: adherenceData.adherence, trend });
    const dayStrip = buildDayStrip(routine.startDate, todayStr, checkInDates);

    res.json({
      routine,
      dayStrip,
      weeklyLogs,
      stats: {
        ...adherenceData,
        weeksElapsed,
        trend,
        slope,
        ...verdictResult,
        costPerDay:
          routine.productPrice && routine.packDays
            ? Math.round((routine.productPrice / routine.packDays) * 100) / 100
            : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/routines/:id/verdict — deterministic verdict + AI explanation
router.get('/:id/verdict', async (req, res, next) => {
  try {
    const routine = await Routine.findOne({ _id: req.params.id, userId: req.userId });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const checkIns = await CheckIn.find({ routineId: routine._id }).select('date');
    const weeklyLogs = await WeeklyLog.find({ routineId: routine._id }).select('weekNumber rating');

    const checkInDates = checkIns.map((c) => c.date);
    const adherenceData = computeAdherence(checkInDates, routine.startDate, todayStr);
    const { trend } = computeRatingTrend(weeklyLogs);
    const weeksElapsed = Math.floor(adherenceData.daysElapsed / 7);
    const verdictResult = computeVerdict({ weeksElapsed, adherence: adherenceData.adherence, trend });

    // Get AI explanation (with fallback)
    const aiResult = await getVerdictExplanation({
      userId: req.userId,
      routineId: routine._id,
      verdict: verdictResult.verdict,
      daysUsed: adherenceData.daysUsed,
      daysElapsed: adherenceData.daysElapsed,
      adherence: adherenceData.adherence,
      weeksElapsed,
      trendImproving: verdictResult.trendImproving,
    });

    res.json({
      verdict: verdictResult.verdict,
      trendImproving: verdictResult.trendImproving,
      stats: {
        ...adherenceData,
        weeksElapsed,
        trend,
      },
      explanation: aiResult.text,
      explanationMeta: {
        fromCache: aiResult.fromCache,
        fromFallback: aiResult.fromFallback,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/routines/:id/summary — month-3 value summary
router.get('/:id/summary', async (req, res, next) => {
  try {
    const routine = await Routine.findOne({ _id: req.params.id, userId: req.userId });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const checkIns = await CheckIn.find({ routineId: routine._id }).select('date');
    const weeklyLogs = await WeeklyLog.find({ routineId: routine._id }).sort('weekNumber').select('weekNumber rating');

    const checkInDates = checkIns.map((c) => c.date);
    const adherenceData = computeAdherence(checkInDates, routine.startDate, todayStr);

    const firstRating = weeklyLogs[0]?.rating || null;
    const lastRating = weeklyLogs[weeklyLogs.length - 1]?.rating || null;
    const ratingChange = firstRating && lastRating ? lastRating - firstRating : null;

    const totalSpent =
      routine.productPrice && routine.packDays
        ? Math.round(
            (adherenceData.daysElapsed / routine.packDays) * routine.productPrice
          )
        : null;

    const costPerDay =
      routine.productPrice && routine.packDays
        ? Math.round((routine.productPrice / routine.packDays) * 100) / 100
        : null;

    res.json({
      routine,
      summary: {
        daysElapsed: adherenceData.daysElapsed,
        daysUsed: adherenceData.daysUsed,
        daysMissed: Math.max(0, adherenceData.daysElapsed - adherenceData.daysUsed),
        adherence: Math.round(adherenceData.adherence * 100),
        firstRating,
        lastRating,
        ratingChange,
        totalSpent,
        costPerDay,
        weeksElapsed: Math.floor(adherenceData.daysElapsed / 7),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/routines/:id — update routine (pause, restart, edit details)
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, productPrice, packDays } = req.body;

    const routine = await Routine.findOne({ _id: req.params.id, userId: req.userId });
    if (!routine) {
      return res.status(404).json({ error: 'Routine not found.' });
    }

    if (status && Object.values(STATUS).includes(status)) {
      routine.status = status;
    }
    if (productPrice != null) routine.productPrice = Number(productPrice);
    if (packDays != null) routine.packDays = Number(packDays);

    await routine.save();
    res.json({ routine });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

/**
 * Groq AI service.
 * Called ONLY from the Express backend — key never exposed to client.
 * Always provides fallback text if Groq fails, times out, or hits rate limits.
 */

const { GROQ_TIMEOUT_MS, VERDICTS } = require('../config/thresholds');
const AiCache = require('../models/AiCache');

// Lazy-init Groq client (only if key exists)
let groqClient = null;

function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    const Groq = require('groq-sdk');
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

/**
 * Fallback texts per verdict type — app works even without Groq.
 */
const FALLBACKS = {
  [VERDICTS.TOO_EARLY]: (data) =>
    `You've used it ${data.daysUsed} of ${data.daysElapsed} days. It's still early — most people need 8–12 weeks before noticing changes. Keep going, boring is how it works.`,

  [VERDICTS.NOT_FAIR_TEST]: (data) =>
    `You've checked in ${data.daysUsed} of ${data.daysElapsed} days — that's ${Math.round(data.adherence * 100)}% consistency. For a fair test, aim for 70% or above. Miss a day? Just pick up the next morning.`,

  [VERDICTS.CONSIDER_DOCTOR]: (data) =>
    `You've been consistent — ${Math.round(data.adherence * 100)}% over ${data.weeksElapsed} weeks. Ratings haven't moved much. That's honest data, not failure. A dermatologist can look closer and help you figure out the next step.`,

  [VERDICTS.KEEP_GOING]: (data) =>
    `${data.daysUsed} days in, ${Math.round(data.adherence * 100)}% consistent. ${data.trendImproving ? "Your ratings are trending up — early signs that it's working." : "Keep the streak going — results at this stage are often invisible but real."}`,

  weekly_reflection: (data) =>
    `Week ${data.weekNumber}: you rated ${data.rating}/5 and used it ${Math.round(data.adherence * 100)}% of days. ${data.rating >= 4 ? 'Good signs — keep the streak.' : 'Slow weeks are part of the process. Consistency now is the investment.'}`,
};

/**
 * System prompt for all Groq calls.
 */
const SYSTEM_PROMPT = `You are a warm, honest companion for someone on a hair or wellness routine. Your job is to reflect their progress back to them clearly and encouragingly — not to hype, not to promise, not to shame.

Rules:
- Never diagnose any condition.
- Never promise or imply that a product will or won't work.
- Never recommend specific medications, doses, or brands.
- Never shame or compare.
- If symptoms are persistent, worsening, or worrying, suggest seeing a doctor or dermatologist.
- Keep your response under 60 words.
- Use simple, warm English. Light Hinglish only if the language setting allows.
- Never mention the AI, models, or technology.
- Respond in 2-3 sentences max.`;

/**
 * Call Groq with a timeout and return text.
 * @returns {Promise<string>}
 */
async function callGroq(prompt, systemOverride = null, maxTokens = 160) {
  const client = getGroqClient();
  if (!client) {
    throw new Error('Groq client not initialized (no API key)');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const completion = await client.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemOverride || SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.4,
      },
      { signal: controller.signal }
    );
    return completion.choices[0]?.message?.content?.trim() || '';
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get AI verdict explanation with caching.
 * @param {{ userId, routineId, verdict, daysUsed, daysElapsed, adherence, weeksElapsed, trendImproving }} params
 * @returns {Promise<{ text: string, fromCache: boolean, fromFallback: boolean }>}
 */
async function getVerdictExplanation(params) {
  const { userId, routineId, verdict, daysUsed, daysElapsed, adherence, weeksElapsed, trendImproving } = params;

  const stateKey = `${verdict}:${weeksElapsed}:${Math.round(adherence * 100)}`;

  // Check cache
  const cached = await AiCache.findOne({ userId, routineId, kind: 'verdict_explanation', stateKey });
  if (cached) {
    return { text: cached.text, fromCache: true, fromFallback: false };
  }

  const fallback = FALLBACKS[verdict] || FALLBACKS[VERDICTS.KEEP_GOING];

  try {
    const prompt = `The user has been on a hair/wellness routine for ${weeksElapsed} weeks. 
They've used the product ${daysUsed} out of ${daysElapsed} days (${Math.round(adherence * 100)}% consistency).
Rating trend: ${trendImproving ? 'improving' : 'flat or worsening'}.
Current verdict: ${verdict}.

Write 2-3 warm, honest sentences in the user's voice reflecting this honestly. Do not promise results.`;

    const text = await callGroq(prompt, null, 140);
    if (text) {
      // Cache it
      await AiCache.create({ userId, routineId, kind: 'verdict_explanation', stateKey, text });
      return { text, fromCache: false, fromFallback: false };
    }
  } catch (err) {
    console.warn('[Groq] verdict_explanation failed, using fallback:', err.message);
  }

  const fallbackText = fallback({ daysUsed, daysElapsed, adherence, weeksElapsed, trendImproving });
  return { text: fallbackText, fromCache: false, fromFallback: true };
}

/**
 * Get weekly reflection with caching.
 */
async function getWeeklyReflection(params) {
  const { userId, routineId, weekNumber, rating, adherence, notes } = params;
  const stateKey = `week:${weekNumber}:rating:${rating}:adh:${Math.round(adherence * 100)}`;

  const cached = await AiCache.findOne({ userId, routineId, kind: 'weekly_reflection', stateKey });
  if (cached) {
    return { text: cached.text, fromCache: true, fromFallback: false };
  }

  try {
    const noteSummary = notes && notes.length ? `Notes this week: "${notes.join('; ')}"` : 'No notes added.';
    const prompt = `Week ${weekNumber} of routine. Self-rating: ${rating}/5. Consistency this week: ${Math.round(adherence * 100)}%. ${noteSummary}

Write 2-3 warm, encouraging sentences and one practical tip. Keep it under 60 words.`;

    const text = await callGroq(prompt, null, 140);
    if (text) {
      await AiCache.create({ userId, routineId, kind: 'weekly_reflection', stateKey, text });
      return { text, fromCache: false, fromFallback: false };
    }
  } catch (err) {
    console.warn('[Groq] weekly_reflection failed, using fallback:', err.message);
  }

  const fallbackText = FALLBACKS.weekly_reflection({ weekNumber, rating, adherence });
  return { text: fallbackText, fromCache: false, fromFallback: true };
}

/**
 * Scoped Q&A — trained exclusively to answer questions related to the active routine.
 */
async function askRoutineQuestion(params) {
  const { question, category, goal, weekNumber, adherence } = params;

  const routineCategory = category ? category.replace(/_/g, ' ') : 'wellness routine';
  const routineGoal = goal ? goal.replace(/_/g, ' ') : 'consistency and long-term health';
  const adhPct = Math.round((adherence || 0) * 100);

  const systemPrompt = `You are the Day 90 Routine Companion AI. You are strictly and exclusively an assistant for users following a 90-day health & wellness routine (hair, beard, skin, gummies, serums).

CURRENT USER CONTEXT:
- Active Routine: ${routineCategory}
- Target Goal: ${routineGoal}
- Current Stage: Week ${weekNumber}
- Adherence: ${adhPct}% consistent

STRICT DOMAIN SCOPE & RULES:
1. PERMITTED TOPICS ONLY:
   - Routine application & timing (morning vs. night, after shower, frequency)
   - What to do when a dose/day is missed (pick up next day without double-dosing)
   - Biological expectations & timelines (initial shedding periods, dormant follicle cycles, why results take 8-12 weeks)
   - Consistency habits, adherence tracking, staying motivated during invisible-progress phases
   - Practical routine tips specifically for ${routineCategory}

2. STRICT REFUSAL FOR UNRELATED TOPICS:
   - If the user asks about ANYTHING outside their wellness/hair/beard routine (such as general knowledge, coding, math, history, politics, recipes, weather, pop culture, entertainment, or unrelated personal questions), you MUST politely refuse to answer.
   - Refusal response template: "I'm designed exclusively to help with your ${routineCategory} and 90-day consistency tracker. For other questions, please consult an appropriate resource."

3. SAFETY & MEDICAL BOUNDARIES:
   - Never diagnose conditions or suggest specific prescription drugs/dosages.
   - For alarming, painful, or medical symptoms, instruct: "For specific clinical diagnosis or adverse reactions, please consult a dermatologist or healthcare professional."
   - Keep answers warm, concise, scientifically grounded, and strictly between 2 to 4 sentences (under 75 words).`;

  try {
    const text = await callGroq(question, systemPrompt, 200);
    return {
      text: text || "I can only help with your 90-day routine questions. Please consult a doctor for clinical queries.",
      fromFallback: !text,
    };
  } catch (err) {
    console.warn('[Groq] ask failed:', err.message);
    return {
      text: "I couldn't connect right now. For clinical questions, please consult a doctor or dermatologist.",
      fromFallback: true,
    };
  }
}

module.exports = {
  getVerdictExplanation,
  getWeeklyReflection,
  askRoutineQuestion,
};

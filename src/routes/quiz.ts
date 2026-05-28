import { Router } from "express";
import { db } from "../lib/db";
import { quizResultsTable } from "../lib/db";
import { desc } from "drizzle-orm";
import { SaveQuizResultBody } from "../lib/api-zod";

const BADGE_RULES = [
  { id: "first_quiz", check: (results: any[]) => results.length >= 1 },
  { id: "perfect_score", check: (results: any[]) => results.some(r => r.score === 100) },
  { id: "consistency_star", check: (results: any[]) => results.length >= 5 },
  { id: "tajweed_champion", check: (results: any[]) => results.filter(r => r.score >= 80).length >= 3 },
  { id: "hifz_master", check: (results: any[]) => results.some(r => r.mode === "hifz") },
];

const router = Router();

router.get("/quiz/results", async (_req, res): Promise<void> => {
  const results = await db.select().from(quizResultsTable).orderBy(desc(quizResultsTable.date));
  res.json(results.map(r => ({ ...r, date: r.date.toISOString() })));
});

router.post("/quiz/results", async (req, res): Promise<void> => {
  const parsed = SaveQuizResultBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [result] = await db.insert(quizResultsTable).values(parsed.data).returning();
  res.status(201).json({ ...result, date: result.date.toISOString() });
});

router.get("/quiz/stats", async (_req, res): Promise<void> => {
  const results = await db.select().from(quizResultsTable).orderBy(desc(quizResultsTable.date));
  const totalXp = results.reduce((a, r) => a + r.xpEarned, 0);
  const avgScore = results.length ? results.reduce((a, r) => a + r.score, 0) / results.length : 0;
  const badges = BADGE_RULES.filter(rule => rule.check(results)).map(r => r.id);

  // Best streak
  let bestStreak = 0;
  let currentStreak = 0;
  const dayMap = new Map<string, boolean>();
  results.forEach(r => {
    const day = new Date(r.date).toISOString().split("T")[0];
    dayMap.set(day, true);
  });
  const sortedDays = Array.from(dayMap.keys()).sort();
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) { currentStreak = 1; }
    else {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) { currentStreak++; }
      else { currentStreak = 1; }
    }
    bestStreak = Math.max(bestStreak, currentStreak);
  }

  res.json({ totalXp, totalQuizzes: results.length, avgScore, bestStreak, badges });
});

export default router;

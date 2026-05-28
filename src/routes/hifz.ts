import { Router } from "express";
import { db } from "../lib/db";
import { hifzPlansTable, hifzVerseProgressTable } from "../lib/db";
import { eq, and } from "drizzle-orm";
import {
  CreateHifzPlanBody,
  UpdateHifzPlanBody,
  UpdateHifzPlanParams,
  DeleteHifzPlanParams,
  RecordHifzVerseProgressBody,
} from "../lib/api-zod";

const router = Router();

// SM-2 spaced repetition: calculate next review date
function getNextReview(status: string, attempts: number): Date {
  const d = new Date();
  const intervals = { memorized: [1, 3, 7, 14, 30, 60], weak: [0, 1, 3], not_started: [0] };
  const key = status as keyof typeof intervals;
  const list = intervals[key] ?? intervals.not_started;
  const days = list[Math.min(attempts, list.length - 1)];
  d.setDate(d.getDate() + days);
  return d;
}

router.get("/hifz/plans", async (_req, res): Promise<void> => {
  const plans = await db.select().from(hifzPlansTable);
  res.json(plans.map(p => ({ ...p, targetSurahs: JSON.parse(p.targetSurahs) })));
});

router.post("/hifz/plans", async (req, res): Promise<void> => {
  const parsed = CreateHifzPlanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { targetSurahs, ...rest } = parsed.data;
  const [plan] = await db.insert(hifzPlansTable).values({ ...rest, targetSurahs: JSON.stringify(targetSurahs ?? []) }).returning();
  res.status(201).json({ ...plan, targetSurahs: JSON.parse(plan.targetSurahs) });
});

router.patch("/hifz/plans/:id", async (req, res): Promise<void> => {
  const params = UpdateHifzPlanParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateHifzPlanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [plan] = await db.update(hifzPlansTable).set(parsed.data).where(eq(hifzPlansTable.id, params.data.id)).returning();
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json({ ...plan, targetSurahs: JSON.parse(plan.targetSurahs) });
});

router.delete("/hifz/plans/:id", async (req, res): Promise<void> => {
  const params = DeleteHifzPlanParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(hifzPlansTable).where(eq(hifzPlansTable.id, params.data.id));
  res.sendStatus(204);
});

router.get("/hifz/verse-progress", async (_req, res): Promise<void> => {
  const progress = await db.select().from(hifzVerseProgressTable);
  res.json(progress.map(p => ({
    ...p,
    lastAttempt: p.lastAttempt?.toISOString() ?? new Date().toISOString(),
    nextReview: p.nextReview?.toISOString() ?? null,
  })));
});

router.post("/hifz/verse-progress", async (req, res): Promise<void> => {
  const parsed = RecordHifzVerseProgressBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const existing = await db.select().from(hifzVerseProgressTable)
    .where(and(eq(hifzVerseProgressTable.surahId, parsed.data.surahId), eq(hifzVerseProgressTable.verseId, parsed.data.verseId)));

  const attempts = (existing[0]?.attempts ?? 0) + 1;
  const nextReview = getNextReview(parsed.data.status, attempts);

  let result;
  if (existing.length > 0) {
    [result] = await db.update(hifzVerseProgressTable)
      .set({ status: parsed.data.status, attempts, lastAttempt: new Date(), nextReview })
      .where(and(eq(hifzVerseProgressTable.surahId, parsed.data.surahId), eq(hifzVerseProgressTable.verseId, parsed.data.verseId)))
      .returning();
  } else {
    [result] = await db.insert(hifzVerseProgressTable)
      .values({ surahId: parsed.data.surahId, verseId: parsed.data.verseId, status: parsed.data.status, attempts: 1, nextReview })
      .returning();
  }

  res.json({
    ...result,
    lastAttempt: result.lastAttempt?.toISOString() ?? new Date().toISOString(),
    nextReview: result.nextReview?.toISOString() ?? null,
  });
});

export default router;

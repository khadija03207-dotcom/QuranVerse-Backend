import { Router } from "express";
import { db } from "../lib/db";
import { readingSessionsTable, surahProgressTable } from "../lib/db";
import { eq, sum, count, desc } from "drizzle-orm";
import {
  RecordReadingSessionBody,
  UpdateSurahProgressBody,
  UpdateSurahProgressParams,
} from "../lib/api-zod";

const router = Router();

router.get("/progress/stats", async (req, res): Promise<void> => {
  try {
    const sessions = await db.select().from(readingSessionsTable).orderBy(desc(readingSessionsTable.date));
    const surahProgress = await db.select().from(surahProgressTable);

    const totalVersesRead = sessions.reduce((a, s) => a + (s.verseEnd - s.verseStart + 1), 0);
    const totalMinutesRead = sessions.reduce((a, s) => a + s.durationMinutes, 0);
    const completedSurahs = surahProgress.filter(p => p.completed).length;

    // Calculate reading streak (days in a row)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const sessionDays = new Set(sessions.map(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }));
    for (let i = 0; i < 365; i++) {
      const day = new Date(today);
      day.setDate(day.getDate() - i);
      if (sessionDays.has(day.getTime())) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Weekly data (last 7 days)
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(today);
      day.setDate(day.getDate() - (6 - i));
      const dayStart = day.getTime();
      const dayEnd = dayStart + 86400000;
      const daySessions = sessions.filter(s => {
        const t = new Date(s.date).getTime();
        return t >= dayStart && t < dayEnd;
      });
      return {
        day: days[day.getDay()],
        verses: daySessions.reduce((a, s) => a + (s.verseEnd - s.verseStart + 1), 0),
        minutes: daySessions.reduce((a, s) => a + s.durationMinutes, 0),
      };
    });

    const lastSession = sessions[0];
    res.json({
      readingStreak: streak,
      totalVersesRead,
      totalMinutesRead,
      completedSurahs,
      completedJuz: Math.floor(completedSurahs / 3.8),
      recitationAvgScore: 0,
      quizXp: 0,
      journalStreak: 0,
      lastReadSurah: lastSession?.surahId ?? null,
      lastReadVerse: lastSession?.verseEnd ?? null,
      weeklyData,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.get("/progress/reading-history", async (req, res): Promise<void> => {
  const sessions = await db.select().from(readingSessionsTable).orderBy(desc(readingSessionsTable.date));
  res.json(sessions.map(s => ({
    id: s.id,
    surahId: s.surahId,
    verseStart: s.verseStart,
    verseEnd: s.verseEnd,
    durationMinutes: s.durationMinutes,
    date: s.date.toISOString(),
  })));
});

router.post("/progress/reading-history", async (req, res): Promise<void> => {
  const parsed = RecordReadingSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [session] = await db.insert(readingSessionsTable).values(parsed.data).returning();
  res.status(201).json({ ...session, date: session.date.toISOString() });
});

router.patch("/progress/surah/:surahId", async (req, res): Promise<void> => {
  const params = UpdateSurahProgressParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateSurahProgressBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const existing = await db.select().from(surahProgressTable).where(eq(surahProgressTable.surahId, params.data.surahId));
  let result;
  if (existing.length > 0) {
    [result] = await db.update(surahProgressTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(surahProgressTable.surahId, params.data.surahId)).returning();
  } else {
    [result] = await db.insert(surahProgressTable).values({ surahId: params.data.surahId, ...parsed.data }).returning();
  }
  res.json({ ...result, updatedAt: result.updatedAt.toISOString() });
});

router.get("/progress/surah", async (req, res): Promise<void> => {
  const progress = await db.select().from(surahProgressTable);
  res.json(progress.map(p => ({ ...p, updatedAt: p.updatedAt.toISOString() })));
});

export default router;

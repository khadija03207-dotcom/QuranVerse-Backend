import { Router } from "express";
import { db } from "../lib/db";
import { recitationSessionsTable } from "../lib/db";
import { desc } from "drizzle-orm";
import { SaveRecitationSessionBody } from "../lib/api-zod";

const router = Router();

router.get("/recitation/sessions", async (_req, res): Promise<void> => {
  const sessions = await db.select().from(recitationSessionsTable).orderBy(desc(recitationSessionsTable.date));
  res.json(sessions.map(s => ({
    ...s,
    date: s.date.toISOString(),
    mistakes: JSON.parse(s.mistakes),
  })));
});

router.post("/recitation/sessions", async (req, res): Promise<void> => {
  const parsed = SaveRecitationSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { mistakes, ...rest } = parsed.data;
  const [session] = await db.insert(recitationSessionsTable).values({
    ...rest,
    mistakes: JSON.stringify(mistakes ?? []),
  }).returning();
  res.status(201).json({ ...session, date: session.date.toISOString(), mistakes: JSON.parse(session.mistakes) });
});

export default router;

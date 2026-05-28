import { Router } from "express";
import { db } from "../lib/db";
import { journalEntriesTable } from "../lib/db";
import { eq, desc } from "drizzle-orm";
import { CreateJournalEntryBody, UpdateJournalEntryBody, UpdateJournalEntryParams } from "../lib/api-zod";

const router = Router();

router.get("/journal", async (_req, res): Promise<void> => {
  const entries = await db.select().from(journalEntriesTable).orderBy(desc(journalEntriesTable.updatedAt));
  res.json(entries.map(e => ({ ...e, updatedAt: e.updatedAt.toISOString() })));
});

router.post("/journal", async (req, res): Promise<void> => {
  const parsed = CreateJournalEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const data = { ...parsed.data, date: parsed.data.date ?? new Date().toISOString().split("T")[0] };
  const [entry] = await db.insert(journalEntriesTable).values(data).returning();
  res.status(201).json({ ...entry, updatedAt: entry.updatedAt.toISOString() });
});

router.patch("/journal/:id", async (req, res): Promise<void> => {
  const params = UpdateJournalEntryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateJournalEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [entry] = await db.update(journalEntriesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(journalEntriesTable.id, params.data.id)).returning();
  if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }
  res.json({ ...entry, updatedAt: entry.updatedAt.toISOString() });
});

export default router;

import { Router } from "express";
import { db } from "../lib/db";
import { verseNotesTable } from "../lib/db";
import { eq } from "drizzle-orm";
import { CreateNoteBody, UpdateNoteBody, UpdateNoteParams, DeleteNoteParams } from "../lib/api-zod";

const router = Router();

router.get("/notes", async (_req, res): Promise<void> => {
  const notes = await db.select().from(verseNotesTable);
  res.json(notes.map(n => ({ ...n, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() })));
});

router.post("/notes", async (req, res): Promise<void> => {
  const parsed = CreateNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [note] = await db.insert(verseNotesTable).values(parsed.data).returning();
  res.status(201).json({ ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() });
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
  const params = UpdateNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [note] = await db.update(verseNotesTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(verseNotesTable.id, params.data.id)).returning();
  if (!note) { res.status(404).json({ error: "Note not found" }); return; }
  res.json({ ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() });
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const params = DeleteNoteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(verseNotesTable).where(eq(verseNotesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

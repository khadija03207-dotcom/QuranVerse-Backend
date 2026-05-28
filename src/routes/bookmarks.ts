import { Router } from "express";
import { db } from "../lib/db";
import { bookmarksTable } from "../lib/db";
import { eq } from "drizzle-orm";
import { CreateBookmarkBody, DeleteBookmarkParams } from "../lib/api-zod";

const router = Router();

router.get("/bookmarks", async (_req, res): Promise<void> => {
  const bookmarks = await db.select().from(bookmarksTable);
  res.json(bookmarks.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })));
});

router.post("/bookmarks", async (req, res): Promise<void> => {
  const parsed = CreateBookmarkBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [bookmark] = await db.insert(bookmarksTable).values(parsed.data).returning();
  res.status(201).json({ ...bookmark, createdAt: bookmark.createdAt.toISOString() });
});

router.delete("/bookmarks/:id", async (req, res): Promise<void> => {
  const params = DeleteBookmarkParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(bookmarksTable).where(eq(bookmarksTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

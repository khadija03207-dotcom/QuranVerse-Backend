import { Router } from "express";
import { db } from "../lib/db";
import { hadithFavoritesTable } from "../lib/db";
import { eq } from "drizzle-orm";
import { AddHadithFavoriteBody, RemoveHadithFavoriteParams } from "../lib/api-zod";

const router = Router();

router.get("/hadith-favorites", async (_req, res): Promise<void> => {
  const favs = await db.select().from(hadithFavoritesTable);
  res.json(favs.map(f => ({ ...f, createdAt: f.createdAt.toISOString() })));
});

router.post("/hadith-favorites", async (req, res): Promise<void> => {
  const parsed = AddHadithFavoriteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [fav] = await db.insert(hadithFavoritesTable).values(parsed.data).returning();
  res.status(201).json({ ...fav, createdAt: fav.createdAt.toISOString() });
});

router.delete("/hadith-favorites/:id", async (req, res): Promise<void> => {
  const params = RemoveHadithFavoriteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(hadithFavoritesTable).where(eq(hadithFavoritesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

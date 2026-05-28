import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hadithFavoritesTable = pgTable("hadith_favorites", {
  id: serial("id").primaryKey(),
  bookSlug: text("book_slug").notNull(),
  hadithId: integer("hadith_id").notNull(),
  arabicText: text("arabic_text").notNull(),
  englishText: text("english_text").notNull(),
  chapter: text("chapter").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertHadithFavoriteSchema = createInsertSchema(hadithFavoritesTable).omit({ id: true, createdAt: true });

export type HadithFavorite = typeof hadithFavoritesTable.$inferSelect;
export type InsertHadithFavorite = z.infer<typeof insertHadithFavoriteSchema>;

import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookmarksTable = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  surahId: integer("surah_id").notNull(),
  verseId: integer("verse_id").notNull(),
  surahName: text("surah_name").notNull(),
  verseText: text("verse_text").notNull(),
  label: text("label"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBookmarkSchema = createInsertSchema(bookmarksTable).omit({ id: true, createdAt: true });

export type Bookmark = typeof bookmarksTable.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;

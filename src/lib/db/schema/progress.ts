import { pgTable, serial, integer, boolean, text, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const readingSessionsTable = pgTable("reading_sessions", {
  id: serial("id").primaryKey(),
  surahId: integer("surah_id").notNull(),
  verseStart: integer("verse_start").notNull(),
  verseEnd: integer("verse_end").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  date: timestamp("date").notNull().defaultNow(),
});

export const surahProgressTable = pgTable("surah_progress", {
  surahId: integer("surah_id").primaryKey(),
  lastReadVerse: integer("last_read_verse").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  favorited: boolean("favorited").notNull().default(false),
  totalVerses: integer("total_verses").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertReadingSessionSchema = createInsertSchema(readingSessionsTable).omit({ id: true, date: true });
export const insertSurahProgressSchema = createInsertSchema(surahProgressTable).omit({ updatedAt: true });

export type ReadingSession = typeof readingSessionsTable.$inferSelect;
export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;
export type SurahProgress = typeof surahProgressTable.$inferSelect;
export type InsertSurahProgress = z.infer<typeof insertSurahProgressSchema>;

import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recitationSessionsTable = pgTable("recitation_sessions", {
  id: serial("id").primaryKey(),
  surahId: integer("surah_id").notNull(),
  verseId: integer("verse_id").notNull(),
  score: real("score").notNull().default(0),
  pronunciationScore: real("pronunciation_score").notNull().default(0),
  tajweedScore: real("tajweed_score").notNull().default(0),
  fluencyScore: real("fluency_score").notNull().default(0),
  paceScore: real("pace_score").notNull().default(0),
  feedback: text("feedback").notNull().default(""),
  mistakes: text("mistakes").notNull().default("[]"),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertRecitationSessionSchema = createInsertSchema(recitationSessionsTable).omit({ id: true, date: true });

export type RecitationSession = typeof recitationSessionsTable.$inferSelect;
export type InsertRecitationSession = z.infer<typeof insertRecitationSessionSchema>;

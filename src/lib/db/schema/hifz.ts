import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hifzPlansTable = pgTable("hifz_plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  targetSurahs: text("target_surahs").notNull().default("[]"),
  dailyVerseGoal: integer("daily_verse_goal").notNull().default(5),
  startDate: text("start_date").notNull(),
  targetDate: text("target_date").notNull(),
  memorizedVerses: integer("memorized_verses").notNull().default(0),
  totalVerses: integer("total_verses").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const hifzVerseProgressTable = pgTable("hifz_verse_progress", {
  surahId: integer("surah_id").notNull(),
  verseId: integer("verse_id").notNull(),
  status: text("status").notNull().default("not_started"),
  attempts: integer("attempts").notNull().default(0),
  lastAttempt: timestamp("last_attempt").defaultNow(),
  nextReview: timestamp("next_review"),
});

export const insertHifzPlanSchema = createInsertSchema(hifzPlansTable).omit({ id: true, createdAt: true });
export const insertHifzVerseProgressSchema = createInsertSchema(hifzVerseProgressTable).omit({ lastAttempt: true, nextReview: true });

export type HifzPlan = typeof hifzPlansTable.$inferSelect;
export type InsertHifzPlan = z.infer<typeof insertHifzPlanSchema>;
export type HifzVerseProgress = typeof hifzVerseProgressTable.$inferSelect;
export type InsertHifzVerseProgress = z.infer<typeof insertHifzVerseProgressSchema>;

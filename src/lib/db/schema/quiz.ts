import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const quizResultsTable = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  surahId: integer("surah_id").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  xpEarned: integer("xp_earned").notNull().default(0),
  mode: text("mode").notNull().default("mcq"),
  date: timestamp("date").notNull().defaultNow(),
});

export const insertQuizResultSchema = createInsertSchema(quizResultsTable).omit({ id: true, date: true });

export type QuizResult = typeof quizResultsTable.$inferSelect;
export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;

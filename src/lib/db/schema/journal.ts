import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const journalEntriesTable = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  surahId: integer("surah_id").notNull(),
  verseId: integer("verse_id").notNull(),
  reflection: text("reflection").notNull(),
  gratitude: text("gratitude").notNull(),
  date: text("date").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntriesTable).omit({ id: true, updatedAt: true });

export type JournalEntry = typeof journalEntriesTable.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;

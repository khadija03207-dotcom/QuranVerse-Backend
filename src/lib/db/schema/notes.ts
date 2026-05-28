import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const verseNotesTable = pgTable("verse_notes", {
  id: serial("id").primaryKey(),
  surahId: integer("surah_id").notNull(),
  verseId: integer("verse_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVerseNoteSchema = createInsertSchema(verseNotesTable).omit({ id: true, createdAt: true, updatedAt: true });

export type VerseNote = typeof verseNotesTable.$inferSelect;
export type InsertVerseNote = z.infer<typeof insertVerseNoteSchema>;

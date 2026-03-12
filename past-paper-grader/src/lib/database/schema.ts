import { pgTable, uuid, timestamp, text, integer, varchar, date, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const bugReports = pgTable("bug_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  email: varchar("email", { length: 255 }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 20 }).default("open").$type<"open" | "in_progress" | "resolved" | "closed">(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),

  // File references
  paperFileUrl: text("paper_file_url").notNull(),
  paperText: text("paper_text"),
  markschemeFileUrl: text("markscheme_file_url"),
  markschemeText: text("markscheme_text"),

  // Processing status
  status: varchar("status", { length: 20 }).default("uploaded").$type<"uploaded" | "processing" | "completed" | "failed">(),

  // Results
  totalScore: integer("total_score"),
  maxPossibleScore: integer("max_possible_score"),
  aiFeedback: jsonb("ai_feedback"),

  // Metadata
  subject: varchar("subject", { length: 100 }),
  examBoard: varchar("exam_board", { length: 100 }),
  paperDate: date("paper_date"),
});

export const questionResults = pgTable("question_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id").references(() => submissions.id, { onDelete: "cascade" }),
  questionNumber: integer("question_number"),
  questionText: text("question_text"),
  studentAnswer: text("student_answer"),
  markschemeAnswer: text("markscheme_answer"),
  score: integer("score"),
  maxScore: integer("max_score"),
  feedback: text("feedback"),
  improvementSuggestions: text("improvement_suggestions"),
});

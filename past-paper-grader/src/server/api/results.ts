import { Elysia, t } from "elysia";
import { db, submissions, questionResults } from "../../lib/database/client";
import { eq } from "drizzle-orm";
import { getCachedSubmission } from "../../lib/cache/client";

export const resultsRouter = new Elysia({ prefix: "/api" })
  .get("/results/:submissionId", async ({ params, set }) => {
    const { submissionId } = params;

    try {
      // Check cache first
      const cached = await getCachedSubmission(submissionId);
      if (cached) {
        return cached;
      }

      // Get from database
      const submission = await db.query.submissions.findFirst({
        where: eq(submissions.id, submissionId),
      });

      if (!submission) {
        set.status = 404;
        return { error: "Submission not found" };
      }

      // Get question results
      const questions = await db.query.questionResults.findMany({
        where: eq(questionResults.submissionId, submissionId),
      });

      const response = {
        id: submission.id,
        createdAt: submission.createdAt,
        status: submission.status,
        totalScore: submission.totalScore,
        maxPossibleScore: submission.maxPossibleScore,
        subject: submission.subject,
        examBoard: submission.examBoard,
        paperDate: submission.paperDate,
        aiFeedback: submission.aiFeedback,
        questions: questions.map((q) => ({
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          studentAnswer: q.studentAnswer,
          markschemeAnswer: q.markschemeAnswer,
          score: q.score,
          maxScore: q.maxScore,
          feedback: q.feedback,
          improvementSuggestions: q.improvementSuggestions,
        })),
      };

      return response;
    } catch (error) {
      console.error("Results fetch error:", error);
      set.status = 500;
      return { error: "Failed to fetch results" };
    }
  }, {
    params: t.Object({
      submissionId: t.String(),
    }),
  });

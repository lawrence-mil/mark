import { Elysia, t } from "elysia";
import { db, submissions, questionResults } from "../../lib/database/client";
import { uploadFile } from "../../lib/storage/client";
import { extractTextFromFile, extractTextFromPDF } from "../../lib/ocr/client";
import { gradePaper } from "../../lib/ai/client";
import { eq } from "drizzle-orm";
import { cacheSubmission, cacheAIResults } from "../../lib/cache/client";
import { detectAndFetchMarkscheme } from "../../lib/ai/detection";

export const submissionsRouter = new Elysia({ prefix: "/api" })
  // Upload paper endpoint
  .post("/submit/paper", async ({ body, set }) => {
    try {
      const { files } = body as any;
      const fileArray = Array.isArray(files) ? files : [files];

      if (!files || fileArray.length === 0 || !fileArray[0]) {
        set.status = 400;
        return { error: "No files provided" };
      }

      const validTypes = ["application/pdf", "image/png", "image/jpeg", "text/plain"];
      for (const file of fileArray) {
        if (!validTypes.includes(file.type)) {
          set.status = 400;
          return { error: `Invalid file type for ${file.name}. Supported: PDF, PNG, JPG, TXT` };
        }
        if (file.size > 50 * 1024 * 1024) {
          set.status = 400;
          return { error: `File ${file.name} too large. Maximum size is 50MB` };
        }
      }

      // Upload all files to storage
      const urls = await Promise.all(fileArray.map((f: any) => uploadFile(f).then(r => r.url)));

      // Create submission record with JSON array of URLs
      const [submission] = await db
        .insert(submissions)
        .values({
          paperFileUrl: JSON.stringify(urls),
          status: "uploaded",
        })
        .returning();

      return {
        submissionId: submission.id,
        status: submission.status,
      };
    } catch (error) {
      console.error("Upload error:", error);
      set.status = 500;
      return { error: "Upload failed" };
    }
  })

  // Detect markscheme endpoint
  .post("/detect-markscheme/:submissionId", async ({ params, set }) => {
    const { submissionId } = params;
    try {
      const submission = await db.query.submissions.findFirst({
        where: eq(submissions.id, submissionId),
      });

      if (!submission) {
        set.status = 404;
        return { error: "Submission not found" };
      }

      let paperUrls: string[];
      try {
        paperUrls = JSON.parse(submission.paperFileUrl);
      } catch {
        paperUrls = [submission.paperFileUrl];
      }

      const result = await detectAndFetchMarkscheme(paperUrls);
      
      if (result.found && result.text) {
        await db
          .update(submissions)
          .set({
            markschemeText: result.text,
            subject: result.metadata?.subject,
            examBoard: result.metadata?.examBoard,
          })
          .where(eq(submissions.id, submissionId));
          
        return { found: true, metadata: result.metadata };
      }

      return { found: false };
    } catch (error) {
      console.error("Detection error:", error);
      return { found: false, error: "Detection failed" };
    }
  }, {
    params: t.Object({
      submissionId: t.String(),
    }),
  })

  // Upload markscheme endpoint
  .post("/submit/markscheme", async ({ body, set }) => {
    try {
      const { submissionId, file } = body as any;

      if (!submissionId) {
        set.status = 400;
        return { error: "submissionId is required" };
      }

      if (!file) {
        set.status = 400;
        return { error: "No file provided" };
      }

      const existingSubmission = await db.query.submissions.findFirst({
        where: eq(submissions.id, submissionId),
      });

      if (!existingSubmission) {
        set.status = 404;
        return { error: "Submission not found" };
      }

      const { url } = await uploadFile(file);

      await db
        .update(submissions)
        .set({
          markschemeFileUrl: url,
        })
        .where(eq(submissions.id, submissionId));

      return { success: true };
    } catch (error) {
      console.error("Markscheme upload error:", error);
      set.status = 500;
      return { error: "Upload failed" };
    }
  })

  // Process submission endpoint
  .post("/process/:submissionId", async ({ params, set }) => {
    const { submissionId } = params;

    try {
      const submission = await db.query.submissions.findFirst({
        where: eq(submissions.id, submissionId),
      });

      if (!submission) {
        set.status = 404;
        return { error: "Submission not found" };
      }

      if (!submission.markschemeFileUrl && !submission.markschemeText) {
        set.status = 422;
        return { error: "Mark scheme not uploaded or detected" };
      }

      await db
        .update(submissions)
        .set({ status: "processing" })
        .where(eq(submissions.id, submissionId));

      processSubmission(submissionId).catch(console.error);

      return { processing: true };
    } catch (error) {
      console.error("Processing error:", error);
      set.status = 500;
      return { error: "Processing failed" };
    }
  }, {
    params: t.Object({
      submissionId: t.String(),
    }),
  });

async function processSubmission(submissionId: string) {
  try {
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, submissionId),
    });

    if (!submission || (!submission.markschemeFileUrl && !submission.markschemeText)) {
      throw new Error("Invalid submission state");
    }

    let paperUrls: string[];
    try {
      paperUrls = JSON.parse(submission.paperFileUrl);
    } catch {
      paperUrls = [submission.paperFileUrl];
    }

    let paperText = "";
    for (const url of paperUrls) {
      if (url.endsWith(".txt")) {
        const response = await fetch(url);
        paperText += (await response.text()) + "\n\n";
      } else if (url.endsWith(".pdf")) {
        paperText += (await extractTextFromPDF(url)) + "\n\n";
      } else {
        paperText += (await extractTextFromFile(url)) + "\n\n";
      }
    }

    let markschemeText = submission.markschemeText || "";
    if (!markschemeText && submission.markschemeFileUrl) {
      if (submission.markschemeFileUrl.endsWith(".txt")) {
        const response = await fetch(submission.markschemeFileUrl);
        markschemeText = await response.text();
      } else if (submission.markschemeFileUrl.endsWith(".pdf")) {
        markschemeText = await extractTextFromPDF(submission.markschemeFileUrl);
      } else {
        markschemeText = await extractTextFromFile(submission.markschemeFileUrl);
      }
    }

    await db
      .update(submissions)
      .set({
        paperText,
        markschemeText,
      })
      .where(eq(submissions.id, submissionId));

    const gradingResult = await gradePaper(paperText, markschemeText);

    await db
      .update(submissions)
      .set({
        status: "completed",
        totalScore: gradingResult.totalScore,
        maxPossibleScore: gradingResult.maxPossibleScore,
        aiFeedback: gradingResult,
        subject: gradingResult.subject || submission.subject,
        examBoard: gradingResult.examBoard || submission.examBoard,
      })
      .where(eq(submissions.id, submissionId));

    if (gradingResult.questions && gradingResult.questions.length > 0) {
      await db.insert(questionResults).values(
        gradingResult.questions.map((q) => ({
          submissionId,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          studentAnswer: q.studentAnswer,
          markschemeAnswer: q.markschemeAnswer,
          score: q.score,
          maxScore: q.maxScore,
          feedback: q.feedback,
          improvementSuggestions: q.improvementSuggestions,
        }))
      );
    }

    await cacheAIResults(submissionId, gradingResult);
    const updatedSubmission = await db.query.submissions.findFirst({
      where: eq(submissions.id, submissionId),
    });
    if (updatedSubmission) {
      await cacheSubmission(submissionId, updatedSubmission);
    }

    console.log(`✅ Submission ${submissionId} processed successfully`);
  } catch (error) {
    console.error(`❌ Processing failed for ${submissionId}:`, error);
    await db
      .update(submissions)
      .set({ status: "failed" })
      .where(eq(submissions.id, submissionId));
  }
}

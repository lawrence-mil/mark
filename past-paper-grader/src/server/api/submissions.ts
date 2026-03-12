import { Elysia, t } from "elysia";
import { db, submissions, questionResults } from "../../lib/database/client";
import { uploadFile, getPresignedUrl } from "../../lib/storage/client";
import { extractTextFromFile, extractTextFromPDF } from "../../lib/ocr/client";
import { gradePaper, gradeFromImages } from "../../lib/ai/client";
import { eq } from "drizzle-orm";
import { cacheSubmission, cacheAIResults } from "../../lib/cache/client";
import { detectAndFetchMarkscheme } from "../../lib/ai/detection";

export const submissionsRouter = new Elysia({ prefix: "/api" })
  // Proxy file through server
  .get("/file/:key", async ({ params, set }) => {
    try {
      const { key } = params;
      // Decode the URL-encoded key
      const decodedKey = decodeURIComponent(key);
      const url = await getPresignedUrl(decodedKey);
      
      const response = await fetch(url);
      if (!response.ok) {
        set.status = 404;
        return { error: "File not found" };
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      set.headers = {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      };

      return response.body;
    } catch (error) {
      console.error("File proxy error:", error);
      set.status = 500;
      return { error: "Failed to fetch file" };
    }
  }, {
    params: t.Object({
      key: t.String(),
    }),
  })
  // Upload paper endpoint
  .post("/submit/paper", async ({ body, set }) => {
    try {
      const files = body.files as unknown as File[];
      const fileArray = Array.isArray(files) ? files : [files];

      if (!files || fileArray.length === 0 || !fileArray[0]) {
        set.status = 400;
        return { error: "No files provided" };
      }

      // Validate file types
      const validTypes = ["application/pdf", "image/png", "image/jpeg", "text/plain"];
      for (const file of fileArray) {
        const fileType = file.type.split(";")[0]; // Remove charset from type
        if (!validTypes.includes(fileType)) {
          set.status = 400;
          return { error: `Invalid file type: ${fileType}` };
        }
        if (file.size > 50 * 1024 * 1024) {
          set.status = 400;
          return { error: `File too large: ${file.size} bytes (max 50MB)` };
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

      // Parse paper URLs from submission
      let paperUrls: string[];
      try {
        paperUrls = JSON.parse(submission.paperFileUrl);
      } catch {
        paperUrls = [submission.paperFileUrl];
      }

      if (!paperUrls || paperUrls.length === 0) {
        return { found: false, error: "No paper files found" };
      }

      console.log(`🔍 Attempting to auto-detect markscheme for submission ${submissionId}`);
      const result = await detectAndFetchMarkscheme(paperUrls);

      if (result.found && result.text) {
        // Save the detected markscheme
        await db
          .update(submissions)
          .set({
            markschemeText: result.text,
            examBoard: result.metadata?.examBoard || undefined,
            subject: result.metadata?.subject || undefined,
          })
          .where(eq(submissions.id, submissionId));

        console.log(`✅ Markscheme auto-detected for ${submissionId}`);
        return {
          found: true,
          metadata: result.metadata,
          message: "Markscheme auto-detected and saved",
        };
      }

      return {
        found: false,
        metadata: result.metadata,
        message: "Could not auto-detect markscheme. Please upload manually.",
      };
    } catch (error) {
      console.error("Detection error:", error);
      set.status = 500;
      return {
        found: false,
        error: error instanceof Error ? error.message : "Detection failed",
      };
    }
  }, {
    params: t.Object({
      submissionId: t.String(),
    }),
  })

  // Upload markscheme endpoint
  .post("/submit/markscheme", async ({ body, set }) => {
    try {
      const file = body.file as unknown as File;
      const submissionId = body.submissionId as string;

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
  function toProxyUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const keyParam = urlObj.searchParams.get("X-Amz-Key");
      if (keyParam) {
        return `/api/file/${encodeURIComponent(keyParam)}`;
      }
      const pathParts = urlObj.pathname.split("/");
      const key = pathParts[pathParts.length - 1];
      if (key) {
        return `/api/file/${encodeURIComponent(decodeURIComponent(key))}`;
      }
    } catch (e) {
      console.error("Failed to parse URL:", e);
    }
    return url;
  }

  function resolveFileUrl(url: string): string {
    if (url.startsWith("http")) {
      return url;
    }
    if (url.startsWith("/api/file/")) {
      const key = decodeURIComponent(url.replace("/api/file/", ""));
      return `https://pub-8e3e109443c141c28ee3762d7476813f.r2.dev/${key}`;
    }
    return url;
  }

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

    // Get markscheme text
    let markschemeText = submission.markschemeText || "";
    if (!markschemeText && submission.markschemeFileUrl) {
      const msUrl = resolveFileUrl(submission.markschemeFileUrl);
      const msUrlLower = msUrl.toLowerCase();
      if (msUrlLower.includes(".txt") || msUrlLower.endsWith("txt")) {
        const response = await fetch(msUrl);
        markschemeText = await response.text();
      } else {
        // Use AI to extract from image
        try {
          const { extractTextFromFile } = await import("../../lib/ocr/client");
          markschemeText = await extractTextFromFile(msUrl);
        } catch (e) {
          console.error("Failed to extract markscheme:", e);
        }
      }
    }

    // Use multimodal AI to grade directly from images (no OCR needed)
    const paperImageUrl = resolveFileUrl(paperUrls[0]);
    console.log("🖼️ Using multimodal AI for direct image grading...");

    let gradingResult;
    try {
      // Try direct image grading first
      gradingResult = await gradeFromImages({
        paperImageUrl: paperImageUrl,
        markschemeText: markschemeText
      });
    } catch (imageError) {
      console.warn("Direct image grading failed, falling back to text:", imageError);
      
      // Fallback: try to extract text first then grade
      const { extractTextFromFile } = await import("../../lib/ocr/client");
      let paperText = "";
      try {
        paperText = await extractTextFromFile(paperImageUrl);
      } catch {
        // If OCR fails, use a simple prompt
        paperText = "Could not extract text from image";
      }
      
      gradingResult = await gradePaper(paperText, markschemeText);
    }

    await db
      .update(submissions)
      .set({
        status: "completed",
        paperText: "Image processed by AI",
        markschemeText: markschemeText.substring(0, 10000),
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

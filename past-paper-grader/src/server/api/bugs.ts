import { Elysia, t } from "elysia";
import { db, bugReports } from "../../lib/database/client";
import { randomUUID } from "crypto";

export const bugRouter = new Elysia({ prefix: "/api/bugs" })
  .post("/report", async ({ body, set }) => {
    const { title, description, email, userId } = body as {
      title: string;
      description: string;
      email?: string;
      userId?: string;
    };

    if (!title || !description) {
      set.status = 400;
      return { error: "Title and description are required" };
    }

    try {
      const [report] = await db
        .insert(bugReports)
        .values({
          id: randomUUID(),
          title,
          description,
          email,
          userId: userId || null,
          status: "open",
        })
        .returning();

      return { success: true, id: report.id };
    } catch (error) {
      console.error("Bug report error:", error);
      set.status = 500;
      return { error: "Failed to submit bug report" };
    }
  }, {
    body: t.Object({
      title: t.String({ minLength: 3 }),
      description: t.String({ minLength: 10 }),
      email: t.Optional(t.String()),
      userId: t.Optional(t.String()),
    }),
  })

  .get("/reports", async ({ query, set }) => {
    const userId = query.userId as string;
    
    if (!userId) {
      set.status = 401;
      return { error: "Unauthorized" };
    }

    try {
      const reports = await db.query.bugReports.findMany({
        where: eq(bugReports.userId, userId),
        orderBy: (bugReports, { desc }) => [desc(bugReports.createdAt)],
      });

      return { reports };
    } catch (error) {
      console.error("Fetch bugs error:", error);
      set.status = 500;
      return { error: "Failed to fetch bug reports" };
    }
  });

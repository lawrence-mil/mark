import { Elysia, t } from "elysia";
import { Resend } from "resend";
import { db, users } from "../../lib/database/client";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

const verificationCodes = new Map<string, { code: string; email: string; expires: number }>();

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const authRouter = new Elysia({ prefix: "/api/auth" })
  .post("/send-code", async ({ body, set }) => {
    const { email } = body as { email: string };
    
    if (!email || !email.includes("@")) {
      set.status = 400;
      return { error: "Invalid email" };
    }

    const code = generateCode();
    const expires = Date.now() + 10 * 60 * 1000;

    try {
      await resend.emails.send({
        from: "Paper Grader <noreply@resend.dev>",
        to: email,
        subject: "Your verification code",
        html: `<p>Your verification code is: <strong>${code}</strong></p>
               <p>This code expires in 10 minutes.</p>`,
      });

      verificationCodes.set(email, { code, email, expires });
      
      return { success: true, message: "Code sent" };
    } catch (error) {
      console.error("Failed to send email:", error);
      set.status = 500;
      return { error: "Failed to send code" };
    }
  }, {
    body: t.Object({
      email: t.String({ format: "email" }),
    }),
  })

  .post("/verify", async ({ body, set }) => {
    const { email, code } = body as { email: string; code: string };

    const stored = verificationCodes.get(email);
    
    if (!stored) {
      set.status = 400;
      return { error: "No code sent to this email" };
    }

    if (Date.now() > stored.expires) {
      verificationCodes.delete(email);
      set.status = 400;
      return { error: "Code expired" };
    }

    if (stored.code !== code) {
      set.status = 400;
      return { error: "Invalid code" };
    }

    verificationCodes.delete(email);

    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          email,
        })
        .returning();
      user = newUser;
    }

    return { 
      success: true, 
      user: { id: user.id, email: user.email } 
    };
  }, {
    body: t.Object({
      email: t.String({ format: "email" }),
      code: t.String({ length: 6 }),
    }),
  });

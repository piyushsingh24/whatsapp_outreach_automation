import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { toErrorResponse, Errors } from "@/lib/errors";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().transform((s) => s.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid registration data", parsed.error.flatten());
    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw Errors.conflict("Email already registered");
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    await prisma.auditLog.create({ data: { userId: user.id, action: "USER_REGISTER" } });
    logger.info("user.registered", { userId: user.id });
    return Response.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

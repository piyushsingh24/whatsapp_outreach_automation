import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { contactQuerySchema } from "@/validators/contact";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const parsed = contactQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) throw Errors.validation("Invalid query", parsed.error.flatten());
    const { search, status, page, pageSize } = parsed.data;
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { businessName: { contains: search } },
        { phone: { contains: search } },
        { businessWork: { contains: search } },
      ];
    }
    const [total, contacts] = await Promise.all([
      prisma.contact.count({ where: where as never }),
      prisma.contact.findMany({
        where: where as never,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return Response.json({ contacts, total, page, pageSize });
  } catch (err) {
    return toErrorResponse(err);
  }
}

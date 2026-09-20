import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { contactQuerySchema, createContactSchema } from "@/validators/contact";
import { createManualContactForUser } from "@/services/contact/contact.service";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const parsed = contactQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) throw Errors.validation("Invalid query", parsed.error.flatten());
    const { search, status, groupId, page, pageSize } = parsed.data;
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;
    if (groupId) where.groups = { some: { groupId } };
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
        include: { groups: { include: { group: { select: { id: true, name: true, color: true } } } } },
      }),
    ]);
    return Response.json({ contacts, total, page, pageSize });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** POST /api/contacts — manually add a single contact, optionally into groups. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid contact data", parsed.error.flatten());
    const dupe = await prisma.contact.findUnique({
      where: { userId_phone: { userId, phone: parsed.data.phone } },
    });
    if (dupe) throw Errors.conflict("Another contact already uses this phone number");
    const contact = await createManualContactForUser(userId, parsed.data);
    return Response.json({ contact }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

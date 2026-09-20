import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { bulkDeleteContactsSchema } from "@/validators/contact";

/** POST /api/contacts/bulk-delete — delete selected contacts (scoped to user). */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = bulkDeleteContactsSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid bulk-delete data", parsed.error.flatten());
    const res = await prisma.contact.deleteMany({
      where: { userId, id: { in: parsed.data.contactIds } },
    });
    return Response.json({ ok: true, deleted: res.count });
  } catch (err) {
    return toErrorResponse(err);
  }
}

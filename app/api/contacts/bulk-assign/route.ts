import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { bulkAssignGroupSchema } from "@/validators/contact";

/** POST /api/contacts/bulk-assign — assign selected contacts to groups (empty groupIds = no-op). */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = bulkAssignGroupSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid bulk-assign data", parsed.error.flatten());
    const { contactIds, groupIds } = parsed.data;
    if (groupIds.length === 0) throw Errors.validation("Select at least one group");

    const [contacts, groups] = await Promise.all([
      prisma.contact.findMany({ where: { userId, id: { in: contactIds } }, select: { id: true } }),
      prisma.contactGroup.findMany({ where: { userId, id: { in: groupIds } }, select: { id: true } }),
    ]);
    if (contacts.length === 0) throw Errors.notFound("Contacts");
    if (groups.length !== groupIds.length) throw Errors.validation("One or more groups not found");

    await prisma.contactGroupMember.createMany({
      data: contacts.flatMap((c) => groups.map((g) => ({ contactId: c.id, groupId: g.id }))),
      skipDuplicates: true,
    });
    return Response.json({ ok: true, assigned: contacts.length, groups: groups.length });
  } catch (err) {
    return toErrorResponse(err);
  }
}

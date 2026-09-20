import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { groupMembersSchema } from "@/validators/group";

/** POST /api/contact-groups/[id]/members — add contacts to a group. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const group = await prisma.contactGroup.findFirst({ where: { id: params.id, userId } });
    if (!group) throw Errors.notFound("Group");
    const body = await req.json();
    const parsed = groupMembersSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid members data", parsed.error.flatten());
    const contacts = await prisma.contact.findMany({
      where: { userId, id: { in: parsed.data.contactIds } },
      select: { id: true },
    });
    if (contacts.length === 0) throw Errors.notFound("Contacts");
    await prisma.contactGroupMember.createMany({
      data: contacts.map((c) => ({ groupId: group.id, contactId: c.id })),
      skipDuplicates: true,
    });
    return Response.json({ ok: true, added: contacts.length });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** DELETE /api/contact-groups/[id]/members — remove contacts from a group. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const group = await prisma.contactGroup.findFirst({ where: { id: params.id, userId } });
    if (!group) throw Errors.notFound("Group");
    const body = await req.json().catch(() => ({}));
    const parsed = groupMembersSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid members data", parsed.error.flatten());
    const res = await prisma.contactGroupMember.deleteMany({
      where: { groupId: group.id, contactId: { in: parsed.data.contactIds } },
    });
    return Response.json({ ok: true, removed: res.count });
  } catch (err) {
    return toErrorResponse(err);
  }
}

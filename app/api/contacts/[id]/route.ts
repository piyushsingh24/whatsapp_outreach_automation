import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { updateContactSchema } from "@/validators/contact";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const contact = await prisma.contact.findFirst({
      where: { id: params.id, userId },
      include: { groups: { include: { group: { select: { id: true, name: true, color: true } } } } },
    });
    if (!contact) throw Errors.notFound("Contact");
    const campaigns = await prisma.campaignContact.findMany({
      where: { contactId: contact.id },
      include: { campaign: { select: { id: true, name: true, status: true } } },
    });
    const messages = await prisma.message.findMany({
      where: { contactId: contact.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return Response.json({ contact, campaigns, messages });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid contact data", parsed.error.flatten());
    const existing = await prisma.contact.findFirst({ where: { id: params.id, userId } });
    if (!existing) throw Errors.notFound("Contact");
    if (parsed.data.phone && parsed.data.phone !== existing.phone) {
      const dupe = await prisma.contact.findUnique({
        where: { userId_phone: { userId, phone: parsed.data.phone } },
      });
      if (dupe) throw Errors.conflict("Another contact already uses this phone number");
    }
    const updated = await prisma.contact.update({ where: { id: existing.id }, data: parsed.data as never });
    if (Array.isArray((body as { groupIds?: unknown }).groupIds)) {
      const groupIds = ((body as { groupIds: unknown }).groupIds as string[]).filter(
        (g): g is string => typeof g === "string" && g.length > 0
      ).slice(0, 10);
      const validGroups =
        groupIds.length > 0
          ? await prisma.contactGroup.findMany({ where: { userId, id: { in: groupIds } }, select: { id: true } })
          : [];
      await prisma.contactGroupMember.deleteMany({ where: { contactId: existing.id } });
      if (validGroups.length > 0) {
        await prisma.contactGroupMember.createMany({
          data: validGroups.map((g) => ({ groupId: g.id, contactId: existing.id })),
          skipDuplicates: true,
        });
      }
    }
    const withGroups = await prisma.contact.findUnique({
      where: { id: existing.id },
      include: { groups: { include: { group: { select: { id: true, name: true, color: true } } } } },
    });
    return Response.json({ contact: withGroups ?? updated });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const existing = await prisma.contact.findFirst({ where: { id: params.id, userId } });
    if (!existing) throw Errors.notFound("Contact");
    await prisma.contact.delete({ where: { id: existing.id } });
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

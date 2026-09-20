import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { updateGroupSchema } from "@/validators/group";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = updateGroupSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid group data", parsed.error.flatten());
    const existing = await prisma.contactGroup.findFirst({ where: { id: params.id, userId } });
    if (!existing) throw Errors.notFound("Group");
    if (parsed.data.name && parsed.data.name !== existing.name) {
      const dupe = await prisma.contactGroup.findUnique({
        where: { userId_name: { userId, name: parsed.data.name } },
      });
      if (dupe) throw Errors.conflict("A group with this name already exists");
    }
    const group = await prisma.contactGroup.update({ where: { id: existing.id }, data: parsed.data });
    return Response.json({ group });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireUserId();
    const existing = await prisma.contactGroup.findFirst({ where: { id: params.id, userId } });
    if (!existing) throw Errors.notFound("Group");
    await prisma.contactGroup.delete({ where: { id: existing.id } });
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

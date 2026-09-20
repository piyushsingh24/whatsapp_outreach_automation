import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse, Errors } from "@/lib/errors";
import { createGroupSchema } from "@/validators/group";

export async function GET() {
  try {
    const userId = await requireUserId();
    const groups = await prisma.contactGroup.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { _count: { select: { members: true } } },
    });
    return Response.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        color: g.color,
        memberCount: g._count.members,
        createdAt: g.createdAt,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) throw Errors.validation("Invalid group data", parsed.error.flatten());
    const existing = await prisma.contactGroup.findUnique({
      where: { userId_name: { userId, name: parsed.data.name } },
    });
    if (existing) throw Errors.conflict("A group with this name already exists");
    const group = await prisma.contactGroup.create({ data: { userId, ...parsed.data } });
    return Response.json({ group }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

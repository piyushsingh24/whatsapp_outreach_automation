import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toErrorResponse } from "@/lib/errors";
import { validateUploadFile, parseContactFile } from "@/services/excel/excel.service";
import { importContactsForUser } from "@/services/contact/contact.service";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST /api/contacts/import — multipart form with `file`. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: "No file uploaded (field: file)" } },
        { status: 400 }
      );
    }
    validateUploadFile(file.name, file.size);
    const buffer = Buffer.from(await file.arrayBuffer());
    logger.info("contacts.upload", { userId, fileName: file.name, size: file.size });

    let parsed;
    try {
      parsed = await parseContactFile(buffer, file.name);
    } catch (err) {
      return Response.json(
        { error: { code: "VALIDATION_ERROR", message: (err as Error).message } },
        { status: 400 }
      );
    }

    const summary = await importContactsForUser(userId, parsed.rows, parsed.errors, parsed.totalRows, file.name);
    const rawGroupId = form.get("groupId");
    const groupId = typeof rawGroupId === "string" && rawGroupId.length > 0 ? rawGroupId : null;
    if (groupId && summary.batchId && summary.importedRows > 0) {
      const group = await prisma.contactGroup.findFirst({ where: { id: groupId, userId } });
      if (group) {
        const batchContacts = await prisma.contact.findMany({
          where: { importBatchId: summary.batchId },
          select: { id: true },
        });
        if (batchContacts.length > 0) {
          await prisma.contactGroupMember.createMany({
            data: batchContacts.map((c) => ({ groupId: group.id, contactId: c.id })),
            skipDuplicates: true,
          });
        }
      }
    }
    await prisma.auditLog.create({
      data: { userId, action: "FILE_UPLOADED", metadata: { fileName: file.name, ...summary } },
    }).catch(() => undefined);
    logger.info("contacts.imported", { userId, ...summary, errors: undefined });
    return Response.json({ summary }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

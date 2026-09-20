import { prisma } from "@/lib/prisma";
import type { ImportSummary } from "@/types";

interface ValidRow {
  name: string;
  businessName: string;
  phone: string;
  businessWork: string;
  rowNumber: number;
}

export interface ManualContactInput {
  name: string;
  businessName: string;
  phone: string;
  businessWork: string;
  groupIds?: string[];
}

/** Verify group ids belong to the user; returns the valid subset. */
export async function resolveUserGroupIds(userId: string, groupIds: string[] = []): Promise<string[]> {
  if (!groupIds.length) return [];
  const groups = await prisma.contactGroup.findMany({
    where: { userId, id: { in: groupIds } },
    select: { id: true },
  });
  return groups.map((g) => g.id);
}

/** Dedupe + insert validated rows for a user. Returns import summary. */
export async function importContactsForUser(
  userId: string,
  rows: ValidRow[],
  parseErrors: ImportSummary["errors"],
  totalRows: number,
  fileName: string
): Promise<ImportSummary> {
  const seenInFile = new Set<string>();
  const fileDupes: ValidRow[] = [];
  const uniqueRows: ValidRow[] = [];
  for (const r of rows) {
    if (seenInFile.has(r.phone)) fileDupes.push(r);
    else {
      seenInFile.add(r.phone);
      uniqueRows.push(r);
    }
  }

  const existing = uniqueRows.length
    ? await prisma.contact.findMany({
        where: { userId, phone: { in: uniqueRows.map((r) => r.phone) } },
        select: { phone: true },
      })
    : [];
  const existingPhones = new Set(existing.map((c) => c.phone));
  const toInsert = uniqueRows.filter((r) => !existingPhones.has(r.phone));
  const dbDupeCount = uniqueRows.length - toInsert.length;

  const batch = await prisma.importBatch.create({
    data: {
      userId,
      fileName,
      totalRows,
      validRows: rows.length,
      invalidRows: parseErrors.length,
      duplicateRows: fileDupes.length + dbDupeCount,
      importedRows: toInsert.length,
      errors: parseErrors.slice(0, 100) as unknown as object,
    },
  });

  if (toInsert.length > 0) {
    // Chunked createMany (MySQL packet safety)
    const CHUNK = 500;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      await prisma.contact.createMany({
        data: chunk.map((r) => ({
          userId,
          name: r.name,
          businessName: r.businessName,
          phone: r.phone,
          businessWork: r.businessWork,
          status: "READY",
          importSource: fileName,
          importBatchId: batch.id,
        })),
        skipDuplicates: true,
      });
    }
    await prisma.auditLog.create({
      data: { userId, action: "CONTACT_IMPORTED", metadata: { batchId: batch.id, count: toInsert.length, fileName } },
    });
  }

  const errors: ImportSummary["errors"] = [
    ...parseErrors,
    ...fileDupes.map((r) => ({ row: r.rowNumber, phone: r.phone, error: "Duplicate phone in file" })),
  ];

  return {
    totalRows,
    validRows: rows.length,
    invalidRows: parseErrors.length,
    duplicateRows: fileDupes.length + dbDupeCount,
    importedRows: toInsert.length,
    errors: errors.slice(0, 200),
    batchId: batch.id,
  };
}

/** Create a single contact manually, optionally assigning groups. */
export async function createManualContactForUser(userId: string, input: ManualContactInput) {
  const validGroupIds = await resolveUserGroupIds(userId, input.groupIds ?? []);
  const contact = await prisma.contact.create({
    data: {
      userId,
      name: input.name,
      businessName: input.businessName,
      phone: input.phone,
      businessWork: input.businessWork,
      status: "READY",
      importSource: "manual",
    },
    include: { groups: { include: { group: true } } },
  });
  if (validGroupIds.length > 0) {
    await prisma.contactGroupMember.createMany({
      data: validGroupIds.map((groupId) => ({ groupId, contactId: contact.id })),
      skipDuplicates: true,
    });
  }
  await prisma.auditLog
    .create({
      data: { userId, action: "CONTACT_IMPORTED", metadata: { count: 1, source: "manual", phone: input.phone } },
    })
    .catch(() => undefined);
  return prisma.contact.findUnique({
    where: { id: contact.id },
    include: { groups: { include: { group: true } } },
  });
}

export interface ManualBulkResult {
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  errors: Array<{ row: number; phone?: string; error: string }>;
  contacts: Array<{ id: string; phone: string }>;
}

/** Bulk-create manually entered contacts (single + paste flow, max 100). */
export async function createManualContactsForUser(
  userId: string,
  rows: ManualContactInput[]
): Promise<ManualBulkResult> {
  const seen = new Set<string>();
  const dupes: Array<{ row: number; phone?: string; error: string }> = [];
  const unique: Array<ManualContactInput & { rowNumber: number }> = [];
  rows.forEach((r, i) => {
    if (seen.has(r.phone)) dupes.push({ row: i + 1, phone: r.phone, error: "Duplicate phone in request" });
    else {
      seen.add(r.phone);
      unique.push({ ...r, rowNumber: i + 1 });
    }
  });

  const existing =
    unique.length > 0
      ? await prisma.contact.findMany({
          where: { userId, phone: { in: unique.map((r) => r.phone) } },
          select: { phone: true },
        })
      : [];
  const existingPhones = new Set(existing.map((c) => c.phone));
  const dbDupes = unique.filter((r) => existingPhones.has(r.phone));
  const toInsert = unique.filter((r) => !existingPhones.has(r.phone));

  const created: Array<{ id: string; phone: string }> = [];
  for (const r of toInsert) {
    const contact = await prisma.contact.create({
      data: {
        userId,
        name: r.name,
        businessName: r.businessName,
        phone: r.phone,
        businessWork: r.businessWork,
        status: "READY",
        importSource: "manual",
      },
      select: { id: true, phone: true },
    });
    created.push(contact);
    const gids = await resolveUserGroupIds(userId, r.groupIds ?? []);
    if (gids.length > 0) {
      await prisma.contactGroupMember.createMany({
        data: gids.map((groupId) => ({ groupId, contactId: contact.id })),
        skipDuplicates: true,
      });
    }
  }

  if (created.length > 0) {
    await prisma.auditLog
      .create({
        data: { userId, action: "CONTACT_IMPORTED", metadata: { count: created.length, source: "manual-bulk" } },
      })
      .catch(() => undefined);
  }

  return {
    totalRows: rows.length,
    importedRows: created.length,
    duplicateRows: dupes.length + dbDupes.length,
    errors: [
      ...dupes,
      ...dbDupes.map((r) => ({ row: r.rowNumber, phone: r.phone, error: "Contact with this phone already exists" })),
    ],
    contacts: created,
  };
}

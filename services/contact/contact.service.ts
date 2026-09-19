import { prisma } from "@/lib/prisma";
import type { ImportSummary } from "@/types";

interface ValidRow {
  name: string;
  businessName: string;
  phone: string;
  businessWork: string;
  rowNumber: number;
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

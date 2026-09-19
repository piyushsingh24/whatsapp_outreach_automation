import ExcelJS from "exceljs";
import { contactRowSchema } from "@/validators/contact";
import { normalizePhone } from "@/services/contact/phone";
import type { ImportSummary } from "@/types";

const REQUIRED_HEADERS = ["name", "business name", "phone number", "business work"];
const MAX_ROWS = 5000;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function canon(h: unknown): string {
  return String(h ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function mapHeaderIndex(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    map[canon(h)] = i;
  });
  return map;
}

/** Parse an uploaded Excel/CSV buffer into validated rows. Never throws away all rows for one bad row. */
export async function parseContactFile(
  buffer: Buffer,
  fileName: string
): Promise<{ rows: Array<{ name: string; businessName: string; phone: string; businessWork: string; rowNumber: number }>; errors: ImportSummary["errors"]; totalRows: number }> {
  const lower = fileName.toLowerCase();
  const isCsv = lower.endsWith(".csv");
  const wb = new ExcelJS.Workbook();
  if (isCsv) {
    // ExcelJS csv read expects a stream; use worksheet directly
    const ws = wb.addWorksheet("contacts");
    await (wb as unknown as { csv: { read: (s: NodeJS.ReadableStream, o?: object) => Promise<unknown> } }).csv.read(
      streamFromBuffer(buffer),
      { parserOptions: { skipEmptyLines: true } } as never
    ).catch(async () => {
      // Fallback: manual CSV parse (simple, handles quoted commas)
      const text = buffer.toString("utf-8");
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      lines.forEach((line, idx) => {
        const cells = splitCsvLine(line);
        const row = ws.getRow(idx + 1);
        cells.forEach((c, j) => row.getCell(j + 1).value = c);
        row.commit();
      });
    });
    void ws;
  } else {
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  }

  const ws = wb.worksheets[0];
  if (!ws) throw new Error("No worksheet found in file");
  const errors: ImportSummary["errors"] = [];
  const rows: Array<{ name: string; businessName: string; phone: string; businessWork: string; rowNumber: number }> = [];

  const headerRowValues: unknown[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell) => headerRowValues.push(cell.value));
  // ExcelJS eachCell skips trailing empties; also read by column count
  const colCount = ws.columnCount || headerRowValues.length;
  for (let c = headerRowValues.length; c < colCount; c++) headerRowValues.push(ws.getRow(1).getCell(c + 1).value);

  const headerMap = mapHeaderIndex(headerRowValues);
  const missing = REQUIRED_HEADERS.filter((h) => !(h in headerMap));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(", ")}. Expected: Name, Business Name, Phone Number, Business Work`);
  }

  const idxName = headerMap["name"];
  const idxBiz = headerMap["business name"];
  const idxPhone = headerMap["phone number"];
  const idxWork = headerMap["business work"];

  let totalRows = 0;
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const cells = (Array.isArray(row.values) ? row.values : []) as unknown[];
    const get = (i: number) => {
      const v = cells[i + 1]; // exceljs values are 1-indexed
      if (v === null || v === undefined) return "";
      if (typeof v === "object" && v !== null && "text" in (v as object)) return String((v as { text: unknown }).text);
      return String(v).trim();
    };
    const name = get(idxName);
    const businessName = get(idxBiz);
    const phoneRaw = get(idxPhone);
    const businessWork = get(idxWork);
    if (!name && !businessName && !phoneRaw && !businessWork) return; // skip empty row
    totalRows++;
    if (totalRows > MAX_ROWS) {
      errors.push({ row: rowNumber, error: `Row limit exceeded (max ${MAX_ROWS})` });
      return;
    }
    const phone = normalizePhone(phoneRaw);
    const parsed = contactRowSchema.safeParse({ name, businessName, phone: phone ?? phoneRaw, businessWork });
    if (!parsed.success) {
      errors.push({ row: rowNumber, phone: phoneRaw, error: parsed.error.issues.map((i) => i.message).join("; ") });
      return;
    }
    rows.push({ ...parsed.data, rowNumber });
  });

  return { rows, errors, totalRows };
}

export function validateUploadFile(fileName: string, sizeBytes: number) {
  const lower = fileName.toLowerCase();
  const ok = lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv");
  if (!ok) throw new Error("Unsupported file format. Upload .xlsx, .xls or .csv");
  if (sizeBytes > MAX_FILE_BYTES) throw new Error("File too large (max 10 MB)");
}

function streamFromBuffer(buffer: Buffer): NodeJS.ReadableStream {
  const { Readable } = require("stream") as typeof import("stream");
  const s = new Readable();
  s.push(buffer);
  s.push(null);
  return s;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out.map((s) => s.replace(/^"|"$/g, ""));
}

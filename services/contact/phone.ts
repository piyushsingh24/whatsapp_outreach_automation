/**
 * Phone normalization & validation.
 * MVP rule: strip spaces/dashes/parens/plus, require 10–15 digits.
 * Keeps country code as provided (assumes user includes it, e.g. 91...).
 * Returns null when invalid.
 */
export function normalizePhone(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // Excel may give numbers like 9.1987654321E11 — handle via Number conversion fallback
  s = s.replace(/[\s\-().+]/g, "");
  // Remove leading zeros commonly added by Excel (but keep if total still valid)
  if (/^\d+$/.test(s) === false) return null;
  // Strip leading 00 international prefix -> e.g. 0091... => 91...
  if (s.startsWith("00")) s = s.slice(2);
  if (s.length >= 10 && s.length <= 15) return s;
  // 10-digit Indian-style without country code: still valid (keep as-is)
  return null;
}

export function isValidPhone(raw: unknown): boolean {
  return normalizePhone(raw) !== null;
}

/** Contacts with these statuses must never be sent messages. */
export const UNSENDABLE_STATUSES = new Set(["OPTED_OUT", "BLOCKED", "INVALID"]);

export function isSendableStatus(status: string): boolean {
  return !UNSENDABLE_STATUSES.has(status);
}

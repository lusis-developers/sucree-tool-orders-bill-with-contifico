/**
 * Normalizes a string by removing accents (tildes) and converting to lowercase.
 * Useful for matching names across different systems with inconsistent encoding/orthography.
 */
export function normalizeString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

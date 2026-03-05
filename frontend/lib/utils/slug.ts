/**
 * Converts a servicebook name (or any string) to a URL slug.
 * e.g. "Air Duct Cleaning" -> "air-duct-cleaning"
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

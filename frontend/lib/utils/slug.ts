/** Unicode dash/minus characters treated as word separators (not kept as literal "-"). */
const UNICODE_DASHES = /[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g;

/**
 * Converts a servicebook name (or any string) to a URL slug.
 * e.g. "Air Duct Cleaning" -> "air-duct-cleaning"
 * Symbols (including em/en dashes) become single hyphens; runs collapse to one dash.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(UNICODE_DASHES, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Build a unique job URL slug from title/customer and id. e.g. "ac-repair-550e8400-e29b-41d4-a716-446655440000" */
export function jobSlug(titleOrCustomer: string | undefined, id: string): string {
  const segment = titleOrCustomer?.trim()
    ? slugify(titleOrCustomer)
    : "job";
  return `${segment}-${id}`;
}

/** UUID pattern used to find the job id at the end of a slug (single-dash format). */
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Parse a job slug and return the job id. Handles "title-id", legacy "title--id", or plain "id". */
export function parseJobSlug(slug: string): string {
  const match = slug.match(UUID_REGEX);
  if (match) {
    return match[0];
  }
  const lastDoubleDash = slug.lastIndexOf("--");
  if (lastDoubleDash !== -1) {
    return slug.slice(lastDoubleDash + 2);
  }
  return slug;
}

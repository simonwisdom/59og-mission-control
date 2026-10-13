// The last part of a page's public link, /p/<slug>: lowercase letters, digits and single dashes

export const SLUG_MAX = 60;

// "A Room in Our House!" → "a-room-in-our-house"
export function slugify(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

export function isValidSlug(slug: string) {
  return slug.length > 0 && slug.length <= SLUG_MAX && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

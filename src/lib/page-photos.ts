// Photos uploaded to a page appear in its Markdown as ![description](/page-images/<id>)
const PHOTO = /!\[([^\]]*)\]\((\/page-images\/\d+)\)/g;

export type PagePhoto = { alt: string; url: string };

// Every uploaded photo in the page, in order, once each
export function pagePhotos(markdown: string): PagePhoto[] {
  const seen = new Set<string>();
  const photos: PagePhoto[] = [];
  for (const [, alt, url] of markdown.matchAll(PHOTO)) {
    if (seen.has(url)) continue;
    seen.add(url);
    photos.push({ alt, url });
  }
  return photos;
}

export const firstPhoto = (markdown: string) => pagePhotos(markdown)[0]?.url ?? null;

// Take one photo out of the page, with the blank line that came after it
export function removePhoto(markdown: string, url: string) {
  return markdown.replace(new RegExp(`!\\[[^\\]]*\\]\\(${url.replace(/[/]/g, "\\/")}\\)\\n{0,2}`, "g"), "");
}

"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { pagePhotos, removePhoto } from "@/lib/page-photos";
import { PageBody } from "../../../page-body";
import { deletePage, savePage, uploadImage, type SaveState } from "../actions";

type EditablePage = {
  id: number;
  title: string;
  slug: string;
  body: string;
  published: boolean;
  updatedAt: string;
};

// Photos are shrunk in the browser so uploads stay small and quick on a phone
const PHOTO_MAX_SIDE = 1600;

async function shrinkPhoto(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't read that photo"))), "image/jpeg", 0.85),
  );
}

// The site's address, known only in the browser
const useOrigin = () =>
  useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

export function Editor({ page }: { page: EditablePage }) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [body, setBody] = useState(page.body);
  const [published, setPublished] = useState(page.published);
  const [saved, setSaved] = useState({ title: page.title, slug: page.slug, body: page.body, published: page.published });
  const [loadedAt, setLoadedAt] = useState(page.updatedAt);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const origin = useOrigin();

  const dirty = title !== saved.title || slug !== saved.slug || body !== saved.body || published !== saved.published;
  const shareUrl = `${origin}/p/${saved.slug}`;

  const [state, action, pending] = useActionState(async (prev: SaveState, formData: FormData) => {
    const result = await savePage(prev, formData);
    if (result?.savedAt) {
      setLoadedAt(result.savedAt);
      setSaved({
        title: String(formData.get("title")).trim(),
        slug: String(formData.get("slug")).trim(),
        body: String(formData.get("body")),
        published: formData.get("published") === "on",
      });
      setTitle((value) => value.trim());
      setSlug((value) => value.trim());
    }
    return result;
  }, undefined);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Put text around the selection in the body, or at the cursor when nothing is selected
  function insert(before: string, after = "", placeholder = "") {
    const box = textarea.current;
    if (!box) return;
    const { selectionStart: start, selectionEnd: end } = box;
    const selected = body.slice(start, end) || placeholder;
    setBody(body.slice(0, start) + before + selected + after + body.slice(end));
    setTab("write");
    requestAnimationFrame(() => {
      box.focus();
      box.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  // Headings and list items go on a line of their own
  const lineStart = () => {
    const at = textarea.current?.selectionStart ?? body.length;
    return at === 0 || body[at - 1] === "\n" ? "" : "\n\n";
  };

  // Upload photos one by one and put them in the text where the cursor was, each on its own line
  async function addPhotos(files: File[]) {
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (photoInput.current) photoInput.current.value = "";
    if (images.length === 0) return;
    const at = textarea.current?.selectionStart ?? body.length;
    const urls: string[] = [];
    let failed = 0;
    for (const [i, file] of images.entries()) {
      setPhotoStatus(images.length > 1 ? `Adding photo ${i + 1} of ${images.length}…` : "Adding photo…");
      try {
        const formData = new FormData();
        formData.set("image", await shrinkPhoto(file), file.type === "image/gif" ? file.name : "photo.jpg");
        const result = await uploadImage(page.id, formData);
        if ("url" in result) urls.push(result.url);
        else failed++;
      } catch {
        failed++;
      }
    }
    if (urls.length > 0) {
      const photos = urls.map((url) => `![Photo](${url})\n\n`).join("");
      setBody((text) => {
        const before = text.slice(0, at);
        const gap = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
        return before + gap + photos + text.slice(at);
      });
    }
    setPhotoStatus(
      failed === 0
        ? null
        : `${failed === images.length ? "Couldn't add" : `Added ${urls.length}, but couldn't add ${failed} of`} ${images.length === 1 ? "that photo" : "the photos"}. Try a JPEG or PNG.`,
    );
  }

  const photos = pagePhotos(body);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  return (
    <>
      <form
        // Submitted by hand rather than with action={…}: React resets a form after its action runs,
        // which puts the fields back to how they were when the page loaded
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => action(formData));
        }}
        className="grid gap-4"
      >
        <input type="hidden" name="id" value={page.id} />
        <input type="hidden" name="loadedAt" value={loadedAt} />
        <label>
          <span className="label">Title</span>
          <input
            name="title"
            required
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="input font-plate text-xl"
          />
        </label>

        <div>
          <div className="flex flex-wrap items-center gap-1 border-b border-rule pb-2">
            <button type="button" onClick={() => setTab("write")} aria-pressed={tab === "write"} className="tab">
              Write
            </button>
            <button type="button" onClick={() => setTab("preview")} aria-pressed={tab === "preview"} className="tab">
              Preview
            </button>
            <span className="mx-1 h-5 w-px bg-rule" aria-hidden />
            <button type="button" onClick={() => insert(`${lineStart()}## `, "", "Heading")} className="tool">
              Heading
            </button>
            <button type="button" onClick={() => insert("**", "**", "bold text")} className="tool font-bold">
              Bold
            </button>
            <button type="button" onClick={() => insert(`${lineStart()}- `, "", "List item")} className="tool">
              List
            </button>
            <button type="button" onClick={() => insert("[", "](https://)", "link text")} className="tool">
              Link
            </button>
          </div>

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              addPhotos([...event.dataTransfer.files]);
            }}
            className="mt-3 rounded-[2px] border-2 border-dashed border-rule p-3"
          >
            <p className="mb-2 font-medium">Photos</p>
            <div className="flex flex-wrap items-center gap-2">
              {photos.map((photo) => (
                <span key={photo.url} className="relative">
                  {/* Already shrunk on upload, so next/image has nothing to add */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.alt} className="size-16 rounded-[2px] object-cover" />
                  <button
                    type="button"
                    onClick={() => setBody((text) => removePhoto(text, photo.url))}
                    aria-label="Take this photo off the page"
                    className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full border border-rule bg-paper text-sm leading-none hover:border-danger hover:text-danger"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                disabled={photoStatus?.startsWith("Adding") ?? false}
                className="flex size-16 cursor-pointer flex-col items-center justify-center rounded-[2px] border border-rule text-xs text-ink-soft hover:border-ink hover:text-ink disabled:opacity-50"
              >
                <span className="text-2xl leading-none">+</span>
                Add photos
              </button>
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => addPhotos([...(event.target.files ?? [])])}
              />
            </div>
            <p aria-live="polite" className="mt-2 text-xs text-ink-soft">
              {photoStatus ??
                (photos.length === 0
                  ? "No photos yet. Add some, drag them here, or paste one into the text. They go where your cursor is."
                  : "New photos go where your cursor is in the text. Move a photo by moving its ![Photo](…) line.")}
            </p>
          </div>

          <textarea
            ref={textarea}
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onDragOver={(event) => event.dataTransfer.types.includes("Files") && event.preventDefault()}
            onDrop={(event) => {
              if (event.dataTransfer.files.length === 0) return;
              event.preventDefault();
              addPhotos([...event.dataTransfer.files]);
            }}
            onPaste={(event) => {
              const files = [...event.clipboardData.files];
              if (files.some((file) => file.type.startsWith("image/"))) {
                event.preventDefault();
                addPhotos(files);
              }
            }}
            rows={22}
            hidden={tab !== "write"}
            className="textbox mt-3 font-mono text-sm leading-relaxed"
          />
          {tab === "preview" && (
            <div className="mt-3 min-h-40 rounded-[2px] border border-rule p-4 sm:p-6">
              <h1 className="hand mb-6 text-3xl">{title}</h1>
              <PageBody markdown={body} />
            </div>
          )}
          <p className="mt-2 text-xs text-muted">
            Written in Markdown: <code>## Heading</code>, <code>**bold**</code>, <code>- list item</code>,{" "}
            <code>[link text](https://…)</code>. Leave a blank line between paragraphs.
          </p>
        </div>

        <div className="card grid gap-3">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="published"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">Published</span>
              <span className="block text-sm text-muted">
                Anyone with the link can read it. Untick to keep it to housemates.
              </span>
            </span>
          </label>
          <label>
            <span className="label">Link name</span>
            <span className="flex items-center gap-1">
              <span className="text-muted">/p/</span>
              <input
                name="slug"
                required
                maxLength={60}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Lowercase letters, numbers and single dashes"
                value={slug}
                onChange={(event) => setSlug(event.target.value.toLowerCase())}
                className="input font-mono text-sm"
              />
            </span>
            {slug !== saved.slug && (
              <span className="hint mt-1">Changing it breaks the old link for anyone you&apos;ve already sent it to.</span>
            )}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || !dirty} className="btn-primary">
            {pending ? "Saving…" : "Save"}
          </button>
          <span aria-live="polite" className="text-sm">
            {state?.error ? (
              <span className="text-danger">{state.error}</span>
            ) : dirty ? (
              <span className="text-ink-soft">Unsaved changes</span>
            ) : (
              <span className="text-ink-soft">All changes saved</span>
            )}
          </span>
        </div>
      </form>

      <section className="card mt-6">
        <h2 className="hand text-lg">Share</h2>
        <p className="mt-1 text-sm text-muted">
          {saved.published
            ? "Anyone with this link can read the page."
            : "Only housemates can open this link until the page is published and saved."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={shareUrl}
            onFocus={(event) => event.target.select()}
            className="input min-w-0 basis-full font-mono text-sm sm:basis-0 sm:flex-1"
          />
          <button type="button" onClick={copyLink} className="btn-secondary">
            {copied ? "Copied" : "Copy link"}
          </button>
          <a href={`/p/${saved.slug}`} target="_blank" className="btn-secondary">
            Open ↗
          </a>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {confirmDelete ? (
          <>
            <span className="text-sm">Delete this page and its photos for good?</span>
            <form action={deletePage.bind(null, page.id)}>
              <button type="submit" className="btn-secondary border-danger text-danger">
                Yes, delete
              </button>
            </form>
            <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary">
              Keep it
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="btn-secondary text-danger">
            Delete page
          </button>
        )}
      </div>
    </>
  );
}

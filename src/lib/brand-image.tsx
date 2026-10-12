import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Shared by the generated icons and link-preview image (src/app/icon.tsx, apple-icon.tsx and
// opengraph-image.tsx). Colours from docs/design-direction.md; the nameplate stays white in dark mode.
export const NAVY = "#16325c";
export const TILE = "#2f6fae";
export const PILLAR = "#c2402a";

export const plateFont = readFile(join(process.cwd(), "assets/fonts/Marcellus-Regular.ttf"));

export async function plateFonts() {
  return [{ name: "Marcellus", data: await plateFont, style: "normal" as const, weight: 400 as const }];
}

// A London street nameplate: white plate, navy keyline inside a white margin, and an optional
// red line beneath, as the site's Nameplate does with "Finsbury Park". Sizes are in pixels.
export function Plate({
  text,
  under,
  fontSize,
  border,
}: {
  text: string;
  under?: string;
  fontSize: number;
  border: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "white",
        padding: border * 2,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: `${border}px solid ${NAVY}`,
          padding: `${fontSize * 0.25}px ${fontSize * 0.45}px ${fontSize * 0.15}px`,
          fontFamily: "Marcellus",
          color: NAVY,
          letterSpacing: fontSize * 0.06,
        }}
      >
        <div style={{ fontSize, lineHeight: 1 }}>{text}</div>
        {under && <div style={{ fontSize: fontSize * 0.4, color: PILLAR, marginTop: fontSize * 0.15 }}>{under}</div>}
      </div>
    </div>
  );
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { isLoggedIn } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { POSTCARD_LABELS, formatPartySize } from "@/lib/field-labels";

// Colours from docs/design-direction.md
const paper = "#ffffff";
const ink = "#1d3326";
const inkSoft = "#55685c";
const rule = "#d9d3c7";
const brick = "#a8652f";

const assets = join(process.cwd(), "assets");
const [handFont, textFont, housePhoto] = await Promise.all([
  readFile(join(assets, "fonts/ShantellSans-Medium.ttf")),
  readFile(join(assets, "fonts/Literata-Regular.ttf")),
  readFile(join(process.cwd(), "public/house.jpg")),
]);
const houseSrc = `data:image/jpeg;base64,${housePhoto.toString("base64")}`;

// A field label above its value, like the review page.
function Field({ label, children, size = 24 }: { label: string; children: string; size?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
      <div style={{ fontSize: 17, color: inkSoft }}>{label}</div>
      <div style={{ fontSize: size, lineHeight: 1.45 }}>{children}</div>
    </div>
  );
}

// An address-side line: label and value on a ruled line.
function Line({ label, children }: { label: string; children: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, borderBottom: `2px solid ${rule}`, paddingBottom: 8 }}>
      <div style={{ fontSize: 17, color: inkSoft }}>{label}</div>
      <div style={{ fontSize: 24 }}>{children}</div>
    </div>
  );
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

// The application as the back of a postcard, sized for sharing in WhatsApp.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isLoggedIn())) return new Response("Unauthorized", { status: 401 });

  const id = Number((await params).id);
  const [app] = Number.isInteger(id)
    ? await db.select().from(applications).where(eq(applications.id, id))
    : [];
  if (!app) return new Response("Not found", { status: 404 });


  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#eef0ec", padding: 40 }}>
        <div
          style={{
            display: "flex",
            flex: 1,
            background: paper,
            border: `2px solid ${rule}`,
            boxShadow: `10px 10px 0 ${rule}`,
            fontFamily: "Literata",
            color: ink,
          }}
        >
          {/* Message side */}
          <div style={{ display: "flex", flexDirection: "column", width: 650, padding: "44px 48px", gap: 22 }}>
            <div style={{ fontFamily: "Shantell", fontSize: 42, flexShrink: 0 }}>Dear Olive Grove,</div>
            <Field label={POSTCARD_LABELS.about}>{truncate(app.about, 180)}</Field>
            {app.offering && (
              <Field label={POSTCARD_LABELS.offering} size={22}>
                {truncate(app.offering, 90)}
              </Field>
            )}
            {app.anythingElse && (
              <Field label={POSTCARD_LABELS.anythingElse} size={22}>
                {truncate(app.anythingElse, 70)}
              </Field>
            )}
            <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", flexShrink: 0 }}>
              <div style={{ fontFamily: "Shantell", fontSize: 30 }}>Love,</div>
              <div style={{ fontFamily: "Shantell", fontSize: app.name.length > 18 ? 34 : 46 }}>
                {truncate(app.name, 28)}
              </div>
            </div>
          </div>

          {/* Address side */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              borderLeft: `2px solid ${rule}`,
              padding: "44px 44px",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end", position: "relative", height: 204 }}>
              <div style={{ display: "flex", background: paper, padding: 8, border: `2px dashed ${rule}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse only renders plain img */}
                <img src={houseSrc} width={150} height={184} style={{ objectFit: "cover" }} alt="" />
              </div>
              {/* Postmark */}
              <div
                style={{
                  position: "absolute",
                  top: 70,
                  right: 150,
                  display: "flex",
                  alignItems: "center",
                  transform: "rotate(-12deg)",
                  opacity: 0.8,
                }}
              >
                <svg width="110" height="70" viewBox="0 0 110 70">
                  {[14, 28, 42, 56].map((y) => (
                    <path
                      key={y}
                      d={`M4 ${y} q 12 -9 24 0 t 24 0 t 24 0 t 24 0`}
                      fill="none"
                      stroke={brick}
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  ))}
                </svg>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 140,
                    height: 140,
                    borderRadius: 70,
                    border: `4px solid ${brick}`,
                    color: brick,
                    fontFamily: "Shantell",
                    fontSize: 19,
                  }}
                >
                  with love
                </div>
              </div>
            </div>
            <div style={{ fontFamily: "Shantell", fontSize: 23, borderBottom: `2px solid ${rule}`, paddingBottom: 8 }}>
              To: The Olive Grove, London
            </div>
            <Line label={POSTCARD_LABELS.dates}>
              {`${formatDate(app.arrivalDate)} to ${formatDate(app.departureDate)}`}
            </Line>
            <Line label={POSTCARD_LABELS.partySize}>{formatPartySize(app.partySize)}</Line>
            {app.connection && (
              <Line label={POSTCARD_LABELS.connection}>{truncate(app.connection, 40)}</Line>
            )}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 800,
      fonts: [
        { name: "Shantell", data: handFont, weight: 500, style: "normal" },
        { name: "Literata", data: textFont, weight: 400, style: "normal" },
      ],
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

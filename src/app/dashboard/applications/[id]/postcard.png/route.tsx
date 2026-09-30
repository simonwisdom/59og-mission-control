import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { isLoggedIn } from "@/lib/auth";
import { formatDate } from "@/lib/format";

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

  const people = app.partySize === 1 ? "1 person" : `${app.partySize} people`;
  const line = { borderBottom: `2px solid ${rule}`, paddingBottom: 8 };

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
            <div style={{ fontFamily: "Shantell", fontSize: 42 }}>Dear Olive Grove,</div>
            <div style={{ fontSize: 26, lineHeight: 1.5 }}>{truncate(app.about, 420)}</div>
            {app.anythingElse && (
              <div style={{ fontSize: 22, lineHeight: 1.45, color: inkSoft }}>
                {`P.S. ${truncate(app.anythingElse, 160)}`}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
              <div style={{ fontFamily: "Shantell", fontSize: 30 }}>Love,</div>
              <div style={{ fontFamily: "Shantell", fontSize: 46 }}>{truncate(app.name, 40)}</div>
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
              gap: 26,
              fontSize: 26,
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
            <div style={{ ...line, fontFamily: "Shantell", fontSize: 23 }}>To: The Olive Grove, London</div>
            <div style={line}>
              {`${formatDate(app.arrivalDate)} to ${formatDate(app.departureDate)}`}
            </div>
            <div style={line}>{people}</div>
            {app.connection && <div style={line}>{`Knows ${truncate(app.connection, 40)}`}</div>}
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

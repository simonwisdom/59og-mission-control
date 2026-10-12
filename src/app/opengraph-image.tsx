import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { Plate, plateFonts } from "@/lib/brand-image";

export const alt = "The Olive Grove, Finsbury Park";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const housePhoto = readFile(join(process.cwd(), "public/house.jpg"));

// The picture WhatsApp and iMessage show when someone shares a link to the site,
// e.g. the apply page sent to a friend: the house photo with the nameplate on it.
export default async function OpenGraphImage() {
  const house = `data:image/jpeg;base64,${(await housePhoto).toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={house} alt="" style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover" }} />
        <Plate text="THE OLIVE GROVE" under="FINSBURY PARK" fontSize={84} border={6} />
      </div>
    ),
    { ...size, fonts: await plateFonts() },
  );
}

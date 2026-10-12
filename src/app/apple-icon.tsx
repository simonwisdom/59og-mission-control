import { ImageResponse } from "next/og";
import { Plate, TILE, plateFonts } from "@/lib/brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: a nameplate with the postcode district in red, as on real London signs,
// hung on the tile-blue and white awning stripes. iOS rounds the corners itself.
export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Solid stripes as boxes: the image renderer blurs a repeating gradient */}
        <div style={{ position: "absolute", top: 0, left: 0, width: 180, height: 180, display: "flex" }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ width: 30, height: "100%", background: i % 2 ? "white" : TILE }} />
          ))}
        </div>
        <Plate text="OG" under="N4" fontSize={48} border={4} />
      </div>
    ),
    { ...size, fonts: await plateFonts() },
  );
}

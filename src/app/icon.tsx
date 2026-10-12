import { ImageResponse } from "next/og";
import { NAVY, plateFonts } from "@/lib/brand-image";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Browser tab icon: the house's initials on a tiny street nameplate. Drawn at 64px so it's
// sharp on high-density screens; browsers scale it down.
export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          border: `5px solid ${NAVY}`,
          fontFamily: "Marcellus",
          fontSize: 36,
          color: NAVY,
          letterSpacing: 1,
          paddingTop: 4,
        }}
      >
        OG
      </div>
    ),
    { ...size, fonts: await plateFonts() },
  );
}

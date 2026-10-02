import Image from "next/image";
import house from "../../../public/house.jpg";

// A stamp showing the house in miniature,
// with a perforated edge made by masking dots out of its white border.
export function Stamp() {
  return (
    <div className="drop-shadow-[0_0_1px_rgb(0_0_0/0.45)]">
      <div className="stamp relative h-[136px] w-[112px] bg-paper p-[5px]">
        <div className="relative h-full w-full overflow-hidden">
          <Image
            src={house}
            alt=""
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}

// Circular postmark with wavy cancellation lines trailing to the left.
export function Postmark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 120" aria-hidden="true" className={`text-tile ${className}`}>
      <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        {[42, 54, 66, 78].map((y) => (
          <path key={y} d={`M4 ${y} q 12 -9 24 0 t 24 0 t 24 0 t 24 0`} />
        ))}
        <circle cx="160" cy="60" r="52" />
        <circle cx="160" cy="60" r="38" />
      </g>
      <defs>
        {/* Baseline at r=41 so the capitals sit inside the band between the two rings */}
        <path id="postmark-ring" d="M160 60 m -41 0 a 41 41 0 1 1 82 0 a 41 41 0 1 1 -82 0" />
      </defs>
      {/* textLength spreads the lettering evenly around the whole ring (2π × 41 ≈ 257) */}
      <text fill="currentColor" fontSize="9.5" className="font-serif">
        <textPath href="#postmark-ring" textLength="250" lengthAdjust="spacing">
          THE OLIVE GROVE · LONDON ·
        </textPath>
      </text>
      <text x="160" y="65" textAnchor="middle" fill="currentColor" fontSize="14" className="font-hand">
        with love
      </text>
    </svg>
  );
}

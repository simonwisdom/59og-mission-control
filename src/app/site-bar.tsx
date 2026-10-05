import Link from "next/link";

// Navy top bar with the house wordmark, and the awning's scalloped edge hanging below it
export function SiteBar({ children, awning = true }: { children?: React.ReactNode; awning?: boolean }) {
  return (
    <>
      <header className="bg-[#16325c] px-5 text-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4">
          <Link href="/" className="font-sign text-sm font-bold tracking-[0.2em] uppercase">
            The Olive Grove
          </Link>
          <div className="flex items-center gap-5 font-sign text-xs font-bold tracking-[0.14em] uppercase">
            {children}
          </div>
        </div>
      </header>
      {awning && <div aria-hidden="true" className="awning-edge" />}
    </>
  );
}

// The house name as a London street nameplate
export function Nameplate({ className = "", as: Tag = "h1" }: { className?: string; as?: "h1" | "p" }) {
  return (
    <Tag className={`street-sign ${className}`}>
      The Olive Grove
      <span className="borough">Finsbury Park</span>
    </Tag>
  );
}

import type { ApplicationStatus } from "@/db/schema";

const styles: Record<ApplicationStatus, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  declined: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`rounded-[2px] px-2 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

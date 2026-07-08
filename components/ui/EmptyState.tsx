import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "default" | "danger";
};

/** Centered placeholder for the no-results and error states — one component so
 * empty and error read as the same design language, not two ad-hoc paragraphs. */
export function EmptyState({ icon, title, description, action, tone = "default" }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
      {icon ? <div className={cn("mb-1", tone === "danger" ? "text-danger" : "text-muted")}>{icon}</div> : null}
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description ? <p className="max-w-xs text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "default" | "danger";
  /** Page-level empty/error views are the document's h1. Inline ones are h2. */
  titleAs?: "h1" | "h2";
  /** Move focus to the title. The route error boundary uses this. */
  autoFocus?: boolean;
};

/** Centered placeholder for the no-results and error states — one component so
 * empty and error read as the same design language, not two ad-hoc paragraphs. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "default",
  titleAs = "h2",
  autoFocus = false
}: EmptyStateProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (autoFocus) titleRef.current?.focus();
  }, [autoFocus]);

  const Title = titleAs;
  const danger = tone === "danger";

  return (
    <div
      role={danger ? "alert" : "status"}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-surface px-6 py-12 text-center",
        // `tone` used to color only an optional icon, and no caller passes one,
        // so an error and an empty result looked identical.
        danger ? "border-danger" : "border-border"
      )}
    >
      {icon ? <div className={cn("mb-1", danger ? "text-danger" : "text-muted")}>{icon}</div> : null}
      <Title
        ref={titleRef}
        tabIndex={autoFocus ? -1 : undefined}
        className={cn("text-sm font-semibold outline-none", danger ? "text-danger" : "text-fg")}
      >
        {title}
      </Title>
      {description ? <p className="max-w-xs break-words text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

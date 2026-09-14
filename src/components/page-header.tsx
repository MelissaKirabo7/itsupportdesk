import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-3xl font-semibold sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: number | string;
  hint: string;
  tone?: "plain" | "dark" | "alert";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-6",
        tone === "dark" && "bg-primary text-primary-foreground",
        tone === "alert" && "bg-alert-soft text-foreground",
        tone === "plain" && "bg-card text-card-foreground shadow-sm",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-widest",
          tone === "dark" ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {label}
      </p>
      <p className="mt-4 font-display text-4xl font-semibold">{value}</p>
      <p
        className={cn(
          "mt-3 text-sm",
          tone === "dark" ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {hint}
      </p>
    </div>
  );
}

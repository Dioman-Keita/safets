import type * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-lg border border-border bg-card/80 p-6 backdrop-blur-lg transition-colors dark:bg-card/30",
        className,
      )}
      {...props}
    />
  );
}

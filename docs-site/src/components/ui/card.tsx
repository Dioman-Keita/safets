import type * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-lg bg-card p-6 transition-colors hover:bg-secondary/70",
        className,
      )}
      {...props}
    />
  );
}

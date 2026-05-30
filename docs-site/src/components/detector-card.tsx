import type { LucideIcon } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { Card } from "@/components/ui/card";

export function DetectorCard({
  name,
  confidence,
  summary,
  unsafe,
  safe,
  icon: Icon,
}: {
  name: string;
  confidence: string;
  summary: string;
  unsafe: string;
  safe: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="group p-0">
      <div className="flex items-start gap-4 border-b border-border p-6">
        <div className="rounded-lg border border-border p-3 text-muted">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight">{name}</h3>
            <span className="rounded-md border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle">
              {confidence}
            </span>
          </div>
          <p className="text-sm leading-6 text-muted">{summary}</p>
        </div>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <CodeBlock title="unsafe.ts" code={unsafe} />
        <CodeBlock title="safe.ts" code={safe} />
      </div>
    </Card>
  );
}

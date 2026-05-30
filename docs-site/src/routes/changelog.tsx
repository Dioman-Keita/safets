import { createFileRoute } from "@tanstack/react-router";
import { DocsLayout } from "@/components/docs-layout";
import { SiteShell } from "@/components/site-shell";
import { Card } from "@/components/ui/card";
import { changelog } from "@/lib/site-data";

export const Route = createFileRoute("/changelog")({
  component: ChangelogPage,
});

function ChangelogPage() {
  return (
    <SiteShell>
      <DocsLayout
        eyebrow="Changelog"
        title="Release notes for the SafeTS toolchain."
        description="Follow the package, GitHub Action, docs, and detector surface as the project evolves."
        toc={changelog.map((entry) => ({
          label: entry.version,
          href: `#${entry.version.replaceAll(".", "-")}`,
        }))}
      >
        <div className="grid gap-5">
          {changelog.map((entry) => (
            <Card key={entry.version} id={entry.version.replaceAll(".", "-")}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-indigo-400/10 px-3 py-1 font-mono text-xs text-indigo-200">
                  {entry.version}
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-subtle">
                  {entry.date}
                </span>
              </div>
              <h2>{entry.title}</h2>
              <ul className="mt-4 grid gap-2 text-muted">
                {entry.items.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </DocsLayout>
    </SiteShell>
  );
}

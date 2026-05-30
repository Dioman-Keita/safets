import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SearchBox } from "@/components/site-shell";
import { docsGroups } from "@/lib/site-data";

export function DocsLayout({
  eyebrow,
  title,
  description,
  children,
  toc,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  toc: Array<{ label: string; href: string }>;
}) {
  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)_14rem]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-5">
          <SearchBox />
          {docsGroups.map((group) => (
            <details key={group.title} open className="group rounded-2xl border border-border bg-card/70 p-4">
              <summary className="cursor-pointer select-none text-sm font-semibold text-foreground">
                {group.title}
              </summary>
              <div className="mt-3 grid gap-1">
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to.split("#")[0]}
                    hash={item.to.includes("#") ? item.to.split("#")[1] : undefined}
                    className="rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-white/[0.05] hover:text-foreground"
                    activeProps={{ className: "bg-indigo-400/10 text-indigo-200" }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
          ))}
        </div>
      </aside>

      <article className="min-w-0">
        <div className="mb-8 border-b border-border pb-8">
          <div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.22em] text-indigo-300">
            <Link to="/" className="text-muted hover:text-foreground">
              SafeTS
            </Link>
            <span>/</span>
            <span>{eyebrow}</span>
          </div>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{description}</p>
        </div>
        <div className="docs-content">{children}</div>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-24">
          <div className="mb-3 font-mono text-xs uppercase tracking-[0.22em] text-subtle">
            On this page
          </div>
          <nav className="grid gap-2 border-l border-border pl-4">
            {toc.map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-muted transition hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </main>
  );
}

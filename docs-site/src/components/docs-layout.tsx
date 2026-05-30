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
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_280px]">
      <aside className="hidden lg:block">
        <div className="sticky top-[4.25rem] h-[calc(100vh-4.25rem)] overflow-y-auto px-4 py-4">
          <SearchBox />
          <div className="mt-4 rounded-lg bg-card p-2">
            {docsGroups.map((group) => (
              <details key={group.title} open className="group">
                <summary className="cursor-pointer select-none rounded-sm px-2 py-2 text-sm font-semibold text-foreground marker:text-subtle hover:bg-secondary">
                  {group.title}
                </summary>
                <div className="mt-1 grid gap-1 pb-2">
                  {group.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to.split("#")[0]}
                      hash={item.to.includes("#") ? item.to.split("#")[1] : undefined}
                      className="rounded-sm px-4 py-1.5 text-sm text-muted transition hover:bg-secondary hover:text-foreground"
                      activeProps={{ className: "bg-secondary text-foreground font-semibold" }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </aside>

      <article className="docs-main min-w-0 px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 hidden items-center justify-between gap-4 lg:flex">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Link to="/" className="text-muted hover:text-foreground">
                SafeTS
              </Link>
              <span>/</span>
              <span>{eyebrow}</span>
            </div>
          </div>
          <h1 className="text-center text-balance text-4xl font-extrabold tracking-[-0.045em] text-foreground sm:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-center text-lg leading-8 text-muted">
            {description}
          </p>
          <div className="mt-10 docs-content">{children}</div>
        </div>
      </article>

      <aside className="hidden xl:block">
        <div className="sticky top-[4.25rem] h-[calc(100vh-4.25rem)] overflow-y-auto p-4 text-sm">
          <div className="rounded-lg bg-card p-5">
            <div className="mb-4 font-semibold tracking-tight text-foreground">
              On this page
            </div>
            <nav className="grid gap-3">
              {toc.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="rounded-sm text-sm text-muted transition hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </main>
  );
}

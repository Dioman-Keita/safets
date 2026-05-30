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
    <main className="border-b">
      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 pr-6 lg:py-8">
            <SearchBox />
            <div className="mt-4 space-y-2">
              {docsGroups.map((group) => (
                <details key={group.title} open className="group">
                  <summary className="cursor-pointer select-none rounded-md px-2 py-1 text-sm font-semibold text-foreground marker:text-subtle hover:bg-secondary">
                    {group.title}
                  </summary>
                  <div className="mt-1 grid gap-1 pb-2">
                    {group.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to.split("#")[0]}
                        hash={item.to.includes("#") ? item.to.split("#")[1] : undefined}
                        className="rounded-md px-2 py-1.5 text-sm text-muted transition hover:bg-secondary hover:text-foreground"
                        activeProps={{
                          className:
                            "text-foreground dark:text-[hsl(var(--primary-active))] font-medium",
                        }}
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

      <article className="relative min-w-0 py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_220px]">
        <div className="mx-auto w-full min-w-0 max-w-3xl">
          <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Link to="/" className="text-muted hover:text-foreground">
                SafeTS
              </Link>
              <span>/</span>
              <span>{eyebrow}</span>
            </div>
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            {description}
          </p>
          <div className="mt-10 docs-content">{children}</div>
        </div>
        <aside className="hidden text-sm xl:block">
          <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto">
            <div className="mb-2 font-medium text-foreground">
              On this page
            </div>
            <nav className="grid gap-2">
              {toc.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-muted transition hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>
        </article>
      </div>
    </main>
  );
}

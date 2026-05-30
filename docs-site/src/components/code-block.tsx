import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CodeBlock({
  code,
  language = "ts",
  title,
  className,
}: {
  code: string;
  language?: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div
      className={cn(
        "group overflow-hidden rounded-2xl border border-white/10 bg-[#070a12] shadow-2xl shadow-black/20",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#06d6a0]" />
          {title ? (
            <span className="ml-3 font-mono text-xs text-slate-400">{title}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 font-mono text-xs text-slate-400 transition hover:border-indigo-400/50 hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-sm leading-7 text-slate-200">
        <code data-language={language}>{code}</code>
      </pre>
    </div>
  );
}

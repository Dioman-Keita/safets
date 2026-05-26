export type PatternName =
  | "Unsafe property access"
  | "Unsafe destructuring"
  | "Unsafe array index access"
  | "Unprotected JSON.parse"
  | "Unsafe process.env access"
  | "Non-null assertion on nullable"
  | "Unsafe access after await"
  | "Unsafe Promise.all destructuring"
  | "Unsafe Map/Record access";

export interface CrashReport {
  file: string;
  line: number;
  col: number;
  expr: string;
  rootExpr: string;
  type: string;
  pattern: PatternName;
  confidence: "HIGH" | "MEDIUM";
  crashPath: string[];
  fallback?: boolean;
}

export interface BaselineOptions {
  includeTests: boolean;
}

export interface BaselineCrash {
  file: string;
  line: number;
  expr: string;
  pattern?: PatternName;
}

export interface Baseline {
  version: string;
  date: string;
  options?: BaselineOptions;
  crashes: BaselineCrash[];
}

export interface ProgramResult {
  program: import("typescript").Program | null;
  fallback: boolean;
  warnings: string[];
  includeTests: boolean;
  strategy: "root-tsconfig" | "workspace-tsconfigs" | "direct-scan" | "fallback";
  configFiles: string[];
  rootFileCount: number;
  filteredFileCount: number;
}

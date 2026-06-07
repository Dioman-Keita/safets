import { parentPort, workerData } from "node:worker_threads";
import { analyze, loadProgramRobust } from "./analyze.ts";
import type { CrashReport, ProgramResult } from "./utils/types.ts";

type AnalysisWorkerData = {
  root: string;
  includeTests: boolean;
};

type SerializableProgramResult = Omit<ProgramResult, "program" | "programInputs"> & {
  program: null;
};

type AnalysisWorkerResult = {
  crashes: CrashReport[];
  programResult: SerializableProgramResult;
  timings: {
    totalMs: number;
    programMs: number;
    detectorMs: number;
  };
};

const { root, includeTests } = workerData as AnalysisWorkerData;

const startedAt = performance.now();
const programStartedAt = performance.now();
const programResult = loadProgramRobust(root, includeTests);
const detectorStartedAt = performance.now();
const crashes = analyze(programResult);
const finishedAt = performance.now();

const serializableProgramResult: SerializableProgramResult = {
  program: null,
  fallback: programResult.fallback,
  warnings: programResult.warnings,
  includeTests: programResult.includeTests,
  strategy: programResult.strategy,
  configFiles: programResult.configFiles,
  rootFileCount: programResult.rootFileCount,
  filteredFileCount: programResult.filteredFileCount,
};

const result: AnalysisWorkerResult = {
  crashes,
  programResult: serializableProgramResult,
  timings: {
    totalMs: finishedAt - startedAt,
    programMs: detectorStartedAt - programStartedAt,
    detectorMs: finishedAt - detectorStartedAt,
  },
};

parentPort?.postMessage(result);

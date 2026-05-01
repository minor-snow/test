/**
 * P28c: TypeScript/JavaScript Project Layout Classifier
 *
 * Classifies a TS/JS repository's primary layout from structural signals.
 * Does NOT use AST or compiler API — only manifest + path + config signals.
 *
 * P28c-1.1: Path-based signals use runtime-only paths (excluding test/fixtures/examples).
 */
import type { TypeScriptProjectLayout, TypeScriptObservedFile } from "./types.js";
import type { ObservedFile, PackageManifestObservation, ConfigHint } from "../types.js";
export type ProjectClassifierInput = {
    readonly files: readonly ObservedFile[];
    readonly manifests: readonly PackageManifestObservation[];
    readonly configHints: readonly ConfigHint[];
    readonly allPaths: readonly string[];
    readonly packageJsonBin?: string | Record<string, string>;
    readonly packageJsonWorkspaces?: string[] | {
        packages?: string[];
    };
};
export declare function classifyTypeScriptProject(input: ProjectClassifierInput): {
    layout: TypeScriptProjectLayout;
    tsFiles: TypeScriptObservedFile[];
};

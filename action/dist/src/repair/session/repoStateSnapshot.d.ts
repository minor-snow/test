import type { RepoStateSnapshot } from "./repairSessionTypes.js";
export declare function captureRepoStateSnapshot(input: {
    repoRoot: string;
    diffBase?: string | null;
    source?: RepoStateSnapshot["source"];
}): RepoStateSnapshot;

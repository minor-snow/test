import type {
  BugFinding,
  RepairCheck,
  RepairContract,
  RepairSourceReport,
  RepairVerdict,
} from "../repair/types.js";
import type { RepairSession } from "../repair/session/repairSessionTypes.js";
import type {
  GitHubArtifactMode,
  GitHubCommentOperationResult,
  GitHubPullRequestContext,
} from "./githubActionTypes.js";

export type GitHubRepairAuditMode = "auto" | "require_plan_approval" | "require_all";

export type GitHubRepairSourceKind =
  | "existing_repair_id"
  | "agent_bug_report"
  | "inline_action_inputs";

export type GitHubRepairFailCondition =
  | RepairVerdict
  | "public_artifact_sanitizer_violation"
  | "all"
  | "none";

export type GitHubRepairInputs = {
  readonly mode: "repair";
  readonly configPath: string;
  readonly repairId?: string;
  readonly agentBugReport?: string;
  readonly repairIntent?: string;
  readonly suspectPaths: readonly string[];
  readonly failingTests: readonly string[];
  readonly mustPreserve: readonly string[];
  readonly auditMode: GitHubRepairAuditMode;
  readonly artifactMode: GitHubArtifactMode;
  readonly postComment: boolean;
  readonly failOn: readonly GitHubRepairFailCondition[];
  readonly baseSha?: string;
  readonly headSha?: string;
  readonly sourceKind: GitHubRepairSourceKind;
};

export type GitHubRepairRunPhase =
  | "checked"
  | "plan_pending_audit"
  | "intake_pending_audit";

export type GitHubRepairRenderedComment = {
  readonly marker: string;
  readonly markdown: string;
};

export type GitHubRepairRenderedSummary = {
  readonly markdown: string;
};

export type GitHubRepairArtifactCollectionResult = {
  readonly outputDir: string;
  readonly outputDirRelative: string;
  readonly copiedPublicArtifacts: readonly string[];
  readonly copiedDebugArtifacts: readonly string[];
  readonly withheldArtifacts: readonly string[];
  readonly sanitizerViolations: readonly {
    readonly file: string;
    readonly count: number;
    readonly messages: readonly string[];
  }[];
};

export type GitHubRepairExitDecision = {
  readonly shouldFail: boolean;
  readonly matchedConditions: readonly GitHubRepairFailCondition[];
  readonly reason: string;
};

export type GitHubRepairRunResult = {
  readonly inputs: GitHubRepairInputs;
  readonly prContext: GitHubPullRequestContext | null;
  readonly repairId: string;
  readonly runPhase: GitHubRepairRunPhase;
  readonly verdict: RepairVerdict;
  readonly sourceKind: GitHubRepairSourceKind;
  readonly session: RepairSession;
  readonly report: RepairSourceReport;
  readonly finding: BugFinding;
  readonly contract: RepairContract | null;
  readonly check: RepairCheck | null;
  readonly artifactCollection: GitHubRepairArtifactCollectionResult;
  readonly artifactOutputDir: string;
  readonly artifactOutputDirRelative: string;
  readonly summaryPath: string | null;
  readonly commentPath: string;
  readonly repairFeedbackPath: string | null;
  readonly exitDecision: GitHubRepairExitDecision;
  readonly commentResult: GitHubCommentOperationResult;
};

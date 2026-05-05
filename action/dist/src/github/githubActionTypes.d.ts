import type { PantheonCheckPublic, PantheonFinding } from "../cli/types.js";
import type { ChangeCheckResult, ChangeCheckVerdict } from "../change/types.js";
import type { BugFinding, RepairCheck, RepairContract, RepairSourceReport, RepairVerdict } from "../repair/types.js";
import type { RepairSession } from "../repair/session/repairSessionTypes.js";
import type { ContractGateResult } from "../policy/contractGateTypes.js";
export type GitHubFailCondition = "forbidden" | "outside_scope" | "review_required" | "sanitizer_violation" | "all" | "none" | ChangeCheckVerdict | RepairVerdict;
export type GitHubArtifactMode = "public" | "debug";
export type GitHubCommentMode = "update" | "off";
export type GitHubDisclosureLevel = "minimal" | "balanced" | "full";
export type GitHubArtifactLevel = "none" | "summary" | "full";
export type GitHubLogLevel = "quiet" | "info" | "debug";
export type GitHubActionConfig = {
    readonly intent: string;
    readonly scopePatterns: readonly string[];
    readonly reviewPatterns: readonly string[];
    readonly forbidPatterns: readonly string[];
    readonly configPath: string;
    readonly failOn: readonly GitHubFailCondition[];
    readonly postComment: boolean;
    readonly uploadArtifacts: boolean;
    readonly artifactMode: GitHubArtifactMode;
    readonly commentMode: GitHubCommentMode;
    readonly disclosure: GitHubDisclosureLevel;
    readonly artifactLevel: GitHubArtifactLevel;
    readonly logLevel: GitHubLogLevel;
    readonly baseSha?: string;
    readonly headSha?: string;
};
export type GitHubPullRequestContext = {
    readonly owner: string;
    readonly repo: string;
    readonly prNumber: number;
    readonly baseSha?: string;
    readonly headSha?: string;
    readonly title?: string;
};
export type GitHubActionEvent = {
    readonly number?: number;
    readonly repository?: {
        readonly name?: string;
        readonly owner?: {
            readonly login?: string;
        };
    };
    readonly pull_request?: {
        readonly title?: string;
        readonly base?: {
            readonly sha?: string;
        };
        readonly head?: {
            readonly sha?: string;
        };
    };
};
export type GitHubExitDecision = {
    readonly shouldFail: boolean;
    readonly matchedConditions: readonly GitHubFailCondition[];
    readonly reason: string;
};
export type GitHubRenderedComment = {
    readonly marker: string;
    readonly markdown: string;
};
export type GitHubRenderedSummary = {
    readonly markdown: string;
};
export type GitHubCommentOperationResult = {
    readonly status: "skipped";
    readonly reason: string;
} | {
    readonly status: "created";
    readonly commentId: number;
} | {
    readonly status: "updated";
    readonly commentId: number;
} | {
    readonly status: "failed";
    readonly reason: string;
};
export type GitHubSanitizerViolation = {
    readonly file: string;
    readonly count: number;
    readonly messages: readonly string[];
};
export type GitHubArtifactCollectionResult = {
    readonly outputDir: string;
    readonly outputDirRelative: string;
    readonly copiedPublicArtifacts: readonly string[];
    readonly copiedDebugArtifacts: readonly string[];
    readonly withheldArtifacts: readonly string[];
    readonly sanitizerViolations: readonly GitHubSanitizerViolation[];
};
export type GitHubActionRunResult = {
    readonly config: GitHubActionConfig;
    readonly prContext: GitHubPullRequestContext | null;
    readonly check: PantheonCheckPublic;
    readonly gateResult?: ContractGateResult;
    readonly exitDecision: GitHubExitDecision;
    readonly artifactOutputDir: string;
    readonly artifactCollection: GitHubArtifactCollectionResult;
    readonly summaryPath: string | null;
    readonly commentPath: string;
    readonly commentResult: GitHubCommentOperationResult;
};
export type GitHubGateRunResult = {
    readonly config: GitHubActionConfig;
    readonly prContext: GitHubPullRequestContext | null;
    readonly gateResult: ContractGateResult;
    readonly exitDecision: GitHubExitDecision;
    readonly artifactOutputDir: string;
    readonly artifactCollection: GitHubArtifactCollectionResult;
    readonly summaryPath: string | null;
    readonly commentPath: string;
    readonly commentResult: GitHubCommentOperationResult;
};
export type GitHubChangeInputs = {
    readonly mode: "change";
    readonly changeId: string;
    readonly configPath: string;
    readonly artifactMode: GitHubArtifactMode;
    readonly commentMode: GitHubCommentMode;
    readonly disclosure: GitHubDisclosureLevel;
    readonly artifactLevel: GitHubArtifactLevel;
    readonly logLevel: GitHubLogLevel;
    readonly postComment: boolean;
    readonly uploadArtifacts: boolean;
    readonly failOn: readonly GitHubFailCondition[];
    readonly baseSha?: string;
    readonly headSha?: string;
};
export type GitHubChangeRunResult = {
    readonly inputs: GitHubChangeInputs;
    readonly prContext: GitHubPullRequestContext | null;
    readonly check: ChangeCheckResult;
    readonly changeId: string;
    readonly changeType: string;
    readonly exitDecision: GitHubExitDecision;
    readonly artifactOutputDir: string;
    readonly artifactCollection: GitHubArtifactCollectionResult;
    readonly summaryPath: string | null;
    readonly commentPath: string;
    readonly commentResult: GitHubCommentOperationResult;
};
export type GitHubRepairAuditMode = "auto" | "require_plan_approval" | "require_all";
export type GitHubRepairSourceKind = "existing_repair_id" | "agent_bug_report" | "inline_action_inputs";
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
    readonly disclosure: GitHubDisclosureLevel;
    readonly artifactLevel: GitHubArtifactLevel;
    readonly logLevel: GitHubLogLevel;
    readonly postComment: boolean;
    readonly uploadArtifacts: boolean;
    readonly failOn: readonly GitHubFailCondition[];
    readonly baseSha?: string;
    readonly headSha?: string;
    readonly sourceKind: GitHubRepairSourceKind;
};
export type GitHubRepairRunPhase = "checked" | "plan_pending_audit" | "intake_pending_audit";
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
    readonly artifactCollection: GitHubArtifactCollectionResult;
    readonly artifactOutputDir: string;
    readonly artifactOutputDirRelative: string;
    readonly summaryPath: string | null;
    readonly commentPath: string;
    readonly repairFeedbackPath: string | null;
    readonly exitDecision: GitHubExitDecision;
    readonly commentResult: GitHubCommentOperationResult;
};
export type GitHubBlockingFinding = PantheonFinding & {
    readonly category: "forbidden" | "outside_scope";
};

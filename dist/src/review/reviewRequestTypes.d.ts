import type { RepairVerdict } from "../repair/types.js";
export type ReviewAttentionLevel = "human_review" | "blocking" | "urgent";
export type ReviewRequestStatus = "open" | "approved" | "rejected" | "revert_requested" | "closed";
export type ReviewRequestAction = "human_review" | "request_scope_expansion" | "request_replan" | "revert_file" | "approve_repair" | "create_contract";
export type ReviewRequestType = "repair_review" | "change_review" | "contract_request" | "policy_tamper_review" | "trusted_approval_required" | "fake_approval_detected" | "architecture_mapping_review" | "architecture_boundary_violation" | "architecture_forbidden_change";
export type ReviewRequest = {
    readonly schema_version: "pantheon_review_request@0.2.0";
    readonly review_id: string;
    readonly target?: {
        readonly target_type: "repair" | "change" | "architecture";
        readonly target_id: string;
        readonly legacy_repair_id?: string;
    };
    readonly repair_id?: string;
    readonly contract_revision: number;
    readonly source: "local_cli" | "github_action";
    readonly type?: ReviewRequestType;
    readonly status: ReviewRequestStatus;
    readonly attention_level: ReviewAttentionLevel;
    readonly verdict: Exclude<RepairVerdict, "pass">;
    readonly reason: string;
    readonly files: readonly {
        readonly path: string;
        readonly bucket: "review_required" | "outside_scope" | "forbidden" | "policy_sensitive" | "contract_artifact";
        readonly reason: string;
    }[];
    readonly recommended_actions: readonly ReviewRequestAction[];
    readonly pr?: {
        readonly provider: "github";
        readonly number?: number;
        readonly url?: string;
    };
    readonly created_at: string;
    readonly updated_at: string;
    readonly resolved_at?: string;
};
export type ReviewQueue = {
    readonly schema_version: "pantheon_review_queue@0.1.0";
    readonly open: readonly ReviewRequest[];
    readonly closed: readonly ReviewRequest[];
    readonly updated_at: string;
};

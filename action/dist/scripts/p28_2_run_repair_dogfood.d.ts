type DogfoodCase = {
    case_id: string;
    repo_id: string;
    project_role: string;
    variant: "allowed" | "review" | "forbidden" | "outside" | "audit";
    intent: string;
    agent_bug_report: string;
    synthetic_changed_files: {
        path: string;
        change_kind: string;
    }[];
    expected_verdict: "pass" | "requires_review" | "fail" | "requires_scope_expansion";
    human_audit_decisions?: {
        gate: "bug_intake" | "repair_plan" | "post_repair";
        decision: string;
        reason: string;
        add_review?: string[];
        add_forbid?: string[];
        add_must_preserve?: string[];
    }[];
    expected_public_artifacts: string[];
};
export declare function runDogfoodCase(c: DogfoodCase): {
    passed: boolean;
    error?: string;
    violations: number;
};
export declare function runDogfoodManifest(): {
    schema_version: string;
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    verdict_matrix: {
        pass: number;
        requires_review: number;
        fail: number;
        requires_scope_expansion: number;
        audit_variants: number;
    };
    repos: Record<string, {
        cases: number;
        passed: number;
    }>;
    artifact_sanitizer: {
        checked: number;
        violations: number;
    };
};
export {};

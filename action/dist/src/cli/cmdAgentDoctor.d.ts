export type AgentDoctorCheck = {
    readonly id: "agents_md" | "pantheon_agent_json" | "bug_report_template" | "repair_inbox_dir" | "repair_runs_dir" | "governance_dir" | "reviews_dir" | "metrics_dir" | "dist_cli" | "workflow_example" | "agent_quickstart";
    readonly label: string;
    readonly ok: boolean;
    readonly path: string;
    readonly note?: string;
};
export type AgentDoctorResult = {
    readonly repoRoot: string;
    readonly ready: boolean;
    readonly checks: readonly AgentDoctorCheck[];
    readonly nextCommands: readonly string[];
};
export declare function cmdAgentDoctor(repoRoot?: string): AgentDoctorResult;
export declare function runAgentDoctor(repoRoot?: string): AgentDoctorResult;

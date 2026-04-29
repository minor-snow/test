import type { PantheonAgentConfig, PantheonAlphaConfig } from "./types.js";

export function generateAgentsMd(): string {
  return `# AGENTS.md

You are working in a repository protected by Pantheon.

Pantheon is a repair governance layer for AI coding agents.

## Core rule

If you discover a bug, do not edit code immediately.

First create a structured bug report.

## Repair protocol

1. Create \`.pantheon/repair/inbox/agent_bug_report.json\`.
2. Run Pantheon repair intake.
3. Capture the \`repair_id\`.
4. Run repair plan.
5. Read \`repair_task.md\`.
6. Only modify files inside allowed scope.
7. Do not modify forbidden files.
8. Run repair check.
9. Follow \`repair_feedback.md\`.

## Commands

Run doctor:

npx pantheon-alpha doctor

Run intake:

npx pantheon-alpha repair intake --from .pantheon/repair/inbox/agent_bug_report.json

Run plan:

npx pantheon-alpha repair plan --repair-id <repair_id>

Run check:

npx pantheon-alpha repair check --repair-id <repair_id>

Review local human attention:

npx pantheon-alpha review list
npx pantheon-alpha review show --repair-id <repair_id>

Generate local governance metrics:

npx pantheon-alpha metrics daily
npx pantheon-alpha metrics status

## Do not

- Do not patch before creating a bug report.
- Do not use \`latest\` for correctness.
- Do not ignore \`requires_replan\`.
- Do not treat hypotheses as confirmed facts.
- Do not edit forbidden files.
- If Pantheon returns \`requires_review\`, stop modifying review-required files and wait for human approval.
`;
}

export function generatePantheonAgentJson(): PantheonAgentConfig {
  return {
    schema_version: "pantheon_agent_entry@0.1.0",
    project: "auto",
    purpose: "Pantheon repair governance",
    primary_entrypoints: {
      read_first: "AGENTS.md",
      agent_quickstart: "docs/pantheon/agent-quickstart.md",
      human_quickstart: "docs/pantheon/human-quickstart.md",
    },
    commands: {
      doctor: "npx pantheon-alpha doctor",
      repair_intake: "npx pantheon-alpha repair intake --from .pantheon/repair/inbox/agent_bug_report.json",
      repair_plan: "npx pantheon-alpha repair plan --repair-id <repair_id>",
      repair_check: "npx pantheon-alpha repair check --repair-id <repair_id>",
      review_list: "npx pantheon-alpha review list",
      review_show: "npx pantheon-alpha review show --repair-id <repair_id>",
      metrics_daily: "npx pantheon-alpha metrics daily",
      metrics_status: "npx pantheon-alpha metrics status",
    },
    repair_protocol: {
      bug_report_template: ".pantheon/repair/inbox/agent_bug_report.template.json",
      inbox: ".pantheon/repair/inbox/",
      runs: ".pantheon/repair/runs/",
      requires_repair_id: true,
      latest_is_convenience_only: true,
    },
    local_governance: {
      events: ".pantheon/governance/events.jsonl",
      review_queue: ".pantheon/reviews/review_queue.json",
      daily_metrics: ".pantheon/metrics/daily/",
    },
    github: {
      workflow: ".github/workflows/pantheon-repair.yml",
      action_mode: "repair",
    },
    hard_rules: [
      "Do not patch before bug report.",
      "Do not use latest for correctness.",
      "Do not edit forbidden files.",
      "Do not treat hypotheses as confirmed facts.",
    ],
  };
}

export function generatePantheonAlphaJson(overrides?: Partial<PantheonAlphaConfig>): PantheonAlphaConfig {
  return {
    schema_version: "pantheon_alpha_config@0.1.0",
    version: 1,
    protected: [
      ".pantheon/**",
      ".cursor/**",
      ".git/**",
      "node_modules/**",
    ],
    review_required: [],
    generated: [],
    path_roles: {},
    repo_observation: {},
    artifact_mode: "public",
    default_fail_on: [
      "fail",
      "requires_replan",
      "requires_scope_expansion",
    ],
    review_required_fails_ci: false,
    repair: {
      require_repair_id: true,
      allow_inline_repair_intent: false,
      default_audit_mode: "require_plan_approval",
    },
    github: {
      enabled: true,
      workflow_path: ".github/workflows/pantheon-repair.yml",
      post_comment: true,
      upload_artifact: true,
    },
    privacy: {
      public_artifacts_only: true,
      sanitize_public_artifacts: true,
      allow_debug_artifacts: false,
    },
    metrics: {
      enabled: true,
      mode: "local",
      generate_daily_report: true,
      include_file_paths: true,
      anonymize_paths: false,
      retention_days: 30,
    },
    review_queue: {
      enabled: true,
      local_only: true,
    },
    notifications: {
      github: {
        label_pr: true,
        mention_reviewers: false,
      },
      webhook: {
        enabled: false,
      },
    },
    ...overrides,
  } as PantheonAlphaConfig;
}

export function generateAgentBugReportTemplate(): string {
  return JSON.stringify({
    schema_version: "agent_bug_report@0.1.0",
    summary: "",
    observed_behavior: "",
    expected_behavior: "",
    evidence: [
      {
        kind: "failing_test",
        path: "",
        test_name: "",
      },
    ],
    suspected_files: [
      {
        path: "",
        confidence: "low",
        reason: "",
      },
    ],
    agent_hypothesis: "",
    requested_action: "repair_analysis",
  }, null, 2);
}

export function generateGithubWorkflow(actionRef: string): string {
  return `name: Pantheon Repair Gate

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  pantheon-repair:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: ${actionRef}
        id: pantheon
        with:
          mode: repair
          agent_bug_report: .pantheon/repair/inbox/agent_bug_report.json
          artifact_mode: public
          post_comment: true
          fail_on: fail,requires_replan,requires_scope_expansion

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: pantheon-repair-report
          path: \${{ steps.pantheon.outputs.artifact_dir }}
`;
}

export function generateHumanQuickstartMd(): string {
  return `# Pantheon Alpha Quickstart

Pantheon is a repair governance layer for AI coding agents.

It makes agents report bugs before repairing them.

The alpha workflow is:

bug report -> repair plan -> human audit -> PR diff check

Install:

npx pantheon-alpha init
npx pantheon-alpha doctor

Review queue:

npx pantheon-alpha review list

Metrics:

npx pantheon-alpha metrics daily
`;
}

export function generateAgentQuickstartMd(): string {
  return `# Pantheon Agent Quickstart

If you discover a bug, do not patch immediately.

Create a bug report first:

.pantheon/repair/inbox/agent_bug_report.json

Then run:

npx pantheon-alpha repair intake --from .pantheon/repair/inbox/agent_bug_report.json
npx pantheon-alpha repair plan --repair-id <repair_id>
npx pantheon-alpha repair check --repair-id <repair_id>

If Pantheon returns \`requires_review\`, stop modifying review-required files and run:

npx pantheon-alpha review list
npx pantheon-alpha review show --repair-id <repair_id>
`;
}

export function generateRepairProtocolMd(): string {
  return `# Repair Protocol

Pantheon expects this sequence:

1. Write an agent bug report.
2. Run repair intake.
3. Capture the repair_id.
4. Run repair plan.
5. Read repair_task.md.
6. Modify only allowed files.
7. Run repair check.
8. If Pantheon returns requires_review, stop and wait for human approval.
`;
}

export function generateTroubleshootingMd(): string {
  return `# Troubleshooting

If \`repair plan\` fails:

- Confirm \`pantheon.alpha.json\` exists.
- Confirm the repair session exists under \`.pantheon/repair/runs/\`.

If \`requires_replan\` appears:

- Re-run \`npx pantheon-alpha repair plan --repair-id <repair_id>\`.
`;
}

export function generateLocalGovernanceLogMd(): string {
  return `# Local Governance Log

Pantheon writes local governance events to:

\`.pantheon/governance/events.jsonl\`

These events are append-only and contain repair metadata only:

- repair_id
- verdict
- attention level
- bucket counts
- review/block reasons

They do not contain source code content or diff hunks.
`;
}

export function generateHumanReviewQueueMd(): string {
  return `# Human Review Queue

Pantheon stores local review requests under:

- \`.pantheon/reviews/review_queue.json\`
- \`.pantheon/reviews/review_requests/\`

Use:

\`npx pantheon-alpha review list\`
\`npx pantheon-alpha review show --repair-id <repair_id>\`
\`npx pantheon-alpha review close --repair-id <repair_id>\`
`;
}

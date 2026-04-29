import { z } from "zod";

const agentEntryPointsSchema = z.object({
  read_first: z.string().default("AGENTS.md"),
  agent_quickstart: z.string().default("docs/pantheon/agent-quickstart.md"),
  human_quickstart: z.string().default("docs/pantheon/human-quickstart.md"),
});

export const pantheonAgentConfigSchema = z.object({
  schema_version: z.literal("pantheon_agent_entry@0.1.0"),
  project: z.string().default("auto"),
  purpose: z.string().default("Pantheon repair governance"),
  primary_entrypoints: agentEntryPointsSchema.optional(),
  entrypoints: agentEntryPointsSchema.optional(),
  commands: z.object({
    doctor: z.string(),
    repair_intake: z.string(),
    repair_plan: z.string(),
    repair_check: z.string(),
    review_list: z.string().optional(),
    review_show: z.string().optional(),
    metrics_daily: z.string().optional(),
    metrics_status: z.string().optional(),
    install: z.string().optional(),
    build: z.string().optional(),
    typecheck: z.string().optional(),
    test: z.string().optional(),
  }).passthrough(),
  repair_protocol: z.object({
    bug_report_template: z.string(),
    inbox: z.string(),
    runs: z.string(),
    requires_repair_id: z.boolean(),
    latest_is_convenience_only: z.boolean(),
  }),
  local_governance: z.object({
    events: z.string(),
    review_queue: z.string(),
    daily_metrics: z.string(),
  }).optional(),
  github: z.object({
    workflow: z.string(),
    action_mode: z.enum(["repair", "boundary"]),
  }).optional(),
  hard_rules: z.array(z.string()),
}).superRefine((value, ctx) => {
  if (!value.primary_entrypoints && !value.entrypoints) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["primary_entrypoints"],
      message: "pantheon.agent.json requires primary_entrypoints or entrypoints.",
    });
  }
});

export type PantheonAgentConfig = z.infer<typeof pantheonAgentConfigSchema>;

export const pantheonAlphaConfigSchema = z.object({
  schema_version: z.literal("pantheon_alpha_config@0.1.0"),
  artifact_mode: z.enum(["public", "private", "debug"]).default("public"),
  default_fail_on: z.array(z.string()).default(["fail", "requires_replan", "requires_scope_expansion"]),
  review_required_fails_ci: z.boolean().default(false),
  repair: z.object({
    require_repair_id: z.boolean().default(true),
    allow_inline_repair_intent: z.boolean().default(false),
    default_audit_mode: z.string().default("require_plan_approval"),
  }),
  github: z.object({
    enabled: z.boolean().default(true),
    workflow_path: z.string().default(".github/workflows/pantheon-repair.yml"),
    post_comment: z.boolean().default(true),
    upload_artifact: z.boolean().default(true),
  }),
  privacy: z.object({
    public_artifacts_only: z.boolean().default(true),
    sanitize_public_artifacts: z.boolean().default(true),
    allow_debug_artifacts: z.boolean().default(false),
  }),
  metrics: z.object({
    enabled: z.boolean().default(true),
    mode: z.literal("local").default("local"),
    generate_daily_report: z.boolean().default(true),
    include_file_paths: z.boolean().default(true),
    anonymize_paths: z.boolean().default(false),
    retention_days: z.number().int().min(1).default(30),
  }).default({
    enabled: true,
    mode: "local",
    generate_daily_report: true,
    include_file_paths: true,
    anonymize_paths: false,
    retention_days: 30,
  }),
  review_queue: z.object({
    enabled: z.boolean().default(true),
    local_only: z.boolean().default(true),
  }).default({
    enabled: true,
    local_only: true,
  }),
  notifications: z.object({
    github: z.object({
      label_pr: z.boolean().default(true),
      mention_reviewers: z.boolean().default(false),
    }).default({
      label_pr: true,
      mention_reviewers: false,
    }),
    webhook: z.object({
      enabled: z.boolean().default(false),
    }).default({
      enabled: false,
    }),
  }).default({
    github: {
      label_pr: true,
      mention_reviewers: false,
    },
    webhook: {
      enabled: false,
    },
  }),
}).passthrough();

export type PantheonAlphaConfig = z.infer<typeof pantheonAlphaConfigSchema>;

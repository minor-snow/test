import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_DIR = "data/dogfood/p28_2_repair_dogfood";

type DogfoodCase = {
  case_id: string;
  repo_id: string;
  project_role: string;
  variant: "allowed" | "review" | "forbidden" | "outside" | "audit";
  intent: string;
  agent_bug_report: string;
  synthetic_changed_files: { path: string; change_kind: string }[];
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

const cases: DogfoodCase[] = [
  // ==========================================
  // HTTPX (SDK/Library)
  // ==========================================
  {
    case_id: "httpx_allowed_utils_fix",
    repo_id: "httpx",
    project_role: "python_sdk_library",
    variant: "allowed",
    intent: "Fix utility edge case.",
    agent_bug_report: "httpx/allowed_utils_fix/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "httpx/_utils.py", change_kind: "modified" },
      { path: "tests/test_utils.py", change_kind: "modified" }
    ],
    expected_verdict: "pass",
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "httpx_review_public_api_export",
    repo_id: "httpx",
    project_role: "python_sdk_library",
    variant: "review",
    intent: "Fix auth header and export new class.",
    agent_bug_report: "httpx/review_public_api_export/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "httpx/_auth.py", change_kind: "modified" },
      { path: "httpx/__init__.py", change_kind: "modified" }
    ],
    expected_verdict: "requires_review",
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "httpx_outside_release_metadata",
    repo_id: "httpx",
    project_role: "python_sdk_library",
    variant: "outside",
    intent: "Fix auth issue and update changelog.",
    agent_bug_report: "httpx/outside_release_metadata/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "httpx/_auth.py", change_kind: "modified" },
      { path: "docs/changelog.md", change_kind: "modified" }
    ],
    expected_verdict: "requires_scope_expansion",
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "httpx_audit_scope_restricted",
    repo_id: "httpx",
    project_role: "python_sdk_library",
    variant: "audit",
    intent: "Fix auth issue but human restricts scope.",
    agent_bug_report: "httpx/audit_scope_restricted/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "httpx/_auth.py", change_kind: "modified" }
    ],
    expected_verdict: "requires_review",
    human_audit_decisions: [
      { gate: "repair_plan", decision: "restrict_scope", reason: "Manual review of auth changes", add_review: ["httpx/_auth.py"] }
    ],
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "httpx_audit_plan_approved",
    repo_id: "httpx",
    project_role: "python_sdk_library",
    variant: "audit",
    intent: "Fix utils, plan explicitly approved.",
    agent_bug_report: "httpx/audit_plan_approved/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "httpx/_utils.py", change_kind: "modified" }
    ],
    expected_verdict: "pass",
    human_audit_decisions: [
      { gate: "repair_plan", decision: "approve_repair_plan", reason: "Looks good" }
    ],
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },

  // ==========================================
  // FastAPI (Service)
  // ==========================================
  {
    case_id: "fastapi_allowed_route_fix",
    repo_id: "fastapi",
    project_role: "service_backend",
    variant: "allowed",
    intent: "Fix endpoint pagination.",
    agent_bug_report: "fastapi/allowed_route_fix/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "app/api/routes/articles.py", change_kind: "modified" },
      { path: "tests/api/articles/test_articles.py", change_kind: "modified" }
    ],
    expected_verdict: "pass",
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "fastapi_review_schema_or_db_touch",
    repo_id: "fastapi",
    project_role: "service_backend",
    variant: "review",
    intent: "Fix endpoint pagination and update db schema.",
    agent_bug_report: "fastapi/review_schema_or_db_touch/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "app/api/routes/articles.py", change_kind: "modified" },
      { path: "app/db/article.py", change_kind: "modified" }
    ],
    expected_verdict: "requires_review",
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "fastapi_forbidden_alembic_migration",
    repo_id: "fastapi",
    project_role: "service_backend",
    variant: "forbidden",
    intent: "Fix endpoint pagination and add db column.",
    agent_bug_report: "fastapi/forbidden_alembic_migration/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "app/api/routes/articles.py", change_kind: "modified" },
      { path: "alembic/versions/1234_fix.py", change_kind: "added" }
    ],
    expected_verdict: "fail",
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "fastapi_audit_must_preserve_added",
    repo_id: "fastapi",
    project_role: "service_backend",
    variant: "audit",
    intent: "Fix endpoint pagination.",
    agent_bug_report: "fastapi/audit_must_preserve_added/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "app/api/routes/articles.py", change_kind: "modified" }
    ],
    expected_verdict: "pass",
    human_audit_decisions: [
      { gate: "repair_plan", decision: "add_must_preserve", reason: "Important condition", add_must_preserve: ["Do not break pagination limit semantics."] }
    ],
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },

  // ==========================================
  // Saleor (Commerce)
  // ==========================================
  {
    case_id: "saleor_allowed_product_fix",
    repo_id: "saleor",
    project_role: "django_commerce",
    variant: "allowed",
    intent: "Fix product variant logic.",
    agent_bug_report: "saleor/allowed_product_fix/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "saleor/product/models.py", change_kind: "modified" },
      { path: "saleor/product/tests/test_models.py", change_kind: "modified" }
    ],
    expected_verdict: "pass",
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "saleor_review_order_tax_touch",
    repo_id: "saleor",
    project_role: "django_commerce",
    variant: "review",
    intent: "Fix checkout fee rounding and update order tax.",
    agent_bug_report: "saleor/review_order_tax_touch/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "saleor/checkout/calculations.py", change_kind: "modified" },
      { path: "saleor/order/models.py", change_kind: "modified" }
    ],
    expected_verdict: "requires_review",
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "saleor_forbidden_payment_or_migration",
    repo_id: "saleor",
    project_role: "django_commerce",
    variant: "forbidden",
    intent: "Fix checkout fee rounding and tweak payment gateway.",
    agent_bug_report: "saleor/forbidden_payment_or_migration/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "saleor/checkout/calculations.py", change_kind: "modified" },
      { path: "saleor/payment/gateway.py", change_kind: "modified" }
    ],
    expected_verdict: "fail",
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "saleor_audit_post_repair_revert",
    repo_id: "saleor",
    project_role: "django_commerce",
    variant: "audit",
    intent: "Fix product variant logic, human rejects patch.",
    agent_bug_report: "saleor/audit_post_repair_revert/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "saleor/product/models.py", change_kind: "modified" }
    ],
    expected_verdict: "pass", // Note: The check passes, but post-repair audit reverts
    human_audit_decisions: [
      { gate: "post_repair", decision: "request_revert", reason: "Implementation is incorrect." }
    ],
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  },
  {
    case_id: "saleor_audit_post_repair_approved",
    repo_id: "saleor",
    project_role: "django_commerce",
    variant: "audit",
    intent: "Fix checkout fee rounding and update order, human approves review.",
    agent_bug_report: "saleor/audit_post_repair_approved/agent_bug_report.json",
    synthetic_changed_files: [
      { path: "saleor/checkout/calculations.py", change_kind: "modified" },
      { path: "saleor/order/models.py", change_kind: "modified" }
    ],
    expected_verdict: "requires_review", // Check requires review, human approves
    human_audit_decisions: [
      { gate: "post_repair", decision: "approve_repair", reason: "Patch is safe." }
    ],
    expected_public_artifacts: ["repair_task.md", "repair_report.md", "repair_feedback.md"]
  }
];

function generate() {
  mkdirSync(BASE_DIR, { recursive: true });

  const manifest = {
    schema_version: "p28_2_repair_dogfood@0.1.0",
    cases
  };

  writeFileSync(join(BASE_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));

  for (const c of cases) {
    const caseDir = join(BASE_DIR, c.repo_id, c.case_id.replace(`${c.repo_id}_`, ""));
    mkdirSync(caseDir, { recursive: true });

    // Generate Agent Bug Report
    const agentBugReport = {
      schema_version: "agent_bug_report@0.1.0",
      report_id: `report_${c.case_id}`,
      reported_by: { agent: "claude", session_id: "dogfood" },
      summary: c.intent,
      observed_behavior: "It is broken.",
      expected_behavior: "It should work.",
      evidence: [
        {
          kind: "failing_test",
          path: c.synthetic_changed_files.find(f => f.path.includes("test"))?.path ?? `tests/test_${c.repo_id}.py`
        }
      ],
      suspected_files: [
        {
          path: c.synthetic_changed_files[0].path,
          confidence: "high",
          reason: "Primary suspect"
        }
      ],
      agent_hypothesis: "I think this is the cause.",
      requested_action: "repair_analysis"
    };

    writeFileSync(join(caseDir, "agent_bug_report.json"), JSON.stringify(agentBugReport, null, 2));

    // Generate Synthetic Diff
    const diff = {
      schema_version: "synthetic_repair_diff@0.1.0",
      changed_files: c.synthetic_changed_files
    };

    writeFileSync(join(caseDir, "synthetic_diff.json"), JSON.stringify(diff, null, 2));
  }

  console.log(`Generated manifest and 14 case folders in ${BASE_DIR}`);
}

generate();

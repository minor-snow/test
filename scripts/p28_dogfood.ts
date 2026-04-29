/**
 * P28-5: Repair Protocol Dogfood
 *
 * Runs 3 repos × 3+ variants to verify repair governance verdicts.
 * Uses changedFilesOverride to simulate synthetic AI diffs without
 * modifying real files.
 *
 * Output: data/dogfood/p28-repair/p28_repair_summary.md
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cmdRepairPlan, cmdRepairCheck, cmdRepairAudit } from "../src/cli/cmdRepair.js";
import { repairPaths } from "../src/repair/repairArtifactLayout.js";
import type { RepairContract } from "../src/repair/types.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OUTPUT_DIR = join(import.meta.dirname ?? ".", "..", "data", "dogfood", "p28-repair");

type DogfoodCase = {
  id: string;
  repoRoot: string;
  intent: string;
  suspectPaths: string[];
  failingTests: string[];
  mustPreserve: string[];
  variants: DogfoodVariant[];
  auditVariants: DogfoodAuditVariant[];
};

type DogfoodVariant = {
  name: string;
  changedFiles: string[];
  expectedVerdict: string;
};

type DogfoodAuditVariant = {
  name: string;
  gate: "repair_plan" | "post_repair";
  decision: string;
  reason: string;
  addReview?: string[];
  addForbid?: string[];
  addMustPreserve?: string[];
  expectedStatus: string;
};

const CASES: DogfoodCase[] = [
  // -----------------------------------------------------------------------
  // Case A: httpx — SDK/library
  // -----------------------------------------------------------------------
  {
    id: "httpx-sdk",
    repoRoot: "H:/Boom/benchmarks/httpx",
    intent: "Fix auth header edge case in custom transport flow",
    suspectPaths: ["httpx/_auth.py"],
    failingTests: ["tests/test_auth.py"],
    mustPreserve: ["Do not change public API exports without review."],
    variants: [
      {
        name: "allowed",
        changedFiles: ["tests/test_auth.py"],
        expectedVerdict: "pass",
      },
      {
        name: "review",
        changedFiles: ["httpx/_auth.py"],
        expectedVerdict: "requires_review",
      },
      {
        name: "forbidden",
        changedFiles: [".pantheon/tmp/secret.py"],
        expectedVerdict: "fail",
      },
      {
        name: "outside",
        changedFiles: ["README.md"],
        expectedVerdict: "requires_scope_expansion",
      },
    ],
    auditVariants: [
      {
        name: "approve_plan",
        gate: "repair_plan",
        decision: "approve_repair_plan",
        reason: "Scope is acceptable for SDK auth fix.",
        expectedStatus: "approved_repair_plan",
      },
      {
        name: "add_forbid",
        gate: "repair_plan",
        decision: "add_forbidden_area",
        reason: "Public API exports must not be modified.",
        addForbid: ["httpx/__init__.py"],
        expectedStatus: "approved_with_modifications",
      },
    ],
  },

  // -----------------------------------------------------------------------
  // Case B: fastapi-realworld — API service
  // -----------------------------------------------------------------------
  {
    id: "fastapi-service",
    repoRoot: "H:/Boom/benchmarks/fastapi-realworld",
    intent: "Fix article feed pagination edge case",
    suspectPaths: ["app/api/routes/articles.py"],
    failingTests: ["tests/api/articles/test_article_get.py"],
    mustPreserve: ["Do not bypass auth dependencies in route handlers."],
    variants: [
      {
        name: "allowed",
        changedFiles: ["app/api/routes/articles.py"],
        expectedVerdict: "pass",
      },
      {
        name: "review",
        changedFiles: ["app/core/security.py"],
        expectedVerdict: "requires_review",
      },
      {
        name: "forbidden",
        changedFiles: ["app/api/routes/articles.py", "alembic/env.py"],
        expectedVerdict: "fail",
      },
      {
        name: "outside",
        changedFiles: ["app/api/routes/articles.py", "README.md"],
        expectedVerdict: "requires_scope_expansion",
      },
    ],
    auditVariants: [
      {
        name: "approve_plan",
        gate: "repair_plan",
        decision: "approve_repair_plan",
        reason: "Route fix scope is appropriate.",
        expectedStatus: "approved_repair_plan",
      },
      {
        name: "restrict_config",
        gate: "repair_plan",
        decision: "add_forbidden_area",
        reason: "Config changes must not be part of route fix.",
        addForbid: ["app/core/config.py"],
        expectedStatus: "approved_with_modifications",
      },
    ],
  },

  // -----------------------------------------------------------------------
  // Case C: Saleor — Django commerce
  // -----------------------------------------------------------------------
  {
    id: "saleor-commerce",
    repoRoot: "H:/Boom/salary",
    intent: "Fix checkout fee rounding when eco-packaging products are present",
    suspectPaths: ["saleor/checkout/calculations.py"],
    failingTests: ["saleor/checkout/tests/test_calculations.py"],
    mustPreserve: [
      "Do not change payment authorization behavior.",
      "Preserve existing tax rounding rules.",
    ],
    variants: [
      {
        name: "allowed",
        changedFiles: ["saleor/checkout/calculations.py"],
        expectedVerdict: "requires_review",
      },
      {
        name: "review",
        changedFiles: ["saleor/checkout/calculations.py", "saleor/order/actions.py"],
        expectedVerdict: "requires_review",
      },
      {
        name: "forbidden",
        changedFiles: ["saleor/checkout/calculations.py", "saleor/payment/gateway.py"],
        expectedVerdict: "fail",
      },
      {
        name: "outside",
        changedFiles: ["saleor/checkout/calculations.py", "README.md"],
        expectedVerdict: "requires_scope_expansion",
      },
    ],
    auditVariants: [
      {
        name: "approve_plan",
        gate: "repair_plan",
        decision: "approve_repair_plan",
        reason: "Checkout fee fix scope looks correct.",
        expectedStatus: "approved_repair_plan",
      },
      {
        name: "add_review_order_tax",
        gate: "repair_plan",
        decision: "expand_review_scope",
        reason: "Order and tax modules should remain review-required.",
        addReview: ["saleor/order/**"],
        expectedStatus: "approved_with_modifications",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

type VariantResult = {
  caseId: string;
  variantName: string;
  verdict: string;
  expectedVerdict: string;
  match: boolean;
  changedFiles: string[];
  summary: Record<string, number>;
};

type AuditResult = {
  caseId: string;
  variantName: string;
  status: string;
  expectedStatus: string;
  match: boolean;
  revision: number;
  forbiddenCount: number;
  reviewCount: number;
};

function run(): void {
  rmSync(OUTPUT_DIR, { recursive: true, force: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const variantResults: VariantResult[] = [];
  const auditResults: AuditResult[] = [];

  for (const c of CASES) {
    console.log(`\n=== ${c.id} ===`);
    const caseDir = join(OUTPUT_DIR, c.id);
    mkdirSync(caseDir, { recursive: true });

    // Clean previous repair state
    const rp = repairPaths(c.repoRoot);
    for (const p of Object.values(rp)) {
      if (existsSync(p)) rmSync(p, { recursive: true, force: true });
    }

    // --- Repair plan ---
    console.log(`  Running repair plan...`);
    try {
      cmdRepairPlan({
        repoRoot: c.repoRoot,
        intent: c.intent,
        suspectPaths: c.suspectPaths,
        failingTests: c.failingTests,
        mustPreserve: c.mustPreserve,
      });
    } catch (e) {
      console.error(`  FAIL: repair plan error: ${e}`);
      continue;
    }

    const contract = JSON.parse(readFileSync(rp.contract, "utf-8")) as RepairContract;
    console.log(`  Contract: ${contract.repair_id}`);
    console.log(`  Audit status: ${contract.audit_status}`);
    console.log(`  Allowed: ${contract.repair_scope.allowed.length}, Review: ${contract.repair_scope.review_required.length}, Forbidden: ${contract.repair_scope.forbidden.length}`);

    // --- Variants ---
    const variantDir = join(caseDir, "variants");
    mkdirSync(variantDir, { recursive: true });

    for (const v of c.variants) {
      console.log(`    Variant: ${v.name} (expect ${v.expectedVerdict})...`);

      // Reset check artifacts
      if (existsSync(rp.check)) rmSync(rp.check, { force: true });
      if (existsSync(rp.report)) rmSync(rp.report, { force: true });
      if (existsSync(rp.feedback)) rmSync(rp.feedback, { force: true });

      try {
        cmdRepairCheck({
          repoRoot: c.repoRoot,
          changedFilesOverride: v.changedFiles,
        });
      } catch (e) {
        // cmdRepairCheck doesn't throw on fail verdicts, only on missing files
      }

      const check = existsSync(rp.check)
        ? JSON.parse(readFileSync(rp.check, "utf-8"))
        : null;
      const verdict = check?.verdict ?? "error";
      const match = verdict === v.expectedVerdict;

      variantResults.push({
        caseId: c.id,
        variantName: v.name,
        verdict,
        expectedVerdict: v.expectedVerdict,
        match,
        changedFiles: v.changedFiles,
        summary: check?.summary ?? {},
      });

      // Save variant artifacts
      const vd = join(variantDir, v.name);
      mkdirSync(vd, { recursive: true });
      if (check) writeFileSync(join(vd, "check.json"), JSON.stringify(check, null, 2));
      if (existsSync(rp.report)) writeFileSync(join(vd, "report.md"), readFileSync(rp.report, "utf-8"));
      if (existsSync(rp.feedback)) writeFileSync(join(vd, "feedback.md"), readFileSync(rp.feedback, "utf-8"));

      console.log(`      Verdict: ${verdict} ${match ? "✓" : "✗ (expected " + v.expectedVerdict + ")"}`);
    }

    // --- Audit variants ---
    const auditDir = join(caseDir, "audits");
    mkdirSync(auditDir, { recursive: true });

    for (const av of c.auditVariants) {
      console.log(`    Audit: ${av.name}...`);

      try {
        cmdRepairAudit({
          repoRoot: c.repoRoot,
          gate: av.gate,
          decision: av.decision,
          reason: av.reason,
          operatorId: "dogfood",
          addReview: av.addReview ?? [],
          addForbid: av.addForbid ?? [],
          addMustPreserve: av.addMustPreserve ?? [],
        });
      } catch (e) {
        console.error(`      Audit error: ${e}`);
      }

      const updatedContract = existsSync(rp.contract)
        ? JSON.parse(readFileSync(rp.contract, "utf-8")) as RepairContract
        : null;
      const status = updatedContract?.audit_status ?? "error";
      const match = status === av.expectedStatus;

      auditResults.push({
        caseId: c.id,
        variantName: av.name,
        status,
        expectedStatus: av.expectedStatus,
        match,
        revision: updatedContract?.revision ?? -1,
        forbiddenCount: updatedContract?.repair_scope.forbidden.length ?? -1,
        reviewCount: updatedContract?.repair_scope.review_required.length ?? -1,
      });

      // Save audit contract
      const ad = join(auditDir, av.name);
      mkdirSync(ad, { recursive: true });
      if (updatedContract) writeFileSync(join(ad, "contract.json"), JSON.stringify(updatedContract, null, 2));

      console.log(`      Status: ${status} (rev ${updatedContract?.revision}) ${match ? "✓" : "✗"}`);
    }

    // Save base contract
    writeFileSync(join(caseDir, "contract.json"), JSON.stringify(contract, null, 2));
    if (existsSync(rp.task)) writeFileSync(join(caseDir, "task.md"), readFileSync(rp.task, "utf-8"));
    if (existsSync(rp.scope)) writeFileSync(join(caseDir, "scope.md"), readFileSync(rp.scope, "utf-8"));
    if (existsSync(rp.checklist)) writeFileSync(join(caseDir, "checklist.md"), readFileSync(rp.checklist, "utf-8"));
  }

  // --- Summary ---
  const totalVariants = variantResults.length;
  const passedVariants = variantResults.filter(r => r.match).length;
  const totalAudits = auditResults.length;
  const passedAudits = auditResults.filter(r => r.match).length;

  const summaryLines: string[] = [];
  summaryLines.push("# P28 Dogfood Summary");
  summaryLines.push("");
  summaryLines.push(`**Generated:** ${new Date().toISOString()}`);
  summaryLines.push("");
  summaryLines.push("## Variant Results");
  summaryLines.push("");
  summaryLines.push(`| Case | Variant | Verdict | Expected | Match |`);
  summaryLines.push(`|------|---------|---------|----------|-------|`);
  for (const r of variantResults) {
    summaryLines.push(`| ${r.caseId} | ${r.variantName} | ${r.verdict} | ${r.expectedVerdict} | ${r.match ? "✓" : "✗"} |`);
  }
  summaryLines.push("");
  summaryLines.push(`**Verdict pass rate:** ${passedVariants}/${totalVariants}`);
  summaryLines.push("");

  summaryLines.push("## Audit Results");
  summaryLines.push("");
  summaryLines.push(`| Case | Audit | Status | Expected | Rev | Match |`);
  summaryLines.push(`|------|-------|--------|----------|-----|-------|`);
  for (const r of auditResults) {
    summaryLines.push(`| ${r.caseId} | ${r.variantName} | ${r.status} | ${r.expectedStatus} | ${r.revision} | ${r.match ? "✓" : "✗"} |`);
  }
  summaryLines.push("");
  summaryLines.push(`**Audit pass rate:** ${passedAudits}/${totalAudits}`);
  summaryLines.push("");

  summaryLines.push("## Variant Details");
  summaryLines.push("");
  for (const r of variantResults) {
    summaryLines.push(`### ${r.caseId} / ${r.variantName}`);
    summaryLines.push(`- **Verdict:** ${r.verdict} (expected ${r.expectedVerdict}) ${r.match ? "✓" : "✗"}`);
    summaryLines.push(`- **Changed files:** ${r.changedFiles.join(", ")}`);
    summaryLines.push(`- **Summary:** allowed=${r.summary.allowed ?? "?"}, review=${r.summary.review_required ?? "?"}, forbidden=${r.summary.forbidden ?? "?"}, outside=${r.summary.outside_scope ?? "?"}, warnings=${r.summary.warnings ?? "?"}`);
    summaryLines.push("");
  }

  summaryLines.push("## Audit Details");
  summaryLines.push("");
  for (const r of auditResults) {
    summaryLines.push(`### ${r.caseId} / ${r.variantName}`);
    summaryLines.push(`- **Status:** ${r.status} (expected ${r.expectedStatus}) ${r.match ? "✓" : "✗"}`);
    summaryLines.push(`- **Revision:** ${r.revision}`);
    summaryLines.push(`- **Forbidden:** ${r.forbiddenCount}, Review: ${r.reviewCount}`);
    summaryLines.push("");
  }

  summaryLines.push("---");
  summaryLines.push("");
  summaryLines.push("_Auto-generated by P28-5 dogfood._");
  summaryLines.push("");

  const summaryPath = join(OUTPUT_DIR, "p28_repair_summary.md");
  writeFileSync(summaryPath, summaryLines.join("\n"));

  // JSON summary
  writeFileSync(join(OUTPUT_DIR, "p28_repair_summary.json"), JSON.stringify({
    generated_at: new Date().toISOString(),
    variant_results: variantResults,
    audit_results: auditResults,
    totals: {
      variants_total: totalVariants,
      variants_passed: passedVariants,
      audits_total: totalAudits,
      audits_passed: passedAudits,
    },
  }, null, 2));

  console.log(`\n=== P28 Dogfood Complete ===`);
  console.log(`  Variants: ${passedVariants}/${totalVariants}`);
  console.log(`  Audits: ${passedAudits}/${totalAudits}`);
  console.log(`  Output: ${summaryPath}`);

  if (passedVariants < totalVariants || passedAudits < totalAudits) {
    console.error(`\n  FAIL: ${totalVariants - passedVariants} variant(s) and ${totalAudits - passedAudits} audit(s) did not match.`);
    process.exit(1);
  }
}

run();

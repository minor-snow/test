import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { cmdRepairCheck, cmdRepairIntake, cmdRepairPlan } from "../../src/cli/cmdRepair.js";
import { cmdReviewClose } from "../../src/cli/cmdReview.js";
import { repairRunPaths } from "../../src/repair/repairArtifactLayout.js";
import { matchesPattern } from "../../src/repair/repairUtils.js";
import type { RepairContract } from "../../src/repair/types.js";
import { loadReviewQueue, loadReviewRequest } from "../../src/review/reviewQueueStore.js";

describe("cmdReview", () => {
  const tmpDir = join("test", "cli", "__tmp_review__");
  const fixtureDir = join("test", "fixtures", "repo_fixture");

  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
    cpSync(fixtureDir, tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates and closes a review request for review-required repairs", () => {
    const session = cmdRepairIntake({
      repoRoot: tmpDir,
      intent: "Fix login auth regression",
      suspectPaths: ["src/auth/login.ts"],
      failingTests: ["test/auth/login.test.ts"],
      mustPreserve: [],
    });
    cmdRepairPlan({ repoRoot: tmpDir, repairId: session.repair_id });
    const contract = JSON.parse(
      readFileSync(repairRunPaths(tmpDir, session.repair_id).contractLatest, "utf-8"),
    ) as RepairContract;
    const reviewTarget = findConcreteMatch(tmpDir, contract.repair_scope.review_required.map(entry => entry.pattern));

    expect(reviewTarget).toBeTruthy();
    cmdRepairCheck({
      repoRoot: tmpDir,
      repairId: session.repair_id,
      changedFilesOverride: [reviewTarget!],
    });

    const request = loadReviewRequest(tmpDir, session.repair_id);
    expect(request?.verdict).toBe("requires_review");
    expect(readFileSync(repairRunPaths(tmpDir, session.repair_id).check, "utf-8")).toContain("requires_review");
    expect(loadReviewQueue(tmpDir).open).toHaveLength(1);

    cmdReviewClose(tmpDir, session.repair_id);
    expect(loadReviewQueue(tmpDir).open).toHaveLength(0);
  });
});

function findConcreteMatch(repoRoot: string, patterns: readonly string[]): string | null {
  const candidates = [
    "saleor/order/models.py",
    "config/app.yaml",
    "docs/changelog.md",
    "generated/api.generated.ts",
    "src/payment/billing.ts",
  ];

  for (const candidate of candidates) {
    if (patterns.some(pattern => matchesPattern(candidate, pattern))) {
      return candidate;
    }
  }

  return null;
}

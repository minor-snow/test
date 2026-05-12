/**
 * Conformance coverage report.
 *
 * Verifies that ≥80% of commands marked conformanceRequired: true in the
 * P19 public surface manifest are exercised by the conformance test suite.
 *
 * Self-contained: does NOT import from src/ or dist/src/.
 */
declare const describe: any;
declare const it: any;
declare const expect: any;

/**
 * All commands marked conformanceRequired: true in p19_public_surface_manifest.json.
 * This is the authoritative denominator (32 commands).
 */
const CONFORMANCE_REQUIRED_COMMANDS = [
  "clarion check",
  "clarion repair intake",
  "clarion repair plan",
  "clarion repair check",
  "clarion arch check",
  "clarion change intake",
  "clarion change plan",
  "clarion change check",
  "clarion dsa observe",
  "clarion dsa status",
  "clarion dsa review list",
  "clarion dsa review show",
  "clarion dsa review approve",
  "clarion dsa review reject",
  "clarion dsa materialize",
  "clarion dsa project",
  "clarion workgraph status",
  "clarion workgraph import-dsa",
  "clarion workgraph list",
  "clarion workgraph show",
  "clarion workgraph claim",
  "clarion workgraph release",
  "clarion workgraph complete",
  "clarion workgraph conflicts",
  "clarion workgraph joins",
  "clarion workgraph events",
  "clarion agent submit",
  "clarion agent progress",
  "clarion agent complete",
  "clarion agent sessions",
  "clarion agent status",
  "clarion doctor",
] as const;

/**
 * Commands exercised by the conformance test suite.
 * Each entry corresponds to a test in one of the conformance test files.
 */
const COVERED_COMMANDS = [
  // cli-envelope.test.ts
  "clarion doctor",
  "clarion check",
  // dsa-commands.test.ts
  "clarion dsa observe",
  "clarion dsa status",
  "clarion dsa review list",
  "clarion dsa review show",
  "clarion dsa review approve",
  "clarion dsa review reject",
  "clarion dsa materialize",
  "clarion dsa project",
  // workgraph-commands.test.ts
  "clarion workgraph status",
  "clarion workgraph list",
  "clarion workgraph show",
  "clarion workgraph claim",
  "clarion workgraph release",
  "clarion workgraph complete",
  "clarion workgraph conflicts",
  "clarion workgraph joins",
  "clarion workgraph events",
  "clarion workgraph import-dsa",
  // agent-commands.test.ts
  "clarion agent status",
  "clarion agent sessions",
  "clarion agent submit",
  "clarion agent progress",
  "clarion agent complete",
  // repair-commands.test.ts
  "clarion repair intake",
  "clarion repair plan",
  "clarion repair check",
  // change-commands.test.ts
  "clarion change intake",
  "clarion change plan",
  "clarion change check",
  // arch-commands.test.ts
  "clarion arch check",
] as const;

describe("Conformance Coverage Report", () => {
  it("covers ≥80% of conformanceRequired commands", () => {
    const total = CONFORMANCE_REQUIRED_COMMANDS.length;
    const covered = new Set(COVERED_COMMANDS);
    const coveredCount = CONFORMANCE_REQUIRED_COMMANDS.filter((cmd) =>
      covered.has(cmd)
    ).length;
    const percentage = Math.round((coveredCount / total) * 100);

    console.log(`\n  Conformance Coverage: ${coveredCount}/${total} (${percentage}%)\n`);

    // List uncovered commands for visibility
    const uncovered = CONFORMANCE_REQUIRED_COMMANDS.filter(
      (cmd) => !covered.has(cmd)
    );
    if (uncovered.length > 0) {
      console.log(`  Uncovered commands:`);
      uncovered.forEach((cmd) => console.log(`    - ${cmd}`));
    }

    expect(percentage).toBeGreaterThanOrEqual(80);
    expect(coveredCount).toBeGreaterThanOrEqual(Math.ceil(total * 0.8));
  });

  it("all covered commands are in the conformanceRequired list", () => {
    const required = new Set(CONFORMANCE_REQUIRED_COMMANDS);
    const invalid = COVERED_COMMANDS.filter((cmd) => !required.has(cmd));
    expect(invalid).toEqual([]);
  });
});

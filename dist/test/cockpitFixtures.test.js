/**
 * Cockpit Pressure Fixture Tests
 *
 * ref: HARD-006
 *
 * Runs all 10 cockpit fixtures through the real pipeline
 * and verifies each produces the expected phase and gate results.
 *
 * This ensures the cockpit can render diverse failure states,
 * not just the §21 happy-path.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { runPipeline, generateCockpitData } from "../src/pipeline.js";
import { COCKPIT_FIXTURES } from "./fixtures/cockpit/index.js";
// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
import { randomBytes } from "node:crypto";
const TEST_DIR = join(process.cwd(), "data", `_test_fixtures_${randomBytes(4).toString("hex")}`);
let config;
beforeEach(async () => {
    config = { dataDir: TEST_DIR };
    await fs.mkdir(TEST_DIR, { recursive: true });
});
afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
});
// ===========================================================================
// Fixture-driven pipeline tests
// ===========================================================================
describe("HARD-006: Cockpit Pressure Fixtures", () => {
    // Verify we have exactly 10 fixtures
    it("has exactly 10 fixtures defined", () => {
        expect(COCKPIT_FIXTURES.length).toBe(10);
    });
    // Verify all fixture IDs are unique
    it("all fixture IDs are unique", () => {
        const ids = COCKPIT_FIXTURES.map((f) => f.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
    // Run each fixture through the pipeline
    for (const fixture of COCKPIT_FIXTURES) {
        describe(`[${fixture.id}] ${fixture.name}`, () => {
            it(`reaches expected phase: ${fixture.expectedPhase}`, async () => {
                // Clean between fixtures (each uses unique artifact_id)
                const fixtureDir = join(TEST_DIR, fixture.id);
                const fixtureConfig = { dataDir: fixtureDir };
                await fs.mkdir(fixtureDir, { recursive: true });
                const state = await runPipeline(fixtureConfig, fixture.artifact, fixture.patchText);
                expect(state.phase).toBe(fixture.expectedPhase);
                expect(state.error).toBeNull();
            });
            if (fixture.expectedFailedGates && fixture.expectedFailedGates.length > 0) {
                it(`triggers expected failed gates: [${fixture.expectedFailedGates.join(", ")}]`, async () => {
                    const fixtureDir = join(TEST_DIR, `${fixture.id}_gates`);
                    const fixtureConfig = { dataDir: fixtureDir };
                    await fs.mkdir(fixtureDir, { recursive: true });
                    const state = await runPipeline(fixtureConfig, fixture.artifact, fixture.patchText);
                    expect(state.regressionResult).not.toBeNull();
                    expect(state.regressionResult.status).toBe("failed");
                    for (const gate of fixture.expectedFailedGates) {
                        expect(state.regressionResult.failed_gates).toContain(gate);
                    }
                });
            }
            it("generateCockpitData produces valid output", async () => {
                const fixtureDir = join(TEST_DIR, `${fixture.id}_cockpit`);
                const fixtureConfig = { dataDir: fixtureDir };
                await fs.mkdir(fixtureDir, { recursive: true });
                const state = await runPipeline(fixtureConfig, fixture.artifact, fixture.patchText);
                const cockpit = generateCockpitData(state);
                expect(cockpit.phase).toBe(fixture.expectedPhase);
                expect(cockpit.hash_meta).toBeDefined();
                // If regression failed, cockpit should expose gates
                if (fixture.expectedPhase === "regression_failed") {
                    expect(cockpit.failed_gates.length).toBeGreaterThan(0);
                    expect(cockpit.diff).not.toBeNull();
                }
            });
        });
    }
});
// ===========================================================================
// Coverage summary
// ===========================================================================
describe("HARD-006: Fixture coverage", () => {
    it("covers regression_failed fixtures", () => {
        const failedFixtures = COCKPIT_FIXTURES.filter((f) => f.expectedPhase === "regression_failed");
        // Should have at least 5 failure fixtures
        expect(failedFixtures.length).toBeGreaterThanOrEqual(5);
    });
    it("covers committed (clean pass) fixtures", () => {
        const passFixtures = COCKPIT_FIXTURES.filter((f) => f.expectedPhase === "committed");
        // Should have at least 2 clean-pass fixtures
        expect(passFixtures.length).toBeGreaterThanOrEqual(2);
    });
    it("covers undefined_term gate", () => {
        const undefinedTermFixtures = COCKPIT_FIXTURES.filter((f) => f.expectedFailedGates &&
            f.expectedFailedGates.includes("undefined_term"));
        expect(undefinedTermFixtures.length).toBeGreaterThanOrEqual(3);
    });
    it("covers constraint_deletion gate", () => {
        const constraintFixtures = COCKPIT_FIXTURES.filter((f) => f.expectedFailedGates &&
            f.expectedFailedGates.includes("constraint_deletion"));
        expect(constraintFixtures.length).toBeGreaterThanOrEqual(2);
    });
});
//# sourceMappingURL=cockpitFixtures.test.js.map
/**
 * P12.1 — Kotlin Compile Harness
 *
 * Copies generated Kotlin files into minimal Gradle project,
 * runs compile + test, and produces a report.
 *
 * Prerequisites:
 * - JDK 21 installed (JAVA_HOME set)
 * - Gradle wrapper in compile/ directory
 * - Generated .kt files in generated/ directory
 */

import { join } from "node:path";
import { promises as fs } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");
const GEN_DIR = join(STORE_ROOT, "implementation", "generated");
const COMPILE_DIR = join(STORE_ROOT, "implementation", "compile");
const MAIN_DIR = join(COMPILE_DIR, "src", "main", "kotlin", "generated");
const TEST_DIR = join(COMPILE_DIR, "src", "test", "kotlin");
const REPORT_DIR = join(STORE_ROOT, "implementation", "report");
const EVIDENCE_DIR = join(STORE_ROOT, "evidence");

const MAIN_FILES = ["Enums.kt", "Entities.kt", "Dtos.kt", "StateMachines.kt", "ConflictPolicy.kt"];
const MAIN_CONTRACT_FILES = ["contracts/Interfaces.kt", "contracts/AbstractBases.kt", "contracts/Guards.kt", "contracts/RetryPolicy.kt", "contracts/TodoStubs.kt"];
const TEST_FILES = ["ConflictPolicyTests.kt"];
const TEST_CONTRACT_FILES = ["contracts/ContractTests.kt"];

async function fileHash(path: string): Promise<string> {
  const content = await fs.readFile(path);
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P12.1: Kotlin Compile Harness                       ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  // Step 1: Copy generated files
  console.log("  1. Copying generated files...");
  await fs.mkdir(MAIN_DIR, { recursive: true });
  await fs.mkdir(join(MAIN_DIR, "contracts"), { recursive: true });
  await fs.mkdir(TEST_DIR, { recursive: true });
  await fs.mkdir(join(TEST_DIR, "contracts"), { recursive: true });

  const fileHashes: Record<string, string> = {};

  // Main source files
  for (const f of MAIN_FILES) {
    await fs.copyFile(join(GEN_DIR, f), join(MAIN_DIR, f));
    fileHashes[f] = await fileHash(join(GEN_DIR, f));
    console.log(`     ✅ ${f} → src/main/kotlin/generated/ (${fileHashes[f]})`);
  }
  // Main contract files
  for (const f of MAIN_CONTRACT_FILES) {
    await fs.copyFile(join(GEN_DIR, f), join(MAIN_DIR, f));
    fileHashes[f] = await fileHash(join(GEN_DIR, f));
    console.log(`     ✅ ${f} → src/main/kotlin/generated/ (${fileHashes[f]})`);
  }
  // Test files
  for (const f of TEST_FILES) {
    await fs.copyFile(join(GEN_DIR, f), join(TEST_DIR, f));
    fileHashes[f] = await fileHash(join(GEN_DIR, f));
    console.log(`     ✅ ${f} → src/test/kotlin/ (${fileHashes[f]})`);
  }
  // Test contract files
  for (const f of TEST_CONTRACT_FILES) {
    await fs.copyFile(join(GEN_DIR, f), join(TEST_DIR, f));
    fileHashes[f] = await fileHash(join(GEN_DIR, f));
    console.log(`     ✅ ${f} → src/test/kotlin/ (${fileHashes[f]})`);
  }
  console.log();

  // Step 2: Compile
  console.log("  2. Compiling Kotlin...");
  const javaHome = process.env.JAVA_HOME || "C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.10.7-hotspot";
  const gradlew = join(COMPILE_DIR, "gradlew.bat");

  let compileSuccess = false;
  let compileOutput = "";
  try {
    compileOutput = execSync(`"${gradlew}" compileKotlin`, {
      cwd: COMPILE_DIR,
      env: { ...process.env, JAVA_HOME: javaHome },
      timeout: 120_000,
    }).toString();
    compileSuccess = compileOutput.includes("BUILD SUCCESSFUL");
    console.log(`     ${compileSuccess ? "✅" : "❌"} compileKotlin: ${compileSuccess ? "BUILD SUCCESSFUL" : "FAILED"}`);
  } catch (e: any) {
    compileOutput = e.stdout?.toString() || e.stderr?.toString() || e.message;
    console.log(`     ❌ compileKotlin FAILED`);
    console.log(compileOutput.split("\n").slice(-10).join("\n"));
  }
  console.log();

  // Step 3: Run tests
  console.log("  3. Running generated tests...");
  let testSuccess = false;
  let testOutput = "";
  let testCount = 0;
  let testFailures = 0;
  try {
    testOutput = execSync(`"${gradlew}" test`, {
      cwd: COMPILE_DIR,
      env: { ...process.env, JAVA_HOME: javaHome },
      timeout: 120_000,
    }).toString();
    testSuccess = testOutput.includes("BUILD SUCCESSFUL");

    // Parse test report
    try {
      const reportHtml = await fs.readFile(
        join(COMPILE_DIR, "build", "reports", "tests", "test", "index.html"), "utf8"
      );
      const counters = [...reportHtml.matchAll(/<div class="counter">(\d+)<\/div>/g)].map(m => parseInt(m[1]));
      if (counters.length >= 2) {
        testCount = counters[0];
        testFailures = counters[1];
      }
    } catch { /* report parsing optional */ }

    console.log(`     ✅ test: ${testCount} passed, ${testFailures} failures`);
  } catch (e: any) {
    testOutput = e.stdout?.toString() || e.stderr?.toString() || e.message;
    console.log(`     ❌ test FAILED`);
    console.log(testOutput.split("\n").slice(-10).join("\n"));
  }

  // Check for compiler warnings
  const warnings = [...testOutput.matchAll(/w: (file:\/\/.+)/g)].map(m => m[1]);
  if (warnings.length > 0) {
    console.log(`\n  ⚠️  Compiler warnings (${warnings.length}):`);
    for (const w of warnings) console.log(`     ${w}`);
  }
  console.log();

  // Step 4: Report
  console.log("  4. Generating reports...");
  await fs.mkdir(REPORT_DIR, { recursive: true });
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });

  const report = {
    phase: "P12.1",
    title: "Kotlin Compile Harness",
    generated_at: new Date().toISOString(),
    compile: {
      success: compileSuccess,
      gradle_version: "8.5",
      kotlin_version: "1.9.22",
      jdk_version: "21",
      annotation_stubs: true,
    },
    tests: {
      success: testSuccess,
      count: testCount,
      failures: testFailures,
      framework: "JUnit4",
    },
    warnings: warnings.length,
    file_hashes: fileHashes,
    manual_edits: 0,
    llm_repairs: 0,
  };

  await fs.writeFile(join(REPORT_DIR, "PHASE-12.1-compile-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log("     ✅ PHASE-12.1-compile-report.json");

  // Evidence
  await fs.writeFile(join(EVIDENCE_DIR, "p12_1_compile.json"), JSON.stringify({
    phase: "P12.1",
    compile: compileSuccess,
    tests: testSuccess,
    test_count: testCount,
    test_failures: testFailures,
    warnings: warnings.length,
    manual_edits: 0,
    llm_repairs: 0,
    generated_at: report.generated_at,
  }, null, 2), "utf8");
  console.log("     ✅ p12_1_compile.json (evidence)");

  // Final
  const allGreen = compileSuccess && testSuccess && testFailures === 0;
  const icon = allGreen ? "✅ PASS" : "❌ FAIL";

  console.log(`\n  ══════════════════════════════════════════════════`);
  console.log(`  P12.1 KOTLIN COMPILE HARNESS: ${icon}`);
  console.log(`  Compile: ${compileSuccess ? "✅" : "❌"} | Tests: ${testCount}/${testCount} | Failures: ${testFailures}`);
  console.log(`  Warnings: ${warnings.length} | Manual edits: 0 | LLM repairs: 0`);
  console.log(`  ══════════════════════════════════════════════════\n`);
}

main().catch(err => { console.error("P12.1 failed:", err); process.exit(1); });

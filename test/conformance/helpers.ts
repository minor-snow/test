/**
 * Conformance test infrastructure for Clarion CLI.
 *
 * These tests are self-contained — they do NOT import from src/ or dist/src/.
 * They spawn the built CLI binary and validate the JSON envelope shape.
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// CliResultEnvelope — local type definition (NOT imported from src/)
// ---------------------------------------------------------------------------

export type CliResultEnvelope = {
  readonly schema_version: string;
  readonly command: string;
  readonly target_type: string;
  readonly target_id?: string;
  readonly status: string;
  readonly error_code?: string;
  readonly summary: Record<string, unknown>;
  readonly verdict: string;
  readonly findings: readonly unknown[];
  readonly next_actions: readonly string[];
  readonly next_action_intents: readonly unknown[];
  readonly artifact_paths: readonly string[];
  readonly warnings: readonly unknown[];
  readonly errors: readonly unknown[];
  readonly privacy: {
    readonly disclosure: string;
    readonly note: string;
  };
  readonly details?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// CLI runner helper
// ---------------------------------------------------------------------------

export interface CliRunResult {
  exitCode: number;
  stdout: string;
  parsed?: CliResultEnvelope;
}

/**
 * Resolve the path to the built CLI binary.
 * Uses CLARION_BIN env var if set, otherwise defaults to dist/src/cli/pantheon.js
 * relative to the workspace root (two levels up from public-test-repo/test/conformance/).
 */
function getCliBinaryPath(): string {
  if (process.env.CLARION_BIN) {
    return process.env.CLARION_BIN;
  }
  // Workspace root is three levels up from this file:
  // public-test-repo/test/conformance/helpers.ts → workspace root
  const workspaceRoot = path.resolve(__dirname, "..", "..", "..");
  return path.join(workspaceRoot, "dist", "src", "cli", "pantheon.js");
}

/**
 * Run the Clarion CLI with the given arguments and return structured output.
 *
 * @param args - CLI arguments (e.g. ["doctor", "--json"])
 * @param options - Optional overrides for cwd
 */
export function runCli(
  args: string[],
  options?: { cwd?: string }
): CliRunResult {
  const binPath = getCliBinaryPath();
  const cwd = options?.cwd ?? path.resolve(__dirname, "..", "..", "..");
  const command = `node "${binPath}" ${args.join(" ")}`;

  let stdout = "";
  let exitCode = 0;

  try {
    stdout = execSync(command, {
      cwd,
      stdio: "pipe",
      timeout: 30_000,
      env: { ...process.env, NO_COLOR: "1" },
    }).toString();
  } catch (e: unknown) {
    const err = e as { status?: number; stdout?: Buffer; stderr?: Buffer };
    exitCode = err.status ?? 1;
    stdout = err.stdout?.toString() ?? "";
  }

  let parsed: CliResultEnvelope | undefined;
  try {
    const json = JSON.parse(stdout);
    // Basic shape check before assigning
    if (json && typeof json === "object" && "schema_version" in json) {
      parsed = json as CliResultEnvelope;
    }
  } catch {
    // Not valid JSON — that's fine, parsed stays undefined
  }

  return { exitCode, stdout, parsed };
}

/**
 * Validate that a parsed result conforms to the CliResultEnvelope shape.
 * Returns an array of validation errors (empty = valid).
 */
export function validateEnvelopeShape(result: unknown): string[] {
  const errors: string[] = [];
  if (!result || typeof result !== "object") {
    errors.push("Result is not an object");
    return errors;
  }

  const obj = result as Record<string, unknown>;

  if (typeof obj.schema_version !== "string") {
    errors.push("Missing or invalid schema_version");
  }
  if (typeof obj.command !== "string") {
    errors.push("Missing or invalid command");
  }
  if (typeof obj.target_type !== "string") {
    errors.push("Missing or invalid target_type");
  }
  if (typeof obj.status !== "string") {
    errors.push("Missing or invalid status");
  }
  if (typeof obj.summary !== "object" || obj.summary === null) {
    errors.push("Missing or invalid summary");
  }
  if (typeof obj.verdict !== "string") {
    errors.push("Missing or invalid verdict");
  }
  if (!Array.isArray(obj.findings)) {
    errors.push("Missing or invalid findings array");
  }
  if (!Array.isArray(obj.next_actions)) {
    errors.push("Missing or invalid next_actions array");
  }
  if (!Array.isArray(obj.next_action_intents)) {
    errors.push("Missing or invalid next_action_intents array");
  }
  if (!Array.isArray(obj.artifact_paths)) {
    errors.push("Missing or invalid artifact_paths array");
  }
  if (!Array.isArray(obj.warnings)) {
    errors.push("Missing or invalid warnings array");
  }
  if (!Array.isArray(obj.errors)) {
    errors.push("Missing or invalid errors array");
  }
  if (typeof obj.privacy !== "object" || obj.privacy === null) {
    errors.push("Missing or invalid privacy object");
  } else {
    const privacy = obj.privacy as Record<string, unknown>;
    if (typeof privacy.disclosure !== "string") {
      errors.push("Missing or invalid privacy.disclosure");
    }
    if (typeof privacy.note !== "string") {
      errors.push("Missing or invalid privacy.note");
    }
  }

  return errors;
}

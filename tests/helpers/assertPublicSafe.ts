import { expect } from "vitest";

export function assertPublicSafe(stdout: string) {
  // Check for absolute paths
  expect(stdout).not.toMatch(/[a-zA-Z]:\\[^\n]*\\[^\n]*/i);
  expect(stdout).not.toMatch(/"\/(?:Users|home|tmp|usr|var|etc)\//i);

  // Check for raw internal JSONL streams or raw store payloads
  // We do NOT block normal CLI `--json` outputs here, only leaks of underlying database streams
  expect(stdout).not.toContain("{\"envelopeType\":");
  expect(stdout).not.toContain("{\"eventId\":");

  // Stack traces
  expect(stdout).not.toContain("Error:");
  expect(stdout).not.toContain("    at ");
}

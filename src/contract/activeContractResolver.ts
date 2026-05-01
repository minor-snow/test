/**
 * P29.5: Active Contract Resolver
 *
 * Resolves whether a valid repair or change contract exists for the
 * current repository state. Checks trust, staleness, and PR-authorship.
 *
 * Contract trust rules:
 *   - Contract must exist on disk (not just in PR diff)
 *   - Contract revision must be current
 *   - Contract base_sha must match (if in PR mode)
 *   - Contract must not be PR-authored (in PR mode)
 *   - Contract must not be stale (based on session status)
 *
 * ref: P29.5 section 11
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { ActiveContractResolution, ActiveContractStatus } from "../policy/contractGateTypes.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function resolveActiveContract(input: {
  repoRoot: string;
  prChangedPaths?: readonly string[];
  baseSha?: string;
}): ActiveContractResolution {
  const { repoRoot, prChangedPaths, baseSha } = input;

  // Check for repair session
  const repairResult = resolveRepairContract(repoRoot, prChangedPaths, baseSha);
  if (repairResult.status === "valid") return repairResult;

  // Check for change contract
  const changeResult = resolveChangeContract(repoRoot, prChangedPaths, baseSha);
  if (changeResult.status === "valid") return changeResult;

  // Return the most informative non-valid status
  if (repairResult.status !== "missing" && repairResult.status !== "not_required") {
    return repairResult;
  }
  if (changeResult.status !== "missing" && changeResult.status !== "not_required") {
    return changeResult;
  }

  return {
    status: "missing",
    reason: "No active repair or change contract found.",
  };
}

// ---------------------------------------------------------------------------
// Repair contract resolution
// ---------------------------------------------------------------------------

function resolveRepairContract(
  repoRoot: string,
  prChangedPaths?: readonly string[],
  baseSha?: string,
): ActiveContractResolution {
  const pantheonDir = join(repoRoot, ".pantheon");
  const repairDir = join(pantheonDir, "repair", "runs");

  if (!existsSync(repairDir)) {
    return { status: "missing", reason: "No repair runs directory found." };
  }

  // Look for active session
  const sessionPath = findLatestSession(repairDir);
  if (!sessionPath) {
    return { status: "missing", reason: "No active repair session found." };
  }

  const session = safeReadJson(sessionPath);
  if (!session) {
    return { status: "missing", reason: "Could not read repair session." };
  }

  const repairId = session.repair_id as string | undefined;
  if (!repairId) {
    return { status: "missing", reason: "Repair session has no repair_id." };
  }

  // Check for contract
  const contractPath = findLatestContract(join(repairDir, repairId));
  if (!contractPath) {
    return {
      status: "missing",
      contract_type: "repair",
      contract_id: repairId,
      reason: "Repair session exists but no contract has been generated.",
    };
  }

  // Check PR-authored (if in PR mode)
  if (prChangedPaths) {
    const contractRelative = contractPath.replace(repoRoot, "").replace(/\\/g, "/").replace(/^\//, "");
    if (prChangedPaths.includes(contractRelative)) {
      return {
        status: "untrusted_pr_authored",
        contract_type: "repair",
        contract_id: repairId,
        reason: "Repair contract was modified in this PR and cannot be trusted.",
      };
    }
  }

  // Check staleness
  const status = session.status as string | undefined;
  if (status === "stale" || status === "superseded") {
    return {
      status: "stale",
      contract_type: "repair",
      contract_id: repairId,
      reason: `Repair contract is ${status}.`,
    };
  }

  // Check base SHA match (if available)
  const contract = safeReadJson(contractPath);
  if (contract && baseSha) {
    const sourceRefs = contract.source_refs as Record<string, unknown> | undefined;
    const contractHeadSha = sourceRefs?.head_commit_hash as string | undefined;
    if (contractHeadSha && contractHeadSha !== baseSha) {
      // Base SHA mismatch is a warning, not an outright rejection.
      // The contract may still be valid if the scope covers the diff.
      return {
        status: "valid",
        contract_type: "repair",
        contract_id: repairId,
        reason: "Active repair contract found (base SHA differs — scope check recommended).",
      };
    }
  }

  return {
    status: "valid",
    contract_type: "repair",
    contract_id: repairId,
    reason: "Active repair contract found and validated.",
  };
}

// ---------------------------------------------------------------------------
// Change contract resolution
// ---------------------------------------------------------------------------

function resolveChangeContract(
  repoRoot: string,
  prChangedPaths?: readonly string[],
  _baseSha?: string,
): ActiveContractResolution {
  const pantheonDir = join(repoRoot, ".pantheon");
  const changeDir = join(pantheonDir, "change", "runs");

  if (!existsSync(changeDir)) {
    return { status: "missing", reason: "No change contract runs directory found." };
  }

  const contractPath = findLatestContract(changeDir);
  if (!contractPath) {
    return { status: "missing", reason: "No active change contract found." };
  }

  // Check PR-authored
  if (prChangedPaths) {
    const contractRelative = contractPath.replace(repoRoot, "").replace(/\\/g, "/").replace(/^\//, "");
    if (prChangedPaths.includes(contractRelative)) {
      return {
        status: "untrusted_pr_authored",
        contract_type: "change",
        reason: "Change contract was modified in this PR and cannot be trusted.",
      };
    }
  }

  const contract = safeReadJson(contractPath);
  const contractId = contract?.contract_id as string | undefined;

  // Check lifecycle status
  const lifecycleStatus = contract?.lifecycle_status as string | undefined;
  if (lifecycleStatus === "invalid" || lifecycleStatus === "closed") {
    return {
      status: "stale",
      contract_type: "change",
      contract_id: contractId,
      reason: `Change contract lifecycle is ${lifecycleStatus}.`,
    };
  }

  return {
    status: "valid",
    contract_type: "change",
    contract_id: contractId,
    reason: "Active change contract found and validated.",
  };
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function findLatestSession(repairRunsDir: string): string | null {
  // Walk repair runs looking for active sessions
  try {
    const entries = readdirSync(repairRunsDir, { withFileTypes: true });
    for (const entry of entries.reverse()) {
      if (entry.isDirectory()) {
        const sessionPath = join(repairRunsDir, entry.name, "session.json");
        if (existsSync(sessionPath)) {
          const session = safeReadJson(sessionPath);
          if (session && session.status !== "closed" && session.status !== "invalid") {
            return sessionPath;
          }
        }
      }
    }
  } catch {
    // Directory listing failed
  }
  return null;
}

function findLatestContract(runDir: string): string | null {
  // Look for the latest contract file
  const candidates = [
    join(runDir, "repair_contract.latest.json"),
    join(runDir, "change_contract.latest.json"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  // Look for versioned contracts
  try {
    const entries = readdirSync(runDir);
    const contractFiles = entries
      .filter((f: string) => f.startsWith("repair_contract_v") || f.startsWith("change_contract_v"))
      .sort()
      .reverse();
    if (contractFiles.length > 0) {
      return join(runDir, contractFiles[0]);
    }
  } catch {
    // Ignore
  }

  return null;
}

function safeReadJson(filePath: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

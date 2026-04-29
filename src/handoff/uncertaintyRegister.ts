/**
 * P13-C: Uncertainty Register
 *
 * Append-only side ledger for blocking uncertainties.
 * Rule: if any entry has blocking_decisions.length > 0 && status === "open",
 *       then release / final handoff is blocked.
 *
 * ref: P13-C
 */

import { promises as fs } from "node:fs";
import type { UncertaintyEntry, UncertaintyRegister } from "./types.js";

export function createUncertaintyRegister(): UncertaintyRegister {
  return { entries: [] };
}

export function addUncertainty(
  register: UncertaintyRegister,
  entry: Omit<UncertaintyEntry, "uncertainty_id" | "created_at" | "status">,
): UncertaintyRegister {
  const id = `UNC-${String(register.entries.length + 1).padStart(3, "0")}`;
  return {
    entries: [
      ...register.entries,
      {
        ...entry,
        uncertainty_id: id,
        created_at: new Date().toISOString(),
        status: "open",
      },
    ],
  };
}

export function resolveUncertainty(
  register: UncertaintyRegister,
  uncertaintyId: string,
  resolution: "resolved" | "accepted_risk",
): UncertaintyRegister {
  return {
    entries: register.entries.map(e =>
      e.uncertainty_id === uncertaintyId
        ? { ...e, status: resolution, resolved_at: new Date().toISOString() }
        : e,
    ),
  };
}

/**
 * Gate check: are there any open blocking uncertainties?
 * If yes, release/handoff should be blocked.
 */
export function hasBlockingUncertainties(register: UncertaintyRegister): boolean {
  return register.entries.some(
    e => e.status === "open" && e.blocking_decisions.length > 0,
  );
}

export function getBlockingUncertainties(register: UncertaintyRegister): UncertaintyEntry[] {
  return register.entries.filter(
    e => e.status === "open" && e.blocking_decisions.length > 0,
  );
}

export async function loadRegister(path: string): Promise<UncertaintyRegister> {
  try {
    const raw = await fs.readFile(path, "utf8");
    return JSON.parse(raw);
  } catch {
    return createUncertaintyRegister();
  }
}

export async function saveRegister(path: string, register: UncertaintyRegister): Promise<void> {
  await fs.writeFile(path, JSON.stringify(register, null, 2), "utf8");
}

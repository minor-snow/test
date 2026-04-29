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
export function createUncertaintyRegister() {
    return { entries: [] };
}
export function addUncertainty(register, entry) {
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
export function resolveUncertainty(register, uncertaintyId, resolution) {
    return {
        entries: register.entries.map(e => e.uncertainty_id === uncertaintyId
            ? { ...e, status: resolution, resolved_at: new Date().toISOString() }
            : e),
    };
}
/**
 * Gate check: are there any open blocking uncertainties?
 * If yes, release/handoff should be blocked.
 */
export function hasBlockingUncertainties(register) {
    return register.entries.some(e => e.status === "open" && e.blocking_decisions.length > 0);
}
export function getBlockingUncertainties(register) {
    return register.entries.filter(e => e.status === "open" && e.blocking_decisions.length > 0);
}
export async function loadRegister(path) {
    try {
        const raw = await fs.readFile(path, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return createUncertaintyRegister();
    }
}
export async function saveRegister(path, register) {
    await fs.writeFile(path, JSON.stringify(register, null, 2), "utf8");
}
//# sourceMappingURL=uncertaintyRegister.js.map
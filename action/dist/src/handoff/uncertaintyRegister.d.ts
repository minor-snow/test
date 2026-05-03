/**
 * P13-C: Uncertainty Register
 *
 * Append-only side ledger for blocking uncertainties.
 * Rule: if any entry has blocking_decisions.length > 0 && status === "open",
 *       then release / final handoff is blocked.
 *
 * ref: P13-C
 */
import type { UncertaintyEntry, UncertaintyRegister } from "./types.js";
export declare function createUncertaintyRegister(): UncertaintyRegister;
export declare function addUncertainty(register: UncertaintyRegister, entry: Omit<UncertaintyEntry, "uncertainty_id" | "created_at" | "status">): UncertaintyRegister;
export declare function resolveUncertainty(register: UncertaintyRegister, uncertaintyId: string, resolution: "resolved" | "accepted_risk"): UncertaintyRegister;
/**
 * Gate check: are there any open blocking uncertainties?
 * If yes, release/handoff should be blocked.
 */
export declare function hasBlockingUncertainties(register: UncertaintyRegister): boolean;
export declare function getBlockingUncertainties(register: UncertaintyRegister): UncertaintyEntry[];
export type UncertaintyRegisterPathOptions = {
    readonly repoRoot?: string;
    readonly trustedAbsolute?: boolean;
};
export declare function loadRegister(path: string, options?: UncertaintyRegisterPathOptions): Promise<UncertaintyRegister>;
export declare function saveRegister(path: string, register: UncertaintyRegister, options?: UncertaintyRegisterPathOptions): Promise<void>;

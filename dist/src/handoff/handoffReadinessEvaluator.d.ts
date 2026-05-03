/**
 * Handoff Readiness Evaluator — Deterministic quality gate
 *
 * ref: P11a-008
 *
 * Checks the handoff package against 12 readiness criteria.
 * Any critical violation → not_ready (cannot downgrade to ready_with_risks).
 */
import type { ImplementationHandoffPackage, HandoffReadinessReport, SourceArtifactRef, UncertaintyRegister } from "./types.js";
export declare function evaluateHandoffReadiness(pkg: ImplementationHandoffPackage, canonicalRefs: SourceArtifactRef[], mandatoryTermCount: number, missingTerms: string[], unresolvedTerms?: string[], uncertaintyRegister?: UncertaintyRegister): HandoffReadinessReport;

/**
 * P29.5: PR-Authored Artifact Guard
 *
 * Detects when a PR/diff includes files that LOOK like governance artifacts
 * (audit decisions, approval records, contracts, review requests) but are
 * authored within the PR itself — and therefore CANNOT be trusted.
 *
 * Rule: PR-authored governance artifacts are NEVER valid trust sources.
 * They can only be subjects of review, not evidence of approval.
 *
 * Checks both ADDED and MODIFIED files (implementation guard #4).
 *
 * ref: P29.5 INV-4, section 9
 */
import type { PrArtifactGuardResult } from "../policy/contractGateTypes.js";
/**
 * Inspect changed files for PR-authored governance artifacts.
 *
 * @param changedPaths - All changed file paths in the diff (added + modified).
 *                       These represent files the PR author can control.
 */
export declare function guardPrAuthoredArtifacts(changedPaths: readonly string[]): PrArtifactGuardResult;

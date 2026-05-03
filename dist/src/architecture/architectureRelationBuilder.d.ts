/**
 * P30: Architecture Relation Builder
 *
 * Combines extracted claims and evidence candidates into architecture relations.
 * Each relation represents a semantic triple (subject, relation_type, object)
 * with supporting evidence and an initial review status.
 *
 * All relations start as "unreviewed" — they become governance constraints
 * only after user review and `pantheon arch accept`.
 *
 * ref: P30
 */
import type { ArchitectureClaim, ArchitectureEvidenceCandidate, ArchitectureRelation } from "./types.js";
/**
 * Build candidate relations from claims and their evidence.
 *
 * Deduplicates by (subject, relation_type, object) triple.
 * Multiple claims producing the same triple are merged —
 * evidence and claim IDs are combined, confidence is the maximum.
 */
export declare function buildArchitectureRelations(claims: readonly ArchitectureClaim[], evidence: readonly ArchitectureEvidenceCandidate[]): ArchitectureRelation[];

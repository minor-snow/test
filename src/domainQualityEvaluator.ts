/**
 * Domain Quality Evaluator
 *
 * ref: P9-002
 *
 * Evaluates draft quality against a DomainProfile.
 * Produces:
 *   - Domain-aware lint issues (7 rules)
 *   - Required concept coverage (exact / alias / terms[])
 *   - Fixed quality score
 *   - Intake recommendation
 *
 * This is NOT a replacement for the structural linter (linter.ts).
 * It runs on top of validated drafts to assess domain alignment.
 *
 * Score formula (fixed, not configurable):
 *   score = 100 - 15*high - 8*medium - 3*low
 *          + 10 if coverage >= 90%
 *          + 5  if all required sections present
 *   Floor: 0, Cap: 100
 *
 * Score is advisory, not canonical truth.
 */

import type { Artifact, IssueSeverity } from "./types.js";
import type { DomainProfile } from "./domainProfile.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConceptMatch = {
  concept: string;
  matched: boolean;
  matched_by?: string;  // e.g., "block b_001 text" or "block b_003 terms[]"
  excluded_placeholder?: boolean;
};

export type ConceptCoverageResult = {
  total_required: number;
  matched: number;
  coverage: number;
  details: ConceptMatch[];
};

export type DraftQualityReport = {
  artifact_id: string;
  revision_id: string;
  score: number;
  section_count: number;
  block_count: number;
  required_concept_coverage: number;
  concept_matches: ConceptMatch[];
  issue_breakdown: Record<string, number>;
  severity_breakdown: Record<string, number>;
  blocking_issues: DomainIssue[];
  improvement_issues: DomainIssue[];
  recommendation: "reject_draft" | "accept_for_cleanup" | "accept_as_seed";
};

export type DomainIssue = {
  issue_type: string;
  severity: IssueSeverity;
  message: string;
  block_id?: string;
  section_id?: string;
};

// ---------------------------------------------------------------------------
// Placeholder detection patterns
// ---------------------------------------------------------------------------

const PLACEHOLDER_PATTERNS = [
  /\bno\s+\S+\s+has been identified\b/i,
  /\bis not applicable\b/i,
  /\bwill be determined later\b/i,
  /\btbd\b/i,
  /\bto be defined\b/i,
  /\bfuture work\b/i,
  /\bto be determined\b/i,
  /\bnot yet defined\b/i,
  /\bplaceholder\b/i,
];

// ---------------------------------------------------------------------------
// Vague commitment heuristic
// ---------------------------------------------------------------------------

const VAGUE_ADJECTIVES = new Set([
  "reliable", "scalable", "robust", "efficient", "secure",
  "flexible", "modular", "performant", "resilient", "maintainable",
  "extensible", "intuitive", "seamless", "comprehensive", "innovative",
]);

function isVagueCommitment(text: string, terms?: string[]): boolean {
  const words = text.split(/\s+/);
  if (words.length > 20) return false;  // long enough to have substance
  if (terms && terms.length > 0) return false;  // has specific terms

  // Count vague adjectives
  const vagueCount = words.filter(w =>
    VAGUE_ADJECTIVES.has(w.toLowerCase().replace(/[.,;:!?]/g, ""))
  ).length;

  // More than 30% vague adjectives in a short block
  return vagueCount >= 2 && vagueCount / words.length >= 0.15;
}

// ---------------------------------------------------------------------------
// Overbroad block heuristic
// ---------------------------------------------------------------------------

function isOverbroadBlock(text: string): boolean {
  // Simple heuristic: count sentence-like segments
  const sentences = text.split(/[.!?;]\s+/).filter(s => s.trim().length > 10);
  if (sentences.length < 3) return false;

  // Check if sentences talk about clearly different topics
  // Use a simple keyword-cluster approach
  const topicWords = sentences.map(s => {
    const words = s.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    return new Set(words);
  });

  // If 3+ sentences share < 20% vocabulary, it's overbroad
  let disjointPairs = 0;
  for (let i = 0; i < topicWords.length; i++) {
    for (let j = i + 1; j < topicWords.length; j++) {
      const intersection = [...topicWords[i]].filter(w => topicWords[j].has(w));
      const union = new Set([...topicWords[i], ...topicWords[j]]);
      if (union.size > 0 && intersection.length / union.size < 0.1) {
        disjointPairs++;
      }
    }
  }

  return disjointPairs >= 3;
}

// ---------------------------------------------------------------------------
// Section matching with aliases
// ---------------------------------------------------------------------------

function sectionMatches(sectionTitle: string, requiredTitle: string, aliases: string[]): boolean {
  const norm = (s: string) => s.toLowerCase().trim();
  const t = norm(sectionTitle);
  if (t === norm(requiredTitle)) return true;
  return aliases.some(a => t === norm(a));
}

// ---------------------------------------------------------------------------
// Concept matching
// ---------------------------------------------------------------------------

function textContainsConcept(text: string, concept: string, aliases: string[]): boolean {
  const lower = text.toLowerCase();
  if (lower.includes(concept.toLowerCase())) return true;
  return aliases.some(a => lower.includes(a.toLowerCase()));
}

function blockIsPlaceholder(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some(p => p.test(text));
}

// ---------------------------------------------------------------------------
// Concept coverage
// ---------------------------------------------------------------------------

export function computeConceptCoverage(
  artifact: Artifact,
  profile: DomainProfile
): ConceptCoverageResult {
  const required = profile.required_concepts.filter(c => c.required);
  const details: ConceptMatch[] = [];

  for (const rule of required) {
    let matched = false;
    let matchedBy = "";
    let excludedPlaceholder = false;

    for (const section of artifact.sections) {
      for (const block of section.commitments) {
        // Skip placeholder blocks
        if (blockIsPlaceholder(block.text)) {
          if (textContainsConcept(block.text, rule.concept, rule.aliases)) {
            excludedPlaceholder = true;
          }
          continue;
        }

        // Check text
        if (textContainsConcept(block.text, rule.concept, rule.aliases)) {
          matched = true;
          matchedBy = `block ${block.block_id} text`;
          break;
        }

        // Check terms[]
        if (block.terms) {
          for (const term of block.terms) {
            if (
              term.toLowerCase() === rule.concept.toLowerCase() ||
              rule.aliases.some(a => term.toLowerCase() === a.toLowerCase())
            ) {
              matched = true;
              matchedBy = `block ${block.block_id} terms[]`;
              break;
            }
          }
        }

        if (matched) break;
      }
      if (matched) break;
    }

    details.push({
      concept: rule.concept,
      matched,
      matched_by: matched ? matchedBy : undefined,
      excluded_placeholder: excludedPlaceholder ? true : undefined,
    });
  }

  const matchedCount = details.filter(d => d.matched).length;

  return {
    total_required: required.length,
    matched: matchedCount,
    coverage: required.length > 0 ? matchedCount / required.length : 1,
    details,
  };
}

// ---------------------------------------------------------------------------
// Main evaluator
// ---------------------------------------------------------------------------

export function evaluateDraftQuality(
  artifact: Artifact,
  profile: DomainProfile
): DraftQualityReport {
  const issues: DomainIssue[] = [];

  // ── Rule 1: missing_required_section (high) ──
  for (const req of profile.required_sections) {
    const found = artifact.sections.some(s =>
      sectionMatches(s.title, req.title, req.aliases)
    );
    if (!found) {
      issues.push({
        issue_type: "missing_required_section",
        severity: "high",
        message: `Required section "${req.title}" (or aliases: ${req.aliases.join(", ")}) not found`,
      });
    }
  }

  // ── Rule 2: missing_required_concept (medium) ──
  const coverage = computeConceptCoverage(artifact, profile);
  for (const detail of coverage.details) {
    if (!detail.matched) {
      issues.push({
        issue_type: "missing_required_concept",
        severity: "medium",
        message: detail.excluded_placeholder
          ? `Required concept "${detail.concept}" only appears in placeholder blocks`
          : `Required concept "${detail.concept}" not found in any block`,
      });
    }
  }

  // Per-block rules
  for (const section of artifact.sections) {
    for (const block of section.commitments) {
      // ── Rule 3: generic_filler (medium) ──
      for (const phrase of profile.forbidden_generic_phrases) {
        if (block.text.toLowerCase().includes(phrase.toLowerCase())) {
          issues.push({
            issue_type: "generic_filler",
            severity: "medium",
            message: `Block "${block.block_id}" contains forbidden generic phrase: "${phrase}"`,
            block_id: block.block_id,
            section_id: section.section_id,
          });
          break;  // one hit per block is enough
        }
      }

      // ── Rule 4: vague_commitment (medium) ──
      if (isVagueCommitment(block.text, block.terms)) {
        issues.push({
          issue_type: "vague_commitment",
          severity: "medium",
          message: `Block "${block.block_id}" appears to be a vague commitment without specific mechanisms`,
          block_id: block.block_id,
          section_id: section.section_id,
        });
      }

      // ── Rule 5: overbroad_block (medium) ──
      if (isOverbroadBlock(block.text)) {
        issues.push({
          issue_type: "overbroad_block",
          severity: "medium",
          message: `Block "${block.block_id}" covers too many unrelated topics`,
          block_id: block.block_id,
          section_id: section.section_id,
        });
      }

      // ── Rule 6: placeholder_concept (medium) ──
      if (blockIsPlaceholder(block.text)) {
        issues.push({
          issue_type: "placeholder_concept",
          severity: "medium",
          message: `Block "${block.block_id}" contains placeholder/TBD content`,
          block_id: block.block_id,
          section_id: section.section_id,
        });
      }
    }
  }

  // ── Rule 7: domain_irrelevant_content (profile-aware) ──
  // Check blocks that don't reference any allowed/required concepts
  const allConcepts = [
    ...profile.allowed_concepts,
    ...profile.required_concepts.map(c => c.concept),
    ...profile.required_concepts.flatMap(c => c.aliases),
  ];

  for (const section of artifact.sections) {
    for (const block of section.commitments) {
      const lower = block.text.toLowerCase();
      const hasAnyConcept = allConcepts.some(c => lower.includes(c.toLowerCase()));
      const hasTerms = block.terms && block.terms.length > 0;

      if (!hasAnyConcept && !hasTerms) {
        issues.push({
          issue_type: "domain_irrelevant_content",
          severity: "medium",
          message: `Block "${block.block_id}" does not reference any domain concepts`,
          block_id: block.block_id,
          section_id: section.section_id,
        });
      }
    }
  }

  // ── Rubric violations (profile-scoped) ──
  const rubric = profile.quality_rubric;
  const blockCount = artifact.sections.reduce(
    (sum, s) => sum + s.commitments.length, 0
  );

  if (artifact.sections.length < rubric.min_sections) {
    issues.push({
      issue_type: "below_min_sections",
      severity: "high",
      message: `Artifact has ${artifact.sections.length} sections, profile requires at least ${rubric.min_sections}`,
    });
  }

  if (blockCount < rubric.min_blocks) {
    issues.push({
      issue_type: "below_min_blocks",
      severity: "high",
      message: `Artifact has ${blockCount} blocks, profile requires at least ${rubric.min_blocks}`,
    });
  }

  if (blockCount > rubric.max_blocks) {
    issues.push({
      issue_type: "above_max_blocks",
      severity: "medium",
      message: `Artifact has ${blockCount} blocks, profile allows at most ${rubric.max_blocks}`,
    });
  }

  const coverageBelowRubric = coverage.coverage < rubric.min_required_concept_coverage;
  if (coverageBelowRubric) {
    issues.push({
      issue_type: "below_min_concept_coverage",
      severity: "high",
      message: `Concept coverage ${(coverage.coverage * 100).toFixed(0)}% is below profile minimum ${(rubric.min_required_concept_coverage * 100).toFixed(0)}%`,
    });
  }

  // ── Score calculation (fixed formula) ──
  const severityCounts = { high: 0, medium: 0, low: 0, critical: 0 };
  const issueTypeCounts: Record<string, number> = {};
  for (const issue of issues) {
    severityCounts[issue.severity]++;
    issueTypeCounts[issue.issue_type] = (issueTypeCounts[issue.issue_type] || 0) + 1;
  }

  const hasMissingSection = issues.some(i => i.issue_type === "missing_required_section");
  const allSectionsPresent = !hasMissingSection;

  let score = 100
    - 15 * severityCounts.high
    - 8 * severityCounts.medium
    - 3 * severityCounts.low;

  if (coverage.coverage >= 0.9) score += 10;
  if (allSectionsPresent) score += 5;

  score = Math.max(0, Math.min(100, score));

  // ── Recommendation ──
  // Profile rubric violations are hard gates, not just score inputs.
  let recommendation: DraftQualityReport["recommendation"];
  if (
    score < 40 ||
    hasMissingSection ||
    coverageBelowRubric ||
    blockCount < rubric.min_blocks ||
    blockCount > rubric.max_blocks ||
    artifact.sections.length < rubric.min_sections
  ) {
    recommendation = "reject_draft";
  } else if (score < 70) {
    recommendation = "accept_for_cleanup";
  } else {
    recommendation = "accept_as_seed";
  }

  // ── Split blocking vs improvement ──
  // Blocking: structural/rubric violations + placeholder concepts
  const BLOCKING_TYPES = new Set([
    "missing_required_section",
    "placeholder_concept",
    "below_min_sections",
    "below_min_blocks",
    "above_max_blocks",
    "below_min_concept_coverage",
  ]);
  const blocking = issues.filter(i => BLOCKING_TYPES.has(i.issue_type));
  const improvement = issues.filter(i => !BLOCKING_TYPES.has(i.issue_type));

  return {
    artifact_id: artifact.artifact_id,
    revision_id: artifact.revision_id,
    score,
    section_count: artifact.sections.length,
    block_count: blockCount,
    required_concept_coverage: coverage.coverage,
    concept_matches: coverage.details,
    issue_breakdown: issueTypeCounts,
    severity_breakdown: severityCounts,
    blocking_issues: blocking,
    improvement_issues: improvement,
    recommendation,
  };
}

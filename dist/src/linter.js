/**
 * Deterministic Linter
 *
 * ref: 执行宪法 v0.2 §17 Day 4
 *
 * This is an L1 Evidence Skill (ref: §7).
 * It produces Issue objects only — it never patches or commits.
 *
 * Rules (all deterministic, no LLM):
 *   1. block.text contains "instantly committed" → unsafe_canonical_commit
 *   2. block.text references undefined terms → undefined_term
 *   3. block.text is empty → empty_block_text
 *   4. block.text has no domain-relevant keywords → domain_irrelevant_content (P4-001)
 *   5. cross-block narrative redundancy → redundant_narrative (P4-003)
 *
 * Design:
 *   - Each rule is a pure function: (block, context) → Issue[]
 *   - The linter collects all defined terms across the artifact
 *     to build a glossary for the undefined term check.
 *   - All output Issues must enter quarantine before promotion (ref: C-03).
 */
// ---------------------------------------------------------------------------
// Term extraction
// ---------------------------------------------------------------------------
/**
 * Collect all defined terms across an artifact.
 * A term is "defined" if it appears in any block's `terms` array.
 */
export function collectDefinedTerms(artifact) {
    const terms = new Set();
    for (const section of artifact.sections) {
        for (const block of section.commitments) {
            if (block.terms) {
                for (const term of block.terms) {
                    terms.add(term.toLowerCase());
                }
            }
        }
    }
    return terms;
}
/**
 * Extract potential technical terms from block text.
 *
 * Heuristics for MVP:
 *   - Words/phrases in backticks: `quarantine gate`
 *   - snake_case tokens: quarantine_gate
 *   - camelCase tokens: quarantineGate
 *   - Words/phrases in double quotes that look technical (contain _ or are multi-word)
 *
 * This is intentionally conservative — it flags potential terms
 * for human review, not as definitive errors.
 */
export function extractPotentialTerms(text) {
    const terms = [];
    // Backtick-quoted terms
    const backtickMatches = text.matchAll(/`([^`]+)`/g);
    for (const m of backtickMatches) {
        terms.push(m[1].toLowerCase());
    }
    // snake_case tokens (at least one underscore, no spaces)
    const snakeMatches = text.matchAll(/\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/gi);
    for (const m of snakeMatches) {
        terms.push(m[1].toLowerCase());
    }
    // camelCase tokens (at least one lowercase→uppercase transition)
    const camelMatches = text.matchAll(/\b([a-z]+[A-Z][a-zA-Z0-9]*)\b/g);
    for (const m of camelMatches) {
        terms.push(m[1].toLowerCase());
    }
    // Deduplicate
    return [...new Set(terms)];
}
// ---------------------------------------------------------------------------
// Individual lint rules
// ---------------------------------------------------------------------------
let issueCounter = 0;
function nextIssueId() {
    issueCounter++;
    return `issue_${String(issueCounter).padStart(3, "0")}`;
}
/**
 * Reset the issue counter (for testing).
 */
export function resetIssueCounter() {
    issueCounter = 0;
}
/**
 * Rule 1: Detect "instantly committed" pattern.
 *
 * ref: §17 Day 4 — "如果 block.text 包含 'instantly committed'，生成 issue"
 */
function ruleUnsafeCanonicalCommit(block, ctx) {
    if (block.text.toLowerCase().includes("instantly committed") ||
        block.text.toLowerCase().includes("committed instantly")) {
        return [
            {
                issue_id: nextIssueId(),
                artifact_id: ctx.artifact_id,
                base_revision_id: ctx.base_revision_id,
                target_block_id: block.block_id,
                issue_type: "unsafe_canonical_commit",
                severity: "high",
                message: 'Canonical writes must not happen instantly. ' +
                    'Block text suggests entries bypass quarantine or gating.',
            },
        ];
    }
    return [];
}
/**
 * Rule 2: Detect undefined terms.
 *
 * ref: §17 Day 4 — "如果 block.text 引入未定义术语，生成 issue"
 *
 * Checks if the block's text uses technical-looking terms
 * that are not in the artifact-wide glossary (defined via block.terms).
 */
function ruleUndefinedTerm(block, ctx) {
    const issues = [];
    const potentialTerms = extractPotentialTerms(block.text);
    for (const term of potentialTerms) {
        if (!ctx.definedTerms.has(term)) {
            issues.push({
                issue_id: nextIssueId(),
                artifact_id: ctx.artifact_id,
                base_revision_id: ctx.base_revision_id,
                target_block_id: block.block_id,
                issue_type: "undefined_term",
                severity: "medium",
                message: `Term "${term}" is used but not defined in any block's terms array.`,
            });
        }
    }
    return issues;
}
/**
 * Rule 3: Detect empty block text.
 *
 * ref: §17 Day 4 — "如果 block.text 为空，生成 issue"
 */
function ruleEmptyBlockText(block, ctx) {
    if (!block.text || block.text.trim().length === 0) {
        return [
            {
                issue_id: nextIssueId(),
                artifact_id: ctx.artifact_id,
                base_revision_id: ctx.base_revision_id,
                target_block_id: block.block_id,
                issue_type: "empty_block_text",
                severity: "high",
                message: "Block text is empty. Every commitment block must contain a substantive text.",
            },
        ];
    }
    return [];
}
// ---------------------------------------------------------------------------
// Rule 4: Domain relevance check (P4-001)
// ---------------------------------------------------------------------------
/**
 * Domain keyword sets per ArtifactType.
 * A block must contain at least one domain keyword to be considered relevant.
 * Conservative: prefer false negatives over false positives.
 */
const DOMAIN_KEYWORDS = {
    ArchitectureDraft: [
        "system", "module", "component", "service", "interface", "api",
        "pipeline", "store", "gate", "validation", "schema", "revision",
        "canonical", "quarantine", "evidence", "audit", "hash", "patch",
        "block", "artifact", "linter", "regression", "override", "commit",
        "integrity", "constraint", "invariant", "protocol", "specification",
        "architecture", "design", "data", "state", "flow", "check",
        "skill", "agent", "proposal", "operation", "function", "config",
        "directory", "file", "json", "pointer", "section", "rule",
    ],
    Constitution: [
        "rule", "principle", "constraint", "policy", "governance",
        "authority", "decision", "process", "compliance", "standard",
    ],
    InterfaceSpec: [
        "api", "endpoint", "request", "response", "parameter", "type",
        "schema", "contract", "interface", "protocol", "method",
    ],
    ModuleSpec: [
        "module", "function", "class", "method", "dependency", "import",
        "export", "interface", "implementation", "algorithm",
    ],
    DecisionLog: [
        "decision", "alternative", "rationale", "trade-off", "context",
        "consequence", "option", "criteria", "evaluation",
    ],
    RiskRegister: [
        "risk", "impact", "probability", "mitigation", "contingency",
        "severity", "exposure", "control", "assessment",
    ],
};
/**
 * Rule 4: Detect domain-irrelevant content.
 *
 * ref: P4-001 — prevents non-architectural content from entering canonical.
 * Uses keyword matching — deterministic, no LLM.
 */
function ruleDomainIrrelevantContent(block, ctx) {
    // Skip empty blocks (already caught by ruleEmptyBlockText)
    if (!block.text || block.text.trim().length <= 20) {
        return [];
    }
    const keywords = DOMAIN_KEYWORDS[ctx.artifact_type] ?? [];
    if (keywords.length === 0) {
        return []; // No keywords defined for this type — skip
    }
    const textLower = block.text.toLowerCase();
    const hasRelevantKeyword = keywords.some((kw) => textLower.includes(kw));
    if (!hasRelevantKeyword) {
        return [
            {
                issue_id: nextIssueId(),
                artifact_id: ctx.artifact_id,
                base_revision_id: ctx.base_revision_id,
                target_block_id: block.block_id,
                issue_type: "domain_irrelevant_content",
                severity: "medium",
                message: `Block text does not contain any domain-relevant keywords ` +
                    `for artifact type "${ctx.artifact_type}". ` +
                    `Content may not belong in this artifact.`,
            },
        ];
    }
    return [];
}
// ---------------------------------------------------------------------------
// Rule 5: Redundant narrative detection (P4-003)
// ---------------------------------------------------------------------------
/** Stop words to exclude from 3-gram analysis */
const STOP_WORDS = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "can", "shall", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "and", "or", "but", "if", "not", "no", "nor", "so", "yet", "both",
    "that", "this", "these", "those", "it", "its", "they", "them", "their",
    "all", "each", "every", "any", "some",
]);
/**
 * Extract 3-grams from text after removing stop words.
 */
export function extract3Grams(text) {
    const words = text
        .toLowerCase()
        .replace(/[^a-z0-9\s_-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
    const grams = new Set();
    for (let i = 0; i <= words.length - 3; i++) {
        grams.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
    }
    return grams;
}
/**
 * Compute overlap ratio between two 3-gram sets.
 * Returns value in [0, 1].
 */
export function gramOverlapRatio(a, b) {
    if (a.size === 0 || b.size === 0)
        return 0;
    let overlap = 0;
    for (const gram of a) {
        if (b.has(gram))
            overlap++;
    }
    const smaller = Math.min(a.size, b.size);
    return overlap / smaller;
}
/** Redundancy overlap threshold */
const REDUNDANCY_THRESHOLD = 0.4;
/**
 * Rule 5: Detect redundant narrative across sections.
 *
 * ref: P4-003 — flags blocks with >40% 3-gram overlap across different sections.
 * Only reports once per pair (on the later block).
 * Same-section pairs are skipped.
 */
function ruleRedundantNarrative(block, ctx) {
    // Skip short blocks
    if (!block.text || block.text.trim().length <= 30) {
        return [];
    }
    const issues = [];
    const currentGrams = extract3Grams(block.text);
    if (currentGrams.size === 0)
        return [];
    // Find which section this block belongs to
    const currentEntry = ctx.allBlocks.find((e) => e.block.block_id === block.block_id);
    if (!currentEntry)
        return [];
    // Compare against earlier blocks in different sections
    for (const other of ctx.allBlocks) {
        // Only compare with blocks that come before this one
        if (other.block.block_id === block.block_id)
            break;
        // Skip same section
        if (other.section_id === currentEntry.section_id)
            continue;
        // Skip short blocks
        if (!other.block.text || other.block.text.trim().length <= 30)
            continue;
        const otherGrams = extract3Grams(other.block.text);
        const ratio = gramOverlapRatio(currentGrams, otherGrams);
        if (ratio >= REDUNDANCY_THRESHOLD) {
            issues.push({
                issue_id: nextIssueId(),
                artifact_id: ctx.artifact_id,
                base_revision_id: ctx.base_revision_id,
                target_block_id: block.block_id,
                issue_type: "redundant_narrative",
                severity: "low",
                message: `Block shares >${Math.round(REDUNDANCY_THRESHOLD * 100)}% key phrases ` +
                    `with "${other.block.block_id}" in a different section. ` +
                    `Consider consolidation.`,
            });
            break; // Only report once per block
        }
    }
    return issues;
}
const ALL_RULES = [
    ruleEmptyBlockText,
    ruleUnsafeCanonicalCommit,
    ruleUndefinedTerm,
    ruleDomainIrrelevantContent,
    ruleRedundantNarrative,
];
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Run the deterministic linter on an artifact.
 *
 * ref: §7 — This is an L1 Evidence Skill.
 * ref: §10.1 — Output is Issue[], not patches.
 *
 * @returns Array of Issue objects. These must enter quarantine (ref: C-03).
 */
export function lintArtifact(artifact) {
    resetIssueCounter();
    // Build cross-block index for redundancy detection
    const allBlocks = [];
    for (const section of artifact.sections) {
        for (const block of section.commitments) {
            allBlocks.push({ block, section_id: section.section_id });
        }
    }
    const ctx = {
        artifact_id: artifact.artifact_id,
        base_revision_id: artifact.revision_id,
        artifact_type: artifact.artifact_type,
        definedTerms: collectDefinedTerms(artifact),
        allBlocks,
    };
    const issues = [];
    for (const section of artifact.sections) {
        for (const block of section.commitments) {
            for (const rule of ALL_RULES) {
                issues.push(...rule(block, ctx));
            }
        }
    }
    return issues;
}
/**
 * Run a single lint rule by name (for testing / selective linting).
 */
export function lintBlockWithRule(ruleName, block, ctx) {
    const ruleMap = {
        unsafe_canonical_commit: ruleUnsafeCanonicalCommit,
        undefined_term: ruleUndefinedTerm,
        empty_block_text: ruleEmptyBlockText,
        domain_irrelevant_content: ruleDomainIrrelevantContent,
        redundant_narrative: ruleRedundantNarrative,
    };
    const rule = ruleMap[ruleName];
    if (!rule) {
        throw new Error(`Unknown lint rule: ${ruleName}`);
    }
    return rule(block, ctx);
}
//# sourceMappingURL=linter.js.map
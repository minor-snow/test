/**
 * P30: Architecture Claim Extractor
 *
 * Three-source claim extraction engine (P30-0.5 evolution):
 *
 *   Source 1: Structured hint blocks (`<!-- pantheon-arch ... -->`)
 *             → Highest confidence, deterministic, no ambiguity
 *
 *   Source 2: Glossary-assisted matching
 *             → Term + alias match in text produces claims even
 *               without standard trigger words
 *
 *   Source 3: Phrase rules (English + Chinese)
 *             → Fallback pattern matching for free-form prose
 *
 * Confidence is evidence-driven, not phrase-specificity-driven:
 *   High:   relation trigger + glossary term + path evidence
 *           OR structured hint block
 *   Medium: glossary term + nearby path evidence
 *           OR relation trigger + known module heading
 *   Low:    relation trigger only
 *           OR glossary term only
 *
 * No LLM. Deterministic only.
 *
 * ref: P30
 */
import { generateClaimId } from "./architectureId.js";
import { findGlossaryMatches } from "./architectureGlossaryStore.js";
/**
 * Ordered list of extraction rules. First match wins per text segment.
 * Patterns are designed to be conservative — we prefer fewer high-confidence
 * claims over many low-confidence ones.
 */
const EXTRACTION_RULES = [
    // ── English ownership patterns ──────────────────────────────────
    {
        pattern: /(\w[\w\s/.*-]*)\s+owns\s+(\w[\w\s/.*-]*)/i,
        claimKind: "ownership",
        relationType: "owns",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 2,
    },
    {
        pattern: /(\w[\w\s/.*-]*)\s+(?:is\s+)?responsible\s+for\s+(\w[\w\s/.*-]*)/i,
        claimKind: "ownership",
        relationType: "owns",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    {
        pattern: /(\w[\w\s/.*-]*)\s+(?:is\s+)?located\s+(?:at|in)\s+(\S+)/i,
        claimKind: "ownership",
        relationType: "located_at",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 2,
    },
    {
        pattern: /(\w[\w\s/.*-]*)\s+lives\s+in\s+(\S+)/i,
        claimKind: "ownership",
        relationType: "located_at",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // ── English dependency boundary patterns ────────────────────────
    {
        pattern: /(\w[\w\s/.*-]*)\s+must\s+not\s+(?:depend\s+on|import|access)\s+(\w[\w\s/.*-]*)/i,
        claimKind: "dependency",
        relationType: "must_not_depend_on",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 2,
    },
    {
        pattern: /(\w[\w\s/.*-]*)\s+cannot\s+(?:import|access|depend\s+on)\s+(\w[\w\s/.*-]*)/i,
        claimKind: "dependency",
        relationType: "must_not_depend_on",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 2,
    },
    {
        pattern: /(\w[\w\s/.*-]*)\s+(?:depends\s+on|uses|requires)\s+(\w[\w\s/.*-]*)/i,
        claimKind: "dependency",
        relationType: "depends_on",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // ── English review policy patterns ──────────────────────────────
    {
        pattern: /(\w[\w\s/.*-]*)\s+(?:changes?\s+)?(?:requires?\s+review|must\s+be\s+reviewed)/i,
        claimKind: "review_policy",
        relationType: "review_required_for",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 0,
    },
    {
        pattern: /(?:changes?\s+(?:to|in)\s+)?(\w[\w\s/.*-]*)\s+(?:are\s+)?sensitive/i,
        claimKind: "review_policy",
        relationType: "review_required_for",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 0,
    },
    // ── English forbidden patterns ──────────────────────────────────
    {
        pattern: /(\w[\w\s/.*-]*)\s+(?:is|are)\s+forbidden/i,
        claimKind: "review_policy",
        relationType: "forbidden_change",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 0,
    },
    // ── English external service patterns ───────────────────────────
    {
        pattern: /(\w[\w\s/.*-]*)\s+(?:is\s+(?:an?\s+)?)?external\s+(?:service|API|dependency)/i,
        claimKind: "external_service",
        relationType: "external_service",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 0,
    },
    {
        pattern: /(\w[\w\s/.*-]*)\s+(?:is\s+)?(?:a\s+)?third[- ]party/i,
        claimKind: "external_service",
        relationType: "external_service",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 0,
    },
    // ── English adapter patterns ────────────────────────────────────
    {
        pattern: /(\w[\w\s/.*-]*)\s+(?:is\s+(?:an?\s+)?)?adapter\s+for\s+(\w[\w\s/.*-]*)/i,
        claimKind: "external_service",
        relationType: "adapter_for",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 2,
    },
    {
        pattern: /(\w[\w\s/.*-]*)\s+adapts\s+(\w[\w\s/.*-]*)/i,
        claimKind: "external_service",
        relationType: "adapter_for",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // ── English data flow patterns ──────────────────────────────────
    {
        pattern: /(\w[\w\s/.*-]*)\s+writes\s+to\s+(\w[\w\s/.*-]*)/i,
        claimKind: "data_flow",
        relationType: "writes_to",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    {
        pattern: /(\w[\w\s/.*-]*)\s+reads\s+from\s+(\w[\w\s/.*-]*)/i,
        claimKind: "data_flow",
        relationType: "reads_from",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    {
        pattern: /(\w[\w\s/.*-]*)\s+(?:is\s+)?tested\s+by\s+(\S+)/i,
        claimKind: "data_flow",
        relationType: "tested_by",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // ── English interface / boundary patterns ───────────────────────
    {
        pattern: /(\w[\w\s/.*-]*)\s+exposes\s+(?:an?\s+)?interface/i,
        claimKind: "boundary",
        relationType: "exposes_interface",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 0,
    },
    {
        pattern: /(\w[\w\s/.*-]*)\s+(?:is\s+(?:the\s+)?)?entrypoint\s+for\s+(\w[\w\s/.*-]*)/i,
        claimKind: "boundary",
        relationType: "entrypoint_for",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    {
        pattern: /boundary\s+between\s+(\w[\w\s/.*-]*)\s+and\s+(\w[\w\s/.*-]*)/i,
        claimKind: "boundary",
        relationType: "boundary_between",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // ══════════════════════════════════════════════════════════════════
    // Chinese phrase rules (minimal set for bilingual architecture docs)
    // ══════════════════════════════════════════════════════════════════
    // Ownership: 拥有 / 负责
    {
        pattern: /([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*(?:\u62E5\u6709|\u8D1F\u8D23)\s*([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)/,
        claimKind: "ownership",
        relationType: "owns",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // Ownership: 位于 / 属于
    {
        pattern: /([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*(?:\u4F4D\u4E8E|\u5C5E\u4E8E)\s*(\S+)/,
        claimKind: "ownership",
        relationType: "located_at",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // Dependency boundary: 不得/不能/禁止 + 依赖/访问/导入
    {
        pattern: /([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*(?:\u4E0D\u5F97|\u4E0D\u80FD|\u7981\u6B62)(?:\u4F9D\u8D56|\u8BBF\u95EE|\u5BFC\u5165)\s*([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)/,
        claimKind: "dependency",
        relationType: "must_not_depend_on",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // Dependency: 依赖/使用
    {
        pattern: /([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*(?:\u4F9D\u8D56|\u4F7F\u7528)\s*([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)/,
        claimKind: "dependency",
        relationType: "depends_on",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // Review: 需要审查 / 必须审查
    {
        pattern: /([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*(?:\u9700\u8981|\u5FC5\u987B)(?:\u4EBA\u5DE5)?\u5BA1[\u67E5\u6838]/,
        claimKind: "review_policy",
        relationType: "review_required_for",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 0,
    },
    // Forbidden: 禁止修改
    {
        pattern: /(?:\u7981\u6B62|\u4E0D\u5141\u8BB8)(?:\u4FEE\u6539|\u53D8\u66F4|\u7F16\u8F91)\s*([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)/,
        claimKind: "review_policy",
        relationType: "forbidden_change",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 0,
    },
    // External: 外部服务 / 外部依赖
    {
        pattern: /([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*(?:\u662F)?(?:\u5916\u90E8\u670D\u52A1|\u5916\u90E8\u4F9D\u8D56)/,
        claimKind: "external_service",
        relationType: "external_service",
        confidence: "high",
        subjectGroup: 1,
        objectGroup: 0,
    },
    // External: 第三方
    {
        pattern: /([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*(?:\u662F)?\u7B2C\u4E09\u65B9/,
        claimKind: "external_service",
        relationType: "external_service",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 0,
    },
    // Data flow: 写入
    {
        pattern: /([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*\u5199\u5165\s*([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)/,
        claimKind: "data_flow",
        relationType: "writes_to",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // Data flow: 读取
    {
        pattern: /([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*(?:\u8BFB\u53D6|\u8BFB)\s*([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)/,
        claimKind: "data_flow",
        relationType: "reads_from",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
    // Boundary: X 与 Y 之间的边界
    {
        pattern: /([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*(?:\u4E0E|\u548C)\s*([\w\u4e00-\u9fff][\w\s/.*\u4e00-\u9fff-]*)\s*(?:\u4E4B\u95F4)?(?:\u7684)?\u8FB9\u754C/,
        claimKind: "boundary",
        relationType: "boundary_between",
        confidence: "medium",
        subjectGroup: 1,
        objectGroup: 2,
    },
];
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Extract architecture claims from parsed markdown sections.
 *
 * Three-source extraction priority:
 *   1. Structured hint blocks (deterministic, highest confidence)
 *   2. Glossary-assisted text matching (term/alias presence)
 *   3. Phrase rules (English + Chinese fallback)
 *
 * Claims are deduplicated by (subject, relation, object) triple.
 */
export function extractArchitectureClaims(archId, sections, glossary) {
    const claims = [];
    const seen = new Set();
    function addClaim(claim) {
        if (!seen.has(claimKey(claim))) {
            seen.add(claimKey(claim));
            claims.push(claim);
        }
    }
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex];
        // ── Source 1: Structured hint blocks ───────────────────────────
        for (const hint of section.structuredHints) {
            const hintClaims = extractClaimsFromStructuredHint(archId, sectionIndex, section, hint);
            for (const c of hintClaims)
                addClaim(c);
        }
        // ── Source 2: Glossary-assisted matching ───────────────────────
        if (glossary) {
            for (const bullet of section.bullets) {
                const glossaryClaims = extractClaimsFromGlossary(archId, sectionIndex, section, bullet.text, bullet.lineNumber, glossary);
                for (const c of glossaryClaims)
                    addClaim(c);
            }
            // Glossary on raw content lines
            const contentLines = section.content.split("\n");
            for (let lineOffset = 0; lineOffset < contentLines.length; lineOffset++) {
                const line = contentLines[lineOffset].trim();
                if (!line || line.startsWith("#") || line.startsWith("```") || line.startsWith("|"))
                    continue;
                if (line.startsWith("<!--"))
                    continue;
                const lineNum = section.lineStart + lineOffset;
                const glossaryClaims = extractClaimsFromGlossary(archId, sectionIndex, section, line, lineNum, glossary);
                for (const c of glossaryClaims)
                    addClaim(c);
            }
        }
        // ── Source 3: Phrase rules (English + Chinese) ─────────────────
        for (const bullet of section.bullets) {
            const claim = tryExtractClaim(archId, sectionIndex, section, bullet.text, bullet.lineNumber);
            if (claim)
                addClaim(claim);
        }
        for (const table of section.tables) {
            for (let rowIdx = 0; rowIdx < table.rows.length; rowIdx++) {
                const row = table.rows[rowIdx];
                const combinedText = row.join(" | ");
                const lineNum = table.lineStart + 2 + rowIdx;
                const claim = tryExtractClaim(archId, sectionIndex, section, combinedText, lineNum);
                if (claim)
                    addClaim(claim);
            }
        }
        const contentLines = section.content.split("\n");
        for (let lineOffset = 0; lineOffset < contentLines.length; lineOffset++) {
            const line = contentLines[lineOffset].trim();
            if (!line || line.startsWith("#") || line.startsWith("```") || line.startsWith("|"))
                continue;
            if (line.startsWith("<!--"))
                continue;
            const lineNum = section.lineStart + lineOffset;
            const claim = tryExtractClaim(archId, sectionIndex, section, line, lineNum);
            if (claim)
                addClaim(claim);
        }
    }
    return claims;
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function tryExtractClaim(archId, sectionIndex, section, text, lineNumber) {
    for (const rule of EXTRACTION_RULES) {
        const match = text.match(rule.pattern);
        if (!match)
            continue;
        const subject = cleanExtractedName(match[rule.subjectGroup] ?? "");
        const object = rule.objectGroup > 0 ? cleanExtractedName(match[rule.objectGroup] ?? "") : "";
        if (!subject)
            continue;
        return {
            claim_id: generateClaimId(archId, sectionIndex, lineNumber),
            source_path: "", // filled by caller
            source_heading: section.heading,
            source_line_start: lineNumber,
            source_line_end: lineNumber,
            raw_text: text.slice(0, 500), // truncate very long lines
            extracted_subject: subject,
            extracted_relation: rule.relationType,
            extracted_object: object || undefined,
            claim_kind: rule.claimKind,
            extraction_confidence: rule.confidence,
            status: "candidate",
        };
    }
    return null;
}
function claimKey(claim) {
    return `${claim.extracted_subject}:${claim.extracted_relation}:${claim.extracted_object ?? ""}`;
}
/**
 * Clean up extracted names: trim whitespace, remove surrounding quotes/backticks.
 */
function cleanExtractedName(raw) {
    return raw
        .trim()
        .replace(/^["`']+|["`']+$/g, "")
        .trim();
}
// ---------------------------------------------------------------------------
// Source 1: Structured hint block extraction
// ---------------------------------------------------------------------------
function extractClaimsFromStructuredHint(archId, sectionIndex, section, hint) {
    const claims = [];
    const lineNum = hint.lineStart;
    // owns
    if (hint.owns) {
        for (const path of hint.owns) {
            claims.push({
                claim_id: generateClaimId(archId, sectionIndex, lineNum),
                source_path: "",
                source_heading: section.heading,
                source_line_start: hint.lineStart,
                source_line_end: hint.lineEnd,
                raw_text: `[structured-hint] ${hint.module} owns ${path}`,
                extracted_subject: hint.module,
                extracted_relation: "owns",
                extracted_object: path,
                claim_kind: "ownership",
                extraction_confidence: "high",
                status: "candidate",
            });
        }
    }
    // review_required
    if (hint.review_required) {
        for (const path of hint.review_required) {
            claims.push({
                claim_id: generateClaimId(archId, sectionIndex, lineNum + 1),
                source_path: "",
                source_heading: section.heading,
                source_line_start: hint.lineStart,
                source_line_end: hint.lineEnd,
                raw_text: `[structured-hint] ${hint.module} review_required ${path}`,
                extracted_subject: hint.module,
                extracted_relation: "review_required_for",
                extracted_object: path,
                claim_kind: "review_policy",
                extraction_confidence: "high",
                status: "candidate",
            });
        }
    }
    // forbidden
    if (hint.forbidden) {
        for (const path of hint.forbidden) {
            claims.push({
                claim_id: generateClaimId(archId, sectionIndex, lineNum + 2),
                source_path: "",
                source_heading: section.heading,
                source_line_start: hint.lineStart,
                source_line_end: hint.lineEnd,
                raw_text: `[structured-hint] ${hint.module} forbidden ${path}`,
                extracted_subject: hint.module,
                extracted_relation: "forbidden_change",
                extracted_object: path,
                claim_kind: "review_policy",
                extraction_confidence: "high",
                status: "candidate",
            });
        }
    }
    // external
    if (hint.external) {
        for (const svc of hint.external) {
            claims.push({
                claim_id: generateClaimId(archId, sectionIndex, lineNum + 3),
                source_path: "",
                source_heading: section.heading,
                source_line_start: hint.lineStart,
                source_line_end: hint.lineEnd,
                raw_text: `[structured-hint] ${hint.module} external ${svc}`,
                extracted_subject: svc,
                extracted_relation: "external_service",
                extracted_object: undefined,
                claim_kind: "external_service",
                extraction_confidence: "high",
                status: "candidate",
            });
        }
    }
    // depends_on
    if (hint.depends_on) {
        for (const dep of hint.depends_on) {
            claims.push({
                claim_id: generateClaimId(archId, sectionIndex, lineNum + 4),
                source_path: "",
                source_heading: section.heading,
                source_line_start: hint.lineStart,
                source_line_end: hint.lineEnd,
                raw_text: `[structured-hint] ${hint.module} depends_on ${dep}`,
                extracted_subject: hint.module,
                extracted_relation: "depends_on",
                extracted_object: dep,
                claim_kind: "dependency",
                extraction_confidence: "high",
                status: "candidate",
            });
        }
    }
    // must_not_depend_on
    if (hint.must_not_depend_on) {
        for (const dep of hint.must_not_depend_on) {
            claims.push({
                claim_id: generateClaimId(archId, sectionIndex, lineNum + 5),
                source_path: "",
                source_heading: section.heading,
                source_line_start: hint.lineStart,
                source_line_end: hint.lineEnd,
                raw_text: `[structured-hint] ${hint.module} must_not_depend_on ${dep}`,
                extracted_subject: hint.module,
                extracted_relation: "must_not_depend_on",
                extracted_object: dep,
                claim_kind: "dependency",
                extraction_confidence: "high",
                status: "candidate",
            });
        }
    }
    return claims;
}
// ---------------------------------------------------------------------------
// Source 2: Glossary-assisted extraction
// ---------------------------------------------------------------------------
/**
 * If a glossary term or alias appears in text, and phrase rules didn't
 * already produce a claim for it, produce a needs_review claim.
 *
 * This ensures unknown text is surfaced for user review rather than
 * silently dropped.
 */
function extractClaimsFromGlossary(archId, sectionIndex, section, text, lineNumber, glossary) {
    const claims = [];
    const matches = findGlossaryMatches(text, glossary, { includeUnaccepted: true });
    for (const match of matches) {
        // Determine confidence based on match quality and path evidence
        let confidence = "low";
        if (match.match_type === "exact" && match.entry.path_patterns.length > 0) {
            confidence = "medium";
        }
        if (match.match_type === "exact" && match.entry.status === "accepted") {
            confidence = "medium";
        }
        // Check if a phrase rule also fires on this text — if so, boost confidence
        const phraseResult = tryExtractClaim(archId, sectionIndex, section, text, lineNumber);
        if (phraseResult && phraseResult.extracted_subject === match.entry.term) {
            // Phrase rule + glossary = high confidence
            // The phrase rule claim is already added by Source 3, so just skip
            continue;
        }
        // Produce a needs_review claim for glossary-only matches
        const pathStr = match.entry.path_patterns.length > 0
            ? match.entry.path_patterns[0]
            : undefined;
        claims.push({
            claim_id: generateClaimId(archId, sectionIndex, lineNumber),
            source_path: "",
            source_heading: section.heading,
            source_line_start: lineNumber,
            source_line_end: lineNumber,
            raw_text: text.slice(0, 500),
            extracted_subject: match.entry.term,
            extracted_relation: "owns", // Default; user must review
            extracted_object: pathStr,
            claim_kind: "ownership",
            extraction_confidence: confidence,
            status: "needs_review",
        });
    }
    return claims;
}
//# sourceMappingURL=architectureClaimExtractor.js.map
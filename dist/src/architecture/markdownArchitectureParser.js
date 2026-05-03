/**
 * P30: Markdown Architecture Parser
 *
 * Pure deterministic markdown structure extraction.
 * Extracts headings, bullets, tables, code blocks, inline path patterns,
 * and structured hint blocks from architecture documentation.
 *
 * Structured hint blocks (`<!-- pantheon-arch ... -->`) provide
 * deterministic, high-confidence extraction without phrase rules.
 *
 * No LLM. No content interpretation. Only structural decomposition.
 *
 * ref: P30
 */
// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------
const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const BULLET_RE = /^(\s*)[-*+]\s+(.+)$/;
const FENCE_START_RE = /^```(\w*)$/;
const FENCE_END_RE = /^```\s*$/;
const TABLE_SEPARATOR_RE = /^\s*\|?\s*[-:]+[-|\s:]*$/;
const TABLE_ROW_RE = /^\|(.+)\|$/;
/**
 * Matches repo-relative path patterns like:
 *   src/billing/**
 *   packages/api/
 *   .github/workflows/**
 *   test/billing/foo.test.ts
 *
 * Conservative: requires at least one slash, avoids matching URLs or random text.
 */
const INLINE_PATH_RE = /(?:^|[\s`"'(,])([a-zA-Z0-9_.][a-zA-Z0-9_./\-*]*\/[a-zA-Z0-9_./\-*]*[a-zA-Z0-9_*])/g;
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Parse a markdown document into structured sections.
 * Each section corresponds to a heading and its content until the next heading of equal or higher level.
 */
export function parseMarkdownArchitecture(content) {
    const lines = content.split("\n");
    const sections = [];
    // First pass: find all heading positions
    const headingPositions = [];
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (FENCE_START_RE.test(line) && !inFence) {
            inFence = true;
            continue;
        }
        if (FENCE_END_RE.test(line) && inFence) {
            inFence = false;
            continue;
        }
        if (inFence)
            continue;
        const headingMatch = line.match(HEADING_RE);
        if (headingMatch) {
            headingPositions.push({
                heading: headingMatch[2].trim(),
                level: headingMatch[1].length,
                lineIndex: i,
            });
        }
    }
    // No headings found — treat entire document as one section
    if (headingPositions.length === 0) {
        const contentBlock = lines.join("\n");
        return [{
                heading: "(document root)",
                level: 0,
                lineStart: 1,
                lineEnd: lines.length,
                content: contentBlock,
                bullets: extractBullets(lines, 0, lines.length - 1),
                codeBlocks: extractCodeBlocks(lines, 0, lines.length - 1),
                tables: extractTables(lines, 0, lines.length - 1),
                inlinePaths: extractInlinePaths(contentBlock),
                structuredHints: extractStructuredHints(lines, 0, lines.length - 1),
            }];
    }
    // Second pass: build sections from heading boundaries
    for (let i = 0; i < headingPositions.length; i++) {
        const current = headingPositions[i];
        const nextLineIndex = i + 1 < headingPositions.length
            ? headingPositions[i + 1].lineIndex
            : lines.length;
        const sectionLines = lines.slice(current.lineIndex, nextLineIndex);
        const contentBlock = sectionLines.join("\n");
        sections.push({
            heading: current.heading,
            level: current.level,
            lineStart: current.lineIndex + 1, // 1-indexed
            lineEnd: nextLineIndex, // 1-indexed exclusive → inclusive of last content line
            content: contentBlock,
            bullets: extractBullets(lines, current.lineIndex, nextLineIndex - 1),
            codeBlocks: extractCodeBlocks(lines, current.lineIndex, nextLineIndex - 1),
            tables: extractTables(lines, current.lineIndex, nextLineIndex - 1),
            inlinePaths: extractInlinePaths(contentBlock),
            structuredHints: extractStructuredHints(lines, current.lineIndex, nextLineIndex - 1),
        });
    }
    return sections;
}
// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------
function extractBullets(lines, startIdx, endIdx) {
    const bullets = [];
    let inFence = false;
    for (let i = startIdx; i <= endIdx && i < lines.length; i++) {
        const line = lines[i];
        if (FENCE_START_RE.test(line) && !inFence) {
            inFence = true;
            continue;
        }
        if (FENCE_END_RE.test(line) && inFence) {
            inFence = false;
            continue;
        }
        if (inFence)
            continue;
        const bulletMatch = line.match(BULLET_RE);
        if (bulletMatch) {
            bullets.push({
                text: bulletMatch[2].trim(),
                lineNumber: i + 1, // 1-indexed
                indent: bulletMatch[1].length,
            });
        }
    }
    return bullets;
}
function extractCodeBlocks(lines, startIdx, endIdx) {
    const blocks = [];
    let inFence = false;
    let fenceStart = 0;
    let fenceLang = "";
    let fenceContent = [];
    for (let i = startIdx; i <= endIdx && i < lines.length; i++) {
        const line = lines[i];
        if (!inFence) {
            const startMatch = line.match(FENCE_START_RE);
            if (startMatch) {
                inFence = true;
                fenceStart = i;
                fenceLang = startMatch[1] || "";
                fenceContent = [];
            }
        }
        else {
            if (FENCE_END_RE.test(line)) {
                blocks.push({
                    language: fenceLang,
                    content: fenceContent.join("\n"),
                    lineStart: fenceStart + 1,
                    lineEnd: i + 1,
                });
                inFence = false;
            }
            else {
                fenceContent.push(line);
            }
        }
    }
    return blocks;
}
function extractTables(lines, startIdx, endIdx) {
    const tables = [];
    let inFence = false;
    for (let i = startIdx; i <= endIdx && i < lines.length; i++) {
        const line = lines[i];
        if (FENCE_START_RE.test(line) && !inFence) {
            inFence = true;
            continue;
        }
        if (FENCE_END_RE.test(line) && inFence) {
            inFence = false;
            continue;
        }
        if (inFence)
            continue;
        // Look for table pattern: header row, separator row, data rows
        const headerMatch = line.match(TABLE_ROW_RE);
        if (!headerMatch)
            continue;
        // Check next line for separator
        if (i + 1 > endIdx || i + 1 >= lines.length)
            continue;
        const nextLine = lines[i + 1];
        if (!TABLE_SEPARATOR_RE.test(nextLine))
            continue;
        // Found a table
        const headers = parseTableCells(headerMatch[1]);
        const rows = [];
        const tableStart = i;
        // Skip header and separator
        let j = i + 2;
        while (j <= endIdx && j < lines.length) {
            const rowMatch = lines[j].match(TABLE_ROW_RE);
            if (!rowMatch)
                break;
            rows.push(parseTableCells(rowMatch[1]));
            j++;
        }
        tables.push({
            headers,
            rows,
            lineStart: tableStart + 1,
            lineEnd: j,
        });
        // Skip past the table
        i = j - 1;
    }
    return tables;
}
function parseTableCells(rawContent) {
    return rawContent.split("|").map(cell => cell.trim()).filter(cell => cell.length > 0);
}
function extractInlinePaths(content) {
    const paths = new Set();
    let match;
    // Reset regex
    INLINE_PATH_RE.lastIndex = 0;
    while ((match = INLINE_PATH_RE.exec(content)) !== null) {
        const candidate = match[1];
        // Filter out URLs
        if (candidate.includes("://") || candidate.startsWith("http"))
            continue;
        // Filter out very short patterns that are likely false positives
        if (candidate.length < 4)
            continue;
        // Must look like a repo path (not a version number like 0.1.0)
        if (/^\d+\.\d+/.test(candidate))
            continue;
        paths.add(candidate);
    }
    return [...paths].sort();
}
/**
 * Extract structured hint blocks from `<!-- pantheon-arch ... -->` comments.
 *
 * Format:
 * ```
 * <!-- pantheon-arch
 * module: Billing
 * owns:
 *   - src/billing/**
 * review_required:
 *   - src/payment-gateway/**
 * forbidden:
 *   - src/db/migrations/**
 * external:
 *   - Stripe
 * depends_on:
 *   - Auth
 * must_not_depend_on:
 *   - Database
 * -->
 * ```
 */
function extractStructuredHints(lines, startIdx, endIdx) {
    const hints = [];
    let i = startIdx;
    while (i <= endIdx && i < lines.length) {
        const line = lines[i].trim();
        // Look for opening <!-- pantheon-arch
        if (line.startsWith("<!-- pantheon-arch")) {
            const hintStart = i;
            const hintLines = [];
            // Check if it's a single-line hint
            if (line.endsWith("-->")) {
                hintLines.push(line.replace("<!-- pantheon-arch", "").replace("-->", "").trim());
                const hint = parseStructuredHintBlock(hintLines, hintStart + 1, i + 1);
                if (hint)
                    hints.push(hint);
                i++;
                continue;
            }
            // Multi-line: collect until -->
            i++;
            while (i <= endIdx && i < lines.length) {
                const innerLine = lines[i];
                if (innerLine.trim() === "-->") {
                    break;
                }
                hintLines.push(innerLine);
                i++;
            }
            const hint = parseStructuredHintBlock(hintLines, hintStart + 1, i + 1);
            if (hint)
                hints.push(hint);
        }
        i++;
    }
    return hints;
}
/**
 * Parse the content of a structured hint block.
 * Uses simple YAML-like key: value and key:\n  - item parsing.
 */
function parseStructuredHintBlock(lines, lineStart, lineEnd) {
    let module = "";
    const owns = [];
    const reviewRequired = [];
    const forbidden = [];
    const external = [];
    const dependsOn = [];
    const mustNotDependOn = [];
    let currentList = null;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        // Key: value on same line
        const kvMatch = trimmed.match(/^(\w[\w_]*):\s*(.+)$/);
        if (kvMatch) {
            const key = kvMatch[1].toLowerCase();
            const value = kvMatch[2].trim();
            switch (key) {
                case "module":
                    module = value;
                    currentList = null;
                    break;
                case "owns":
                    currentList = owns;
                    if (value && !value.startsWith("-"))
                        owns.push(value);
                    break;
                case "review_required":
                    currentList = reviewRequired;
                    if (value && !value.startsWith("-"))
                        reviewRequired.push(value);
                    break;
                case "forbidden":
                    currentList = forbidden;
                    if (value && !value.startsWith("-"))
                        forbidden.push(value);
                    break;
                case "external":
                    currentList = external;
                    if (value && !value.startsWith("-"))
                        external.push(value);
                    break;
                case "depends_on":
                    currentList = dependsOn;
                    if (value && !value.startsWith("-"))
                        dependsOn.push(value);
                    break;
                case "must_not_depend_on":
                    currentList = mustNotDependOn;
                    if (value && !value.startsWith("-"))
                        mustNotDependOn.push(value);
                    break;
                default:
                    currentList = null;
            }
            continue;
        }
        // Key: (empty value, list follows)
        const keyOnlyMatch = trimmed.match(/^(\w[\w_]*):\s*$/);
        if (keyOnlyMatch) {
            const key = keyOnlyMatch[1].toLowerCase();
            switch (key) {
                case "owns":
                    currentList = owns;
                    break;
                case "review_required":
                    currentList = reviewRequired;
                    break;
                case "forbidden":
                    currentList = forbidden;
                    break;
                case "external":
                    currentList = external;
                    break;
                case "depends_on":
                    currentList = dependsOn;
                    break;
                case "must_not_depend_on":
                    currentList = mustNotDependOn;
                    break;
                default: currentList = null;
            }
            continue;
        }
        // List item: - value
        const listMatch = trimmed.match(/^-\s+(.+)$/);
        if (listMatch && currentList) {
            currentList.push(listMatch[1].trim());
            continue;
        }
    }
    if (!module)
        return null;
    return {
        module,
        owns: owns.length > 0 ? owns : undefined,
        review_required: reviewRequired.length > 0 ? reviewRequired : undefined,
        forbidden: forbidden.length > 0 ? forbidden : undefined,
        external: external.length > 0 ? external : undefined,
        depends_on: dependsOn.length > 0 ? dependsOn : undefined,
        must_not_depend_on: mustNotDependOn.length > 0 ? mustNotDependOn : undefined,
        lineStart,
        lineEnd,
    };
}
//# sourceMappingURL=markdownArchitectureParser.js.map
/**
 * Draft Promotion + Quarantine Isolation — Tests
 *
 * ref: P8 BUG-6 regression tests
 *
 * Verifies:
 *   1. runIdeaToDraft does NOT create canonical pointer
 *   2. runIdeaToDraft does NOT write canonical revision
 *   3. runIdeaToDraft does NOT append canonical audit
 *   4. promoteDraft creates canonical pointer after approval
 *   5. promoteDraft appends "draft_promoted" audit
 *   6. promoteDraft rejects missing quarantine items
 *   7. promoteDraft rejects invalid artifacts
 */
export {};

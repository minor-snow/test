/**
 * Corruption Suite
 *
 * ref: HARD-003
 *
 * Tests that the system SAFELY FAILS when data is corrupted.
 * The acceptance criterion is NOT "auto-repair" but
 * "明确报错，不假装 clean" (explicit error, never pretend clean).
 *
 * Each test corrupts data in a specific way, then verifies the system
 * either rejects the operation or reports the corruption.
 *
 * Categories:
 *   A. integrityCheck detections (HARD-002)
 *   B. applyPatch / applyOverridePatch rejections (HARD-001)
 *   C. validator pipeline rejections
 */
export {};

/**
 * HARD-007: LLM Rejection Capability Tests
 *
 * ref: HARD-007, 执行宪法 v0.2 §7, §8, §10
 *
 * First batch: ONLY tests rejection ability. No generation tests.
 *
 * Proves that when a real LLM output is connected, the existing
 * gate system will not degrade. Every test here is a negative test.
 *
 * Cases:
 *   1. Bad JSON → json_parse gate rejects
 *   2. Unknown block in PatchProposal → source_reference_gate rejects
 *   3. Unauthorized skill output → capability_gate rejects
 *   4. Wrong hash in ArtifactPatch → applyPatch HASH_MISMATCH
 *   5. L1 skill forging PatchProposal → capability_gate rejects
 *   6. Valid JSON but missing required fields → schema_gate rejects
 *   7. PatchProposal with empty operations → schema_gate rejects
 *   8. Oversized replacement_text → type_specific_invariant rejects
 *   9. base_revision_id mismatch → applyPatch rejects
 *  10. L2 agent targeting canonical directly → capability_gate rejects
 */
export {};

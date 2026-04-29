/**
 * Fake LLM Client — for testing
 *
 * ref: P3-002
 *
 * Returns pre-configured responses in order.
 * Used by trialRunner.test.ts so tests don't hit real APIs.
 */
import type { LlmClient } from "./llmClient.js";
/**
 * Create a fake LLM client that returns responses in sequence.
 * After all responses are exhausted, returns an error JSON.
 */
export declare function createFakeLlmClient(responses: string[]): LlmClient;

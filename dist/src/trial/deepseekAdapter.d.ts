/**
 * DeepSeek LLM Adapter
 *
 * ref: P3-002
 *
 * Implements LlmClient using DeepSeek's OpenAI-compatible API.
 * Base URL: https://api.deepseek.com
 *
 * API key is passed via config (caller reads from env or .env).
 */
import type { LlmClient } from "./llmClient.js";
export type DeepSeekConfig = {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
};
/**
 * Create a DeepSeek LLM client.
 *
 * Uses fetch (available in Node 18+) — no extra dependencies.
 */
export declare function createDeepSeekClient(config: DeepSeekConfig): LlmClient;

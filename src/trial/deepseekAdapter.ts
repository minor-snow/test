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
  model?: string;       // default: "deepseek-chat"
  maxTokens?: number;   // default: 2048
  temperature?: number; // default: 0.3
};

/**
 * Create a DeepSeek LLM client.
 *
 * Uses fetch (available in Node 18+) — no extra dependencies.
 */
export function createDeepSeekClient(config: DeepSeekConfig): LlmClient {
  const model = config.model ?? "deepseek-chat";
  const maxTokens = config.maxTokens ?? 2048;
  const temperature = config.temperature ?? 0.3;

  return {
    async complete(prompt: string): Promise<string> {
      const controller = new AbortController();
      const timeoutMs = 30_000;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a precise patch agent. You output ONLY valid JSON. " +
                  "No markdown fences, no explanation, no commentary.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: maxTokens,
            temperature,
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error(`DeepSeek API request timed out after ${timeoutMs}ms`);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `DeepSeek API error ${response.status}: ${errorBody}`
        );
      }

      const data = (await response.json()) as Record<string, unknown>;

      // Shape guard: choices must exist, be non-empty, and content must be a string.
      const choices = data.choices;
      if (!Array.isArray(choices) || choices.length === 0) {
        throw new Error("DeepSeek API returned no choices");
      }
      const message = (choices[0] as Record<string, unknown>)?.message;
      const content = (message as Record<string, unknown>)?.content;
      if (typeof content !== "string") {
        throw new Error(
          `DeepSeek API returned invalid content (expected string, got ${typeof content})`
        );
      }

      return content.trim();
    },
  };
}

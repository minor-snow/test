/**
 * LLM Client Interface
 *
 * ref: P3-002
 *
 * Abstract interface for LLM completion.
 * trialRunner depends ONLY on this interface.
 * OpenAI / DeepSeek / fake clients are adapters.
 */
export type LlmClient = {
    /** Send a prompt, get raw completion string back. */
    complete(prompt: string): Promise<string>;
};

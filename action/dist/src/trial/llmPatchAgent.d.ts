/**
 * LLM Patch Agent
 *
 * ref: P3-002, P3-004
 *
 * Single agent, single responsibility, single output type.
 * Takes an artifact + issue → asks LLM to produce a PatchProposal.
 *
 * Returns raw JSON string. The caller sends it through
 * validateSkillOutput() — if the LLM output is invalid,
 * the gate system rejects it.
 *
 * This module NEVER retries, NEVER auto-fixes, NEVER falls back.
 */
import type { LlmClient } from "./llmClient.js";
import type { Artifact, Issue } from "../types.js";
/**
 * Build the prompt for the LLM patch agent.
 *
 * Visible for testing — the prompt is the contract between
 * the host and the LLM.
 */
export declare function buildPatchPrompt(artifact: Artifact, issue: Issue, peerArtifacts?: Artifact[]): string;
/**
 * Generate a PatchProposal via LLM.
 *
 * Returns the raw JSON string from the LLM.
 * The caller is responsible for validation via validateSkillOutput().
 */
export declare function generatePatchProposal(client: LlmClient, artifact: Artifact, issue: Issue, peerArtifacts?: Artifact[]): Promise<string>;

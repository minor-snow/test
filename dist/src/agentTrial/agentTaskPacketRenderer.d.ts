/**
 * P23: Agent Task Packet Renderer
 *
 * Renders AgentTaskPacket as human-readable markdown.
 * Includes authority notice: JSON is authoritative, markdown is projection.
 */
import type { AgentTaskPacket } from "./types.js";
export declare function renderAgentTaskPacketMarkdown(packet: AgentTaskPacket): string;

import fs from "node:fs";
import path from "node:path";

export function getPantheonCli(): string {
  if (process.env.CLARION_BIN) {
    return process.env.CLARION_BIN;
  }
  
  // Try local node_modules
  const localBin = path.join(process.cwd(), "node_modules", ".bin", "pantheon");
  if (fs.existsSync(localBin)) {
    return localBin.replace(/\\/g, "/");
  }

  // Try to use the locally built CLI from the parent clarion-release (used during development)
  const devBin = path.resolve(process.cwd(), "..", "dist", "src", "cli", "pantheon.js");
  if (fs.existsSync(devBin)) {
    return `node ${devBin.replace(/\\/g, "/")}`;
  }

  return "pantheon"; // assume in PATH
}

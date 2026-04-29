/**
 * P15.1 — Blast Radius Cockpit Dev Server
 *
 * Copies data files and serves static assets on port 3000.
 *
 * Usage:
 *   npx tsx cockpit/blast-radius/serve.ts
 */

import { createServer } from "node:http";
import { readFile, copyFile, mkdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { existsSync } from "node:fs";

const PORT = 3000;
const COCKPIT_DIR = join(process.cwd(), "cockpit", "blast-radius");
const DATA_DIR = join(COCKPIT_DIR, "data");
const STORE_ROOT = join(process.cwd(), "data", "dogfood", "p10");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

async function copyDataFiles() {
  await mkdir(DATA_DIR, { recursive: true });

  const files = [
    { src: join(STORE_ROOT, "boundary", "boundary_graph.json"), dest: join(DATA_DIR, "boundary_graph.json") },
    { src: join(STORE_ROOT, "boundary", "boundary_gates_report.json"), dest: join(DATA_DIR, "boundary_gates_report.json") },
    { src: join(STORE_ROOT, "boundary", "blast_radius_report.json"), dest: join(DATA_DIR, "sample_blast_radius_report.json") },
  ];

  for (const f of files) {
    if (existsSync(f.src)) {
      await copyFile(f.src, f.dest);
      console.log(`  ✅ ${f.dest.replace(COCKPIT_DIR, ".")}`);
    } else {
      console.log(`  ⚠ ${f.src} not found, skipping`);
    }
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║  P15.1: Blast Radius Cockpit                        ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  console.log("  Copying data files...");
  await copyDataFiles();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const fullPath = join(COCKPIT_DIR, filePath);

    // Security: prevent directory traversal
    if (!fullPath.startsWith(COCKPIT_DIR)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const content = await readFile(fullPath);
      const ext = extname(fullPath);
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  server.listen(PORT, () => {
    console.log(`\n  🚀 Cockpit running at http://localhost:${PORT}\n`);
  });
}

main().catch(err => { console.error("Server failed:", err); process.exit(1); });

import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
const SEED_FILE = join(__dirname, "..", "data", "dogfood", "p28b_python_matrix", "p28b_3_seed_repos.json");

const QUOTAS: Record<string, { q: string; target: number; page: number }> = {
  "python_cli_tool": { q: "cli", target: 40, page: 2 },
  "data_pipeline": { q: "etl OR data-pipeline", target: 40, page: 2 },
  "ml_scientific": { q: "machine-learning OR scientific", target: 40, page: 3 },
  "packaging": { q: "build OR packaging OR infra", target: 40, page: 2 },
  "python_monorepo": { q: "monorepo OR multi-package", target: 20, page: 2 },
  "generic_service": { q: "service OR api", target: 20, page: 3 },
};

async function fetchRepos() {
  const seeds: any[] = [];
  const token = process.env.GITHUB_TOKEN;
  const headers: any = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "Pantheon-Dogfood"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  for (const [category, config] of Object.entries(QUOTAS)) {
    console.log(`Fetching seeds for ${category}...`);
    const query = `language:python stars:>300 archived:false ${config.q}`;
    const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${config.target}&page=${config.page}`;
    
    try {
      const res = await fetch(searchUrl, { headers });
      if (!res.ok) {
        console.error(`Failed to fetch for ${category}: ${res.statusText}`);
        continue;
      }
      const data = await res.json();
      for (const item of data.items || []) {
        seeds.push({
          repo: item.full_name,
          intended_category: category,
          priority: "high",
          reason: `Auto-seeded via github search for ${config.q}`
        });
      }
    } catch (e) {
      console.error(e);
    }
    // Wait slightly to avoid rate limit
    await new Promise(r => setTimeout(r, 2000));
  }

  let existingSeeds: any[] = [];
  try {
    const content = readFileSync(SEED_FILE, "utf-8");
    existingSeeds = JSON.parse(content).repos || [];
  } catch (e) {
    console.log("No existing seeds found or error reading.");
  }
  
  // Merge
  const finalRepos = [...existingSeeds];
  for (const newSeed of seeds) {
    if (!finalRepos.find((r: any) => r.repo === newSeed.repo)) {
      finalRepos.push(newSeed);
    }
  }

  const out = {
    schema_version: "p28b_3_seed_repos@0.1.0",
    repos: finalRepos
  };

  writeFileSync(SEED_FILE, JSON.stringify(out, null, 2));
  console.log(`Wrote ${finalRepos.length} total seeds to ${SEED_FILE} (added ${finalRepos.length - existingSeeds.length})`);
}

fetchRepos();

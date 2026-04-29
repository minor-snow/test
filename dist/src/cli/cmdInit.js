/**
 * P24: pantheon init
 *
 * Creates pantheon.json and .pantheon/ directory.
 */
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ensurePantheonDirs } from "./artifactLayout.js";
import { generateDefaultConfigJson } from "./pantheonConfig.js";
export function cmdInit(repoRoot) {
    const configPath = join(repoRoot, "pantheon.json");
    if (existsSync(configPath)) {
        console.log("  pantheon.json already exists. Skipping.");
    }
    else {
        writeFileSync(configPath, generateDefaultConfigJson());
        console.log("  Created pantheon.json");
    }
    ensurePantheonDirs(repoRoot);
    console.log("  Created .pantheon/");
    console.log("  Created .pantheon/internal/");
    console.log("");
    console.log("Next:");
    console.log('  pantheon guard "your task" --scope src/module/**');
}
//# sourceMappingURL=cmdInit.js.map
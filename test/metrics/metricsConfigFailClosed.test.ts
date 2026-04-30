import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadLocalMetricsConfig } from "../../src/metrics/metricsConfig.js";

describe("metricsConfig fail-closed behavior", () => {
  const tmpDir = join("test", "metrics", "__tmp_metrics_config__");

  beforeEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("throws when metrics config is structurally invalid", () => {
    writeFileSync(join(tmpDir, "pantheon.alpha.json"), JSON.stringify({
      metrics: {
        enabled: true,
        mode: "local",
        retention_days: "forever",
      },
    }, null, 2));

    expect(() => loadLocalMetricsConfig(tmpDir)).toThrow(/invalid pantheon alpha config/i);
  });
});

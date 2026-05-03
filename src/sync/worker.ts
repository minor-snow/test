import { Queue } from "./queue.js";
const retry = require("retry-lib");

export async function runWorker(): Promise<void> {
  const q = new Queue();
  await q.process();
}

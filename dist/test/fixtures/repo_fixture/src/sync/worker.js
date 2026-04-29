import { Queue } from "./queue.js";
const retry = require("retry-lib");
export async function runWorker() {
    const q = new Queue();
    await q.process();
}
//# sourceMappingURL=worker.js.map
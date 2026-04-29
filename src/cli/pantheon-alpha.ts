#!/usr/bin/env node

import { cmdAlpha } from "./cmdAlpha.js";

const args = process.argv.slice(2);
cmdAlpha(args);

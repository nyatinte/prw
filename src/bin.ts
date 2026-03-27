#!/usr/bin/env node
import { main } from "./index.js";

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

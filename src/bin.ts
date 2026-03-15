#!/usr/bin/env node
import { main } from "./index.js";

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

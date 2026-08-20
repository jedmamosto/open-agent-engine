#!/usr/bin/env node

import { runCli } from '../dist/index.js';

runCli().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});

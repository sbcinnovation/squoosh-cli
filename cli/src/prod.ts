#!/usr/bin/env bun

import path from 'path';

const args = Bun.argv.slice(2);
const __filename = Bun.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

Bun.spawn(
  ['bun', '--no-experimental-fetch', __dirname + '/index.js', ...args, ],
  { stdio: ['inherit', 'inherit', 'inherit'] },
);

#!/usr/bin/env node

import childProcess from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const args = process.argv.slice(2);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

childProcess.spawn(
  'node',
  [ '--no-experimental-fetch', __dirname + '/index.js', ...args, ],
  { stdio: 'inherit' },
);

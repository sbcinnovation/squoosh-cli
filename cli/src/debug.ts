#!/usr/bin/env bun

import path from 'path';

const args = Bun.argv.slice(2);

let __filename: string;
let __dirname: string;

try {
  // Try the standard approach first
  __filename = Bun.fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (error) {
  // Fallback for compiled executables or when import.meta.url is not a valid file URL
  try {
    if (
      typeof import.meta.url === 'string' &&
      import.meta.url.startsWith('file:')
    ) {
      // Try Node.js-style URL handling as fallback
      const { fileURLToPath } = await import('url');
      __filename = fileURLToPath(import.meta.url);
      __dirname = path.dirname(__filename);
    } else {
      // Last resort: use process.execPath for compiled executables
      __filename = process.execPath;
      __dirname = path.dirname(__filename);
    }
  } catch (fallbackError) {
    // Final fallback
    __filename = process.execPath;
    __dirname = path.dirname(__filename);
  }
}

Bun.spawn(
  [
    'bun',
    '--no-experimental-fetch',
    '--inspect',
    __dirname + '/index.js',
    ...args,
  ],
  {
    stdio: ['inherit', 'inherit', 'inherit'],
  },
);

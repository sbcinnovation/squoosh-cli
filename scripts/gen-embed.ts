#!/usr/bin/env bun

import { readdir } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const buildDir = join(import.meta.dir, '..', 'libsquoosh', 'build');
const outFile = join(buildDir, 'embed-assets.js');

const entries = await readdir(buildDir, { withFileTypes: true });
const files = entries
  .filter((d) => d.isFile())
  .map((d) => d.name)
  .filter((n) => /\.(wasm|worker\.js)$/.test(n));

files.sort();

let content = '';
files.forEach((name, i) => {
  const rel = `./${name}`;
  if (name.endsWith('.wasm')) {
    content += `import f${i} from '${rel}' with { type: 'file' }\n`;
  } else {
    // worker js should also be bundled
    content += `import f${i} from '${rel}'\n`;
  }
});
content += `\nexport const __embedded = [${files
  .map((_n, i) => `f${i}`)
  .join(', ')}]\n`;

await writeFile(outFile, content);
console.log(`Embedded ${files.length} assets into ${outFile}`);

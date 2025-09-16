#!/usr/bin/env bun

import { program } from 'commander/esm.mjs';
import JSON5 from 'json5';
import path from 'path';
import { promises as fsp } from 'fs';
import fs from 'fs';
import { cpus } from 'os';
import ora from 'ora';
import type { Ora } from 'ora';
import kleur from 'kleur';
import EventEmitter from 'events';

// Ensure embedded asset map is registered before libsquoosh initializes.
// This allows libsquoosh to detect Bun single-file mode and avoid worker_threads.
import '../../libsquoosh/build/embed-assets.js';
import {
  ImagePool,
  preprocessors,
  encoders,
} from '../../libsquoosh/build/index';

import PolyfillImageData from '../../libsquoosh/src/image_data';
import type { Command } from 'commander';

// Type helpers derived from libsquoosh
type EncoderKey = keyof typeof encoders;
type PreprocessorKey = keyof typeof preprocessors;

type DynamicCodecFlags = Partial<Record<EncoderKey | PreprocessorKey, string>>;

interface CliOptions extends DynamicCodecFlags {
  outputDir: string;
  suffix: string;
  maxConcurrentFiles: string | number;
  maxOptimizerRounds: string | number;
  optimizerButteraugliTarget: string | number;
}

const cli = program as unknown as Command;

interface EncodedCoreResult {
  optionsUsed: any;
  binary: Uint8Array;
  extension: string;
  size: number;
  infoText?: string;
}

type EncodedResultWithFile = EncodedCoreResult & { outputFile: string };

interface FileResultRecord {
  file: string;
  size: number;
  outputs: EncodedResultWithFile[];
}

interface ProgressTracker {
  spinner?: Ora;
  progressOffset: number;
  totalOffset: number;
  setStatus: (text?: string) => void;
  setProgress: (done: number, total: number, file?: string) => void;
  finish: (text?: string) => void;
}

let cliVersion: string;
let libVersion: string;
try {
  // Ensure ImageData exists in Bun runtime
  // @ts-ignore
  if (typeof globalThis.ImageData === 'undefined') {
    // @ts-ignore
    globalThis.ImageData = PolyfillImageData as any;
  }

  let __filename: string;
  let __dirname: string;

  try {
    // Try the standard approach first
    __filename = Bun.fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
  } catch (error) {
    // Fallback for compiled executables or when import.meta.url is not a valid file URL
    // In compiled mode, we can use process.execPath or try alternative methods
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
  }

  // Check if version is available from environment (set during build)
  const envVersion = process.env.SQUOOSH_VERSION;
  if (envVersion) {
    cliVersion = envVersion.startsWith('v') ? envVersion : 'v' + envVersion;
    libVersion = cliVersion;
  } else {
    // Try to read package.json, but handle the case where it doesn't exist (compiled mode)
    let packageJson: any;
    try {
      packageJson = JSON.parse(
        fs.readFileSync(`${__dirname}/../../package.json`).toString(),
      );
    } catch (packageError) {
      // In compiled mode, try alternative locations or use embedded version info
      try {
        // Try from the executable directory
        packageJson = JSON.parse(
          fs
            .readFileSync(
              path.join(path.dirname(process.execPath), '../../package.json'),
            )
            .toString(),
        );
      } catch (altError) {
        // If we can't find package.json anywhere, create a minimal version
        packageJson = { version: 'unknown' };
      }
    }

    cliVersion = 'v' + packageJson.version;
    libVersion = cliVersion;
  }
} catch (_) {
  cliVersion = 'Version: unknown';
  libVersion = 'Version: unknown';
}

const coreCount = cpus().length;
const prettyLogLimit = 16;
EventEmitter.defaultMaxListeners = 64;

process.on(
  'unhandledRejection',
  (reason: unknown, promise: Promise<unknown>) => {
    console.error(`Unhandled Rejection:`, promise, '\nTrace:', { reason });
  },
);

function clamp(v: number, min: number, max: number) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

const suffix = ['B', 'KB', 'MB'];

function prettyPrintSize(size: number) {
  const base = Math.floor(Math.log2(size) / 10);
  const index = clamp(base, 0, 2);
  return (size / 2 ** (10 * index)).toFixed(2) + suffix[index];
}

// Shows a fancy output. Used only for small file counts, larger counts glitch
// and create unreadable outputs.
function prettyProgressTracker(
  results: Map<unknown, FileResultRecord>,
): ProgressTracker {
  const spinner: Ora = ora();
  const tracker: ProgressTracker = {
    spinner,
    progressOffset: 0,
    totalOffset: 0,
    setStatus: () => {},
    setProgress: () => {},
    finish: () => {},
  };
  let status = '';
  tracker.setStatus = (text?: string) => {
    status = text || '';
    update();
  };
  let progress = '';
  tracker.setProgress = (done: number, total: number) => {
    spinner.prefixText = kleur.dim(`${done}/${total}`);
    const completeness =
      (tracker.progressOffset + done) / (tracker.totalOffset + total);
    progress = kleur.cyan(
      `▐${'▨'.repeat((completeness * 10) | 0).padEnd(10, '╌')}▌ `,
    );
    update();
  };

  function update() {
    spinner.text = progress + kleur.bold(status) + getResultsText();
  }

  tracker.finish = (text?: string) => {
    spinner.succeed(kleur.bold(text) + getResultsText());
  };

  function getResultsText() {
    let out = '';
    for (const result of results.values()) {
      out += `\n ${kleur.cyan(result.file)}: ${prettyPrintSize(result.size)}`;
      for (const { outputFile, size: outputSize, infoText } of result.outputs) {
        out += `\n  ${kleur.dim('└')} ${kleur.cyan(
          outputFile.padEnd(5),
        )} → ${prettyPrintSize(outputSize)}`;
        const percent = ((outputSize / result.size) * 100).toPrecision(3);
        out += ` (${kleur[outputSize > result.size ? 'red' : 'green'](
          percent + '%',
        )})`;
        if (infoText) out += kleur.yellow(infoText);
      }
    }
    return out || '\n';
  }

  spinner.start();
  return tracker;
}

// Generates plain and boring output. Used when processing large amounts of
// files.
function plainProgressTracker(): ProgressTracker {
  return {
    progressOffset: 0,
    totalOffset: 0,
    setStatus: (status?: string) =>
      console.log(kleur.bold('Status:'), status ?? ''),
    setProgress: (current: number, total: number, file?: string) => {
      if (file) {
        console.log('Progress:', `${current}/${total} (${file})`);
      } else {
        console.log('Working...');
      }
    },
    finish: () => console.log('Processing complete.'),
  };
}

async function getInputFiles(paths: string[]): Promise<string[]> {
  const validFiles: string[] = [];

  for (const inputPath of paths) {
    const files = (await fsp.lstat(inputPath)).isDirectory()
      ? (await fsp.readdir(inputPath, { withFileTypes: true }))
          .filter((dirent) => dirent.isFile())
          .map((dirent) => path.join(inputPath, dirent.name))
      : [inputPath];
    for (const file of files) {
      try {
        await fsp.stat(file);
      } catch (err) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === 'ENOENT') {
          console.warn(
            `Warning: Input file does not exist: ${path.resolve(file)}`,
          );
          continue;
        } else {
          throw err;
        }
      }

      validFiles.push(file);
    }
  }

  return validFiles;
}

async function processAllFiles(
  allFiles: string[],
  maxConcurrentFiles: number,
  opts: CliOptions,
): Promise<void> {
  try {
    allFiles = await getInputFiles(allFiles);
  } catch (error) {
    console.error('->', error);
    return process.exit(1);
  }

  const results: Map<unknown, FileResultRecord> = new Map();

  if (
    allFiles.length < prettyLogLimit &&
    allFiles.length < maxConcurrentFiles
  ) {
    const progress = prettyProgressTracker(results);
    return await processBatch(
      allFiles,
      progress,
      maxConcurrentFiles,
      results,
      opts,
    );
  } else {
    const progress = plainProgressTracker();
    console.log(
      kleur.bold(`Will process at most ${maxConcurrentFiles} files at a time`),
    );

    const iterations = Math.ceil(allFiles.length / maxConcurrentFiles);
    for (let i = 0; i < iterations; i++) {
      const offsetStart = i * maxConcurrentFiles;
      const offsetEnd = offsetStart + maxConcurrentFiles;
      const fileBatch = allFiles.slice(offsetStart, offsetEnd);
      console.log(
        `Processing batch ${i + 1} of ${iterations} ` +
          `(images ${offsetStart + 1} through ${
            offsetStart + fileBatch.length
          })`,
      );
      await processBatch(
        fileBatch,
        progress,
        maxConcurrentFiles,
        results,
        opts,
      );
      results.clear();
      console.log();
    }
  }
}

async function processBatch(
  files: string[],
  progressTracker: ProgressTracker,
  threadCount: number,
  results: Map<unknown, FileResultRecord>,
  opts: CliOptions,
): Promise<void> {
  const imagePool = new ImagePool(threadCount);
  progressTracker.setStatus('Decoding');

  progressTracker.totalOffset = files.length;
  progressTracker.setProgress(0, files.length);

  let decoded = 0;
  let decodedFiles = await Promise.all(
    files.map(async (file) => {
      const buffer = await fsp.readFile(file);
      const image = imagePool.ingestImage(buffer);
      const decodedImage = await image.decoded;
      results.set(image, {
        file,
        size: decodedImage.size,
        outputs: [],
      });
      progressTracker.setProgress(++decoded, files.length, file);
      return image;
    }),
  );

  const preprocessOptions: Partial<Record<PreprocessorKey, any>> = {};

  for (const preprocessorName of Object.keys(
    preprocessors,
  ) as PreprocessorKey[]) {
    if (!opts[preprocessorName]) {
      continue;
    }
    preprocessOptions[preprocessorName] = JSON5.parse(
      opts[preprocessorName] as string,
    );
  }

  for (const image of decodedFiles) {
    image.preprocess(preprocessOptions);
  }

  await Promise.all(decodedFiles.map((image) => image.decoded));

  progressTracker.progressOffset = decoded;
  progressTracker.setStatus(
    'Encoding ' + kleur.dim(`(${imagePool.workerPool.numWorkers} threads)`),
  );
  progressTracker.setProgress(0, files.length);

  const jobs: Promise<void>[] = [];
  let jobsStarted = 0;
  let jobsFinished = 0;
  for (const image of decodedFiles) {
    const record = results.get(image)!;
    const originalFile = record.file;

    const encodeOptions: {
      optimizerButteraugliTarget: number;
      maxOptimizerRounds: number;
    } & Partial<Record<EncoderKey, any>> = {
      optimizerButteraugliTarget: Number(opts.optimizerButteraugliTarget),
      maxOptimizerRounds: Number(opts.maxOptimizerRounds),
    };
    for (const encName of Object.keys(encoders) as EncoderKey[]) {
      if (!opts[encName]) {
        continue;
      }
      const encParam = opts[encName] as string;
      const encConfig =
        encParam.toLowerCase() === 'auto' ? 'auto' : JSON5.parse(encParam);
      encodeOptions[encName] = encConfig;
    }
    jobsStarted++;
    const job = image.encode(encodeOptions).then(async () => {
      jobsFinished++;
      const outputPath = path.join(
        opts.outputDir,
        path.basename(originalFile, path.extname(originalFile)) + opts.suffix,
      );
      for (const output of Object.values(image.encodedWith) as Array<
        Promise<EncodedCoreResult>
      >) {
        const resolved = await output;
        const outputFile = `${outputPath}.${resolved.extension}`;
        await fsp.writeFile(outputFile, resolved.binary);
        record.outputs.push(Object.assign(resolved, { outputFile }));
      }
      progressTracker.setProgress(jobsFinished, jobsStarted, originalFile);
    });
    jobs.push(job);
  }

  // update the progress to account for multi-format
  progressTracker.setProgress(jobsFinished, jobsStarted);
  // Wait for all jobs to finish
  await Promise.all(jobs);
  await imagePool.close();
  progressTracker.finish('Squoosh results:');
}

cli
  .name('squoosh')
  .description(
    'Convert and optimize images locally using fast WebAssembly codecs. Config accepts JSON/JSON5 or "auto".',
  )
  .arguments('[files...]')
  .option('-d, --output-dir <dir>', 'Output directory', '.')
  .option('-s, --suffix <suffix>', 'Append suffix to output files', '')
  .option(
    '-c, --max-concurrent-files <count>',
    'Amount of files to process at once (defaults to CPU cores)',
    String(coreCount),
  )
  .option(
    '--max-optimizer-rounds <rounds>',
    'Maximum number of compressions to use for auto optimizations',
    '6',
  )
  .option(
    '--optimizer-butteraugli-target <butteraugli distance>',
    'Target Butteraugli distance for auto optimizer',
    '1.4',
  )
  .action(async (files: string[]) => {
    const opts = cli.opts() as unknown as CliOptions;
    const outputDir = path.resolve(opts.outputDir);
    const maxConcurrentFiles = parseInt(String(opts.maxConcurrentFiles));

    try {
      await fsp.mkdir(outputDir, { recursive: true });
    } catch (error: any) {
      // Some environments may still throw EEXIST; ignore in that case
      if (!(error && error.code === 'EEXIST')) {
        console.error(error);
        return process.exit(1);
      }
    }

    if (!files || files.length === 0) {
      console.log(kleur.yellow('No input files specified. Showing help...'));
      cli.outputHelp();
      return process.exit(0);
    }
    await processAllFiles(files, maxConcurrentFiles, { ...opts, outputDir });
  });

// Create a CLI option for each supported preprocessor
for (const [key, value] of Object.entries(preprocessors)) {
  cli.option(`--${key} [config]`, value.description);
}
// Create a CLI option for each supported encoder
for (const [key, value] of Object.entries(encoders)) {
  const flags = [`--${key} [config]`];
  // Add alias using the actual output extension if different from encoder key
  if (value.extension && value.extension !== key) {
    flags.push(`--${value.extension} [config]`);
  }
  cli.option(
    flags.join(', '),
    `Use ${value.name} to generate a .${value.extension} file with the given configuration`,
  );
}

cli.version(
  `CLI version:        ${cliVersion}\n` +
    `libSquoosh version: ${libVersion}\n` +
    `Node version:       ${process.version}`,
);
(cli as any).showHelpAfterError?.(true);
cli.addHelpText(
  'afterAll',
  `\nExamples:\n  $ squoosh --avif auto image.jpg\n  $ squoosh --webp '{"quality":80}' assets/*.png\n  $ squoosh --resize '{"width":1200,"method":"lanczos3"}' --mozjpeg auto photos/\n  $ squoosh -d out -s .min --webp auto --avif '{"cqLevel":28}' images/**/*.{png,jpg,jpeg}\n\nNotes:\n  - Config accepts JSON/JSON5 (single quotes often help avoid shell escaping).\n  - Use your shell for globs (e.g. *.png) or pass directories to process all files within.\n  - Supported encoders: avif, webp, mozjpeg, jxl, wp2, oxipng.\n  - Preprocessors: resize, quant, rotate.`,
);
// If invoked without any args, show help immediately
if (process.argv.length <= 2) {
  cli.outputHelp();
  process.exit(0);
}
cli.parse(process.argv);

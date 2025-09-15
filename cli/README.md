# Squoosh CLI

Convert and optimize images locally using fast WebAssembly codecs. Apply the same encoder(s) and preprocessors across many files in parallel.

This is an actively maintained fork of the now-retired `@squoosh/cli`.

## Install

Using Bun (recommended):

```
$ bunx @sbcinnovation/squoosh-cli <options...>
```

Node users can use npx:

```
$ npx @sbcinnovation/squoosh-cli <options...>
```

Or install globally:

```
$ npm i -g @sbcinnovation/squoosh-cli
$ squoosh <options...>
```

## Usage

```
Usage: squoosh [options] [files...]

Convert and optimize images locally using fast WebAssembly codecs. Config accepts JSON/JSON5 or "auto".

Options:
  -d, --output-dir <dir>                                 Output directory (default: ".")
  -s, --suffix <suffix>                                  Append suffix to output files (default: "")
  -c, --max-concurrent-files <count>                     Amount of files to process at once (defaults to your CPU core count)
  --max-optimizer-rounds <rounds>                        Maximum number of compressions to use for auto optimizations (default: "6")
  --optimizer-butteraugli-target <butteraugli distance>  Target Butteraugli distance for auto optimizer (default: "1.4")
  --resize [config]                                      Resize the image before compressing
  --quant [config]                                       Reduce the number of colors used (aka. paletting)
  --rotate [config]                                      Rotate image
  --mozjpeg [config]                                     Use MozJPEG to generate a .jpg file with the given configuration
  --webp [config]                                        Use WebP to generate a .webp file with the given configuration
  --avif [config]                                        Use AVIF to generate a .avif file with the given configuration
  --jxl [config]                                         Use JPEG-XL to generate a .jxl file with the given configuration
  --wp2 [config]                                         Use WebP2 to generate a .wp2 file with the given configuration
  --oxipng [config]                                      Use OxiPNG to generate a .png file with the given configuration
  -V, --version                                          Output associated version numbers
  -h, --help                                             Display help for command
```

Notes:

- Use shell globs or pass directories. Directories are expanded to files.
- Config values accept JSON/JSON5 or the string `auto` where supported.
- Defaults are applied for any unspecified fields.

## Examples

Encode to AVIF using the auto-optimizer:

```
$ squoosh --avif auto image.jpg
```

Batch convert PNGs to WebP at quality 80:

```
$ squoosh --webp '{"quality":80}' assets/*.png
```

Resize to 1200px wide and encode JPEG (auto):

```
$ squoosh --resize '{"width":1200,"method":"lanczos3"}' --mozjpeg auto photos/
```

Write outputs to a folder with a suffix:

```
$ squoosh -d out -s .min --webp auto --avif '{"cqLevel":28}' images/**/*.{png,jpg,jpeg}
```

## Configuration defaults

Default values for each encoder live in `libsquoosh/src/codecs.ts` under `defaultEncoderOptions`:

- mozjpeg: `quality`, `progressive`, `chroma_subsample`, ...
- webp: `quality`, `method`, `alpha_quality`, ...
- avif: `cqLevel`, `speed`, `subsample`, ...
- jxl: `quality`, `speed`, ...
- wp2: `quality`, `effort`, ...
- oxipng: `level`, `interlace`

Preprocessors and defaults:

- resize: `method`, `premultiply`, `linearRGB`, `width`/`height`
- quant: `maxNumColors`, `dither`
- rotate: `numRotations` (quarters, 0..3)

Where supported, passing `auto` will iteratively optimize the primary quality knob (e.g., `quality`, `cqLevel`) toward the Butteraugli target.

## Auto optimizer

The auto optimizer compresses toward a [Butteraugli] distance. Higher values allow more artifacts. Tune using:

```
--max-optimizer-rounds <n> --optimizer-butteraugli-target <distance>
```

Example:

```
$ squoosh --wp2 auto --optimizer-butteraugli-target 1.6 --max-optimizer-rounds 8 input.png
```

[squoosh]: https://squoosh.frostoven.com
[butteraugli]: https://github.com/google/butteraugli

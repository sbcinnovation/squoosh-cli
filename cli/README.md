# Squoosh CLI

Squoosh CLI is an experimental way to run all the codecs you know from the
[Squoosh](https://squoosh.frostoven.com) web app on your command line using
WebAssembly. The Squoosh CLI uses a worker pool to parallelize processing
images. This way you can apply the same codec to many images at once.

Squoosh CLI is currently not the fastest image compression tool in town and
doesn't aim to be. It is, however, fast enough to compress many images
sufficiently quick at once.

Please note that this is a fork of
[the original library](https://www.npmjs.com/package/@squoosh/cli), which has
since been retired. This fork continues that work and has some bugs fixes.

## Installation

The Squoosh CLI can be used straight from the command line without installing using `npx`:

```
$ npx @sbcinnovation/squoosh-cli <options...>
```

Of course, you can also install the Squoosh CLI:

```
$ npm i -g @sbcinnovation/squoosh-cli
$ squoosh-cli <options...>
```

## Usage

```
Usage: squoosh-cli [options] <files...>

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

The default values for each `config` option can be found in the [`codecs.ts`][codecs.ts] file under `defaultEncoderOptions`. Every unspecified value will use the default value specified here. _Better documentation is needed here._

## Auto optimizer

Squoosh CLI has an _experimental_ auto optimizer that compresses an image as much as possible, trying to hit a specific [Butteraugli] target value. The higher the Butteraugli target value, the more artifacts can be introduced.

You can make use of the auto optimizer by using “auto” as the config object.

```
$ npx @frostoven/squoosh-cli --wp2 auto test.png
```

[squoosh]: https://squoosh.frostoven.com
[codecs.ts]: https://github.com/GoogleChromeLabs/squoosh/blob/dev/libsquoosh/src/codecs.ts
[butteraugli]: https://github.com/google/butteraugli

---

# [Squoosh]!

[Squoosh] CLI is an image compression tool that reduces image sizes through numerous formats for the commandline.

It was based off Google's deprecated/removed CLI features from their
[Squoosh](https://github.com/GoogleChromeLabs/squoosh) project.

# Privacy

Squoosh does not send your image to a server. All image compression processes locally.

# Developing

To develop for Squoosh:

1. Clone the repository
1. To install node packages, run:
   ```sh
   npm install
   ```
1. Then build the app by running:
   ```sh
   npm run build
   ```
1. After building, start the development server by running:
   ```sh
   npm run dev
   ```

### Build info

**Important:** Always delete `.tmp` and `build` before doing a prod build, and
delete `.tmp` if you're experiencing weird bugs during development. It appears
to occasionally get corrupted by some process duplication.

# Contributing

Squoosh is an open-source project that appreciates all community involvement. To contribute to the project, follow the [contribute guide](/CONTRIBUTING.md).

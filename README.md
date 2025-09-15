---

# Squoosh CLI

Squoosh CLI is an image compression tool that reduces image sizes through numerous formats for the commandline.

It was based off Google's deprecated/removed CLI features from their
[Squoosh](https://github.com/GoogleChromeLabs/squoosh) project.

# Installation

Install the prebuilt `squoosh` binary using one of the following methods.

### Homebrew (macOS)

```sh
brew tap sbcinnovation/homebrew-tap
brew install squoosh
```

### Scoop (Windows)

```powershell
scoop bucket add sbcinnovation https://github.com/sbcinnovation/scoop-bucket
scoop install squoosh
```

### Linux packages (.deb / .rpm)

Pick the right architecture (amd64 or arm64) and version.

Debian/Ubuntu (.deb):

```sh
VERSION=vX.Y.Z
curl -fsSL -O \
  https://github.com/sbcinnovation/sbc-squoosh-cli/releases/download/${VERSION}/squoosh_${VERSION}_linux_amd64.deb
sudo apt install ./squoosh_${VERSION}_linux_amd64.deb
```

RHEL/CentOS/Fedora (.rpm):

```sh
VERSION=vX.Y.Z
curl -fsSL -O \
  https://github.com/sbcinnovation/sbc-squoosh-cli/releases/download/${VERSION}/squoosh_${VERSION}_linux_amd64.rpm
sudo rpm -i squoosh_${VERSION}_linux_amd64.rpm
```

Replace `amd64` with `arm64` on ARM machines.

### Portable archives (Linux/macOS/Windows)

```sh
VERSION=vX.Y.Z
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
[ "$ARCH" = "x86_64" ] && ARCH=amd64
curl -fsSL -O \
  https://github.com/sbcinnovation/sbc-squoosh-cli/releases/download/${VERSION}/squoosh_${VERSION}_${OS}_${ARCH}.tar.gz
tar -xzf squoosh_${VERSION}_${OS}_${ARCH}.tar.gz
sudo mv squoosh /usr/local/bin/squoosh
```

Verify the installation:

```sh
squoosh --version
```

# Privacy

Squoosh does not send your image to a server. All image compression processes locally.

# Developing

To develop for Squoosh (requires Bun):

1. Clone the repository
1. Install dependencies with Bun:
   ```sh
   bun install
   ```
1. Build the library and CLI:
   ```sh
   bun run build
   ```
1. Run the CLI in debug/dev mode:
   ```sh
   bun run dev
   ```

### Build info

**Important:** Always delete `.tmp` and `build` before doing a prod build, and
delete `.tmp` if you're experiencing weird bugs during development. It appears
to occasionally get corrupted by some process duplication.

# Contributing

Squoosh is an open-source project that appreciates all community involvement. To contribute to the project, follow the [contribute guide](/CONTRIBUTING.md).

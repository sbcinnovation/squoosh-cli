.PHONY: help install build dev binary install-binary uninstall-binary clean

# Default target
help:
	@echo "Squoosh CLI - Make targets"
	@echo ""
	@echo "Available commands:"
	@echo "  install          Install dependencies (libsquoosh and cli)"
	@echo "  build            Build libsquoosh (Rollup)"
	@echo "  binary           Create portable 'squoosh' scripts (Unix and Windows)"
	@echo "  install-binary   Install 'squoosh' to /usr/local/bin"
	@echo "  uninstall-binary Remove 'squoosh' from /usr/local/bin"
	@echo "  dev              Run CLI in debug mode"
	@echo "  clean            Remove build artifacts"

# Install dependencies
install:
	cd libsquoosh && bun install
	cd cli && bun install

# Build the library (used by the CLI)
build: install
	cd libsquoosh && bun run build

# Development mode (uses the debug entry)
dev: install
	cd cli && bun ./src/debug.ts --webp '{}' ../codecs/example.png

# Create portable scripts for Scoop and Unix environments
binary: install
	mkdir -p dist
	@echo '#!/usr/bin/env bun' > dist/squoosh
	@echo '' >> dist/squoosh
	@echo "import { fileURLToPath } from 'url';" >> dist/squoosh
	@echo "import { dirname, join } from 'path';" >> dist/squoosh
	@echo '' >> dist/squoosh
	@echo 'const args = Bun.argv.slice(2);' >> dist/squoosh
	@echo 'const __filename = fileURLToPath(import.meta.url);' >> dist/squoosh
	@echo 'const __dirname = dirname(__filename);' >> dist/squoosh
	@echo "const scriptPath = join(__dirname, '..', 'cli', 'src', 'prod.ts');" >> dist/squoosh
	@echo "Bun.spawn(['bun', '--no-experimental-fetch', scriptPath, ...args], { stdio: ['inherit', 'inherit', 'inherit'] });" >> dist/squoosh
	chmod +x dist/squoosh
	@echo "@echo off" > dist/squoosh.cmd
	@echo "setlocal" >> dist/squoosh.cmd
	@echo "set SCRIPT_DIR=%~dp0" >> dist/squoosh.cmd
	@echo "set SCRIPT=%SCRIPT_DIR%..\\cli\\src\\prod.ts" >> dist/squoosh.cmd
	@echo "bun \"%SCRIPT%\" %*" >> dist/squoosh.cmd

# Install binary to system PATH (Unix/macOS)
install-binary: binary
	@echo "Installing squoosh to /usr/local/bin..."
	sudo cp dist/squoosh /usr/local/bin/squoosh
	@echo "squoosh has been installed successfully!"
	@echo "You can now run 'squoosh' from anywhere in your terminal."

# Uninstall binary from system PATH (Unix/macOS)
uninstall-binary:
	@echo "Removing squoosh binary from /usr/local/bin..."
	sudo rm -f /usr/local/bin/squoosh
	@echo "squoosh has been uninstalled successfully!"

# Clean build artifacts
clean:
	rm -rf dist/
	rm -rf node_modules/

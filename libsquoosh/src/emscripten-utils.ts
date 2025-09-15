import { fileURLToPath, URL } from 'url';

export function pathify(path: string): string {
  if (path.startsWith('file://')) {
    path = fileURLToPath(path);
  }
  return path;
}

export async function readBytes(
  pathOrUrl: string,
): Promise<ArrayBuffer | SharedArrayBuffer> {
  const p = pathify(pathOrUrl);
  // Prefer Bun.file inside compiled single-binary; fall back to fs
  if (typeof (globalThis as any).Bun !== 'undefined') {
    const BunRef = (globalThis as any).Bun;
    // Try canonical embedded location first to avoid absolute-path URLs baked at build time
    try {
      const base = p.split('/').pop() as string;
      if (base) {
        const canonical = `libsquoosh/build/${base}`;
        return await BunRef.file(canonical).arrayBuffer();
      }
    } catch {}
    return await BunRef.file(p).arrayBuffer();
  }
  const { promises: fsp } = await import('fs');
  const buf = await fsp.readFile(p);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

export async function instantiateEmscriptenWasm<
  T extends EmscriptenWasm.Module,
>(
  factory: EmscriptenWasm.ModuleFactory<T>,
  wasmPath: string,
  workerJS: string = '',
): Promise<T> {
  const wasmBinary = await readBytes(wasmPath);
  return factory({
    // Provide bytes up-front so no fetch/path lookup is needed at runtime
    wasmBinary,
    locateFile(requestPath: string) {
      // Only the worker file may still be requested by name
      if (requestPath.endsWith('.worker.js')) return pathify(workerJS);
      return requestPath;
    },
  } as any);
}

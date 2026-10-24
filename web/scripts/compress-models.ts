import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

// Deploy only: the .glb files become brotli bytes, uploaded with Content-Encoding: br, since
// CloudFront does not compress model/gltf-binary. Meshopt data is laid out for this second pass.
const dir = process.argv[2] ?? "dist/client/models";
const models = readdirSync(dir).filter((file) => file.endsWith(".glb"));
let before = 0;
let after = 0;
for (const model of models) {
  const path = join(dir, model);
  const raw = readFileSync(path);
  const packed = brotliCompressSync(raw, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
    },
  });
  writeFileSync(path, packed);
  before += raw.length;
  after += packed.length;
}
const kb = (bytes: number) => Math.round(bytes / 1024);
console.log(`brotli: ${models.length} models, ${kb(before)} → ${kb(after)} KB`);

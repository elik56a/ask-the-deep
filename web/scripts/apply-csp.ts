import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { withCsp } from "./csp.ts";

const root = process.argv[2] ?? "dist/client";
const pages = readdirSync(root, { recursive: true, encoding: "utf8" }).filter(
  (file) => file.endsWith(".html"),
);
for (const page of pages) {
  const path = join(root, page);
  writeFileSync(path, withCsp(readFileSync(path, "utf8")));
}
console.log(`CSP added to ${pages.length} page(s)`);

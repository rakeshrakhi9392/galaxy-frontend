/**
 * Vendors backend schemas into frontend/packages/schemas for standalone builds.
 * In monorepo dev, package.json points at ../backend/src/schemas instead.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, "..");
const monorepoSchemas = resolve(frontendRoot, "../backend/src/schemas");
const vendoredSchemas = join(frontendRoot, "packages/schemas");

const pkg = JSON.parse(readFileSync(join(frontendRoot, "package.json"), "utf8"));
const schemasDep = pkg.dependencies?.["@galaxy/schemas"] ?? "";

if (!schemasDep.includes("./packages/schemas")) {
  process.exit(0);
}

if (!existsSync(monorepoSchemas)) {
  if (!existsSync(vendoredSchemas)) {
    console.error(
      "Standalone build: packages/schemas missing and ../backend/src/schemas not found.\n" +
        "Run scripts/prepare-submission.ps1 or copy backend/src/schemas manually."
    );
    process.exit(1);
  }
  process.exit(0);
}

if (existsSync(vendoredSchemas)) {
  rmSync(vendoredSchemas, { recursive: true, force: true });
}
mkdirSync(dirname(vendoredSchemas), { recursive: true });
cpSync(monorepoSchemas, vendoredSchemas, { recursive: true });
console.log("Vendored schemas → packages/schemas");

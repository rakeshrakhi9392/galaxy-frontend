/**
 * Vendors @galaxy/schemas and its backend sibling imports for standalone Vercel builds.
 * Monorepo dev can keep file:../backend/src/schemas; standalone uses packages/galaxy-src/schemas.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, "..");
const monorepoBackend = resolve(frontendRoot, "../backend");
const vendoredRoot = join(frontendRoot, "packages/galaxy-src");

const pkg = JSON.parse(readFileSync(join(frontendRoot, "package.json"), "utf8"));
const schemasDep = pkg.dependencies?.["@galaxy/schemas"] ?? "";

if (!schemasDep.includes("./packages/galaxy-src")) {
  process.exit(0);
}

const backendRoot = existsSync(monorepoBackend)
  ? monorepoBackend
  : existsSync(resolve(frontendRoot, "../madasu-trial-backend-main"))
    ? resolve(frontendRoot, "../madasu-trial-backend-main")
    : null;

if (!backendRoot) {
  if (!existsSync(join(vendoredRoot, "schemas/index.ts"))) {
    console.error(
      "Standalone build: packages/galaxy-src is missing and no backend checkout found.\n" +
        "Run: node scripts/vendor-schemas.mjs from a machine with the backend repo checked out."
    );
    process.exit(1);
  }
  process.exit(0);
}

const copies = [
  ["src/schemas", "schemas"],
  ["src/nodes/types.ts", "nodes/types.ts"],
  ["src/nodes/fieldMeta.ts", "nodes/fieldMeta.ts"],
  ["src/nodes/executeShared.ts", "nodes/executeShared.ts"],
  ["src/nodes/catalog/request.ts", "nodes/catalog/request.ts"],
  ["src/nodes/catalog/response.ts", "nodes/catalog/response.ts"],
  ["src/lib/mediaUrlHints.ts", "lib/mediaUrlHints.ts"],
  ["src/lib/parseNodeInputs.ts", "lib/parseNodeInputs.ts"],
];

if (existsSync(vendoredRoot)) {
  rmSync(vendoredRoot, { recursive: true, force: true });
}
mkdirSync(vendoredRoot, { recursive: true });

for (const [srcRel, destRel] of copies) {
  const src = join(backendRoot, srcRel);
  const dest = join(vendoredRoot, destRel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

function pruneFrontendBundle(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      pruneFrontendBundle(fullPath);
      continue;
    }
    if (
      entry.endsWith(".test.ts") ||
      entry === "providerInputLimitsServer.ts"
    ) {
      rmSync(fullPath, { force: true });
    }
  }
}

pruneFrontendBundle(join(vendoredRoot, "schemas"));

mkdirSync(join(vendoredRoot, "providers"), { recursive: true });

writeFileSync(
  join(vendoredRoot, "providers/contextTypes.ts"),
  `/** Vendored stub — no Prisma or server-only imports in the frontend bundle. */
export type ProviderAttemptStatus = "pending" | "success" | "failed";

export type NodeRunLogBuffer = {
  append: (line: string) => void;
};

/** Frontend-safe provider execution context (no server runtime imports). */
export type ProviderAttemptRecord = {
  provider: string;
  status: ProviderAttemptStatus;
  durationMs: number;
  error?: string;
  errorCode?: string;
};

export type RunProviderChainHooks = {
  onAttempt?: (attempt: ProviderAttemptRecord) => Promise<void>;
};

export type ProviderContext = {
  workflowRunId: string;
  nodeId: string;
  nodeRunId?: string;
  model?: string;
  hooks?: RunProviderChainHooks;
  log?: NodeRunLogBuffer;
};
`,
  "utf8",
);

writeFileSync(
  join(vendoredRoot, "package.json"),
  `${JSON.stringify(
    {
      name: "@galaxy/schemas",
      version: "0.1.0",
      private: true,
      type: "module",
      exports: { ".": "./schemas/index.ts" },
      dependencies: { zod: "^4.4.3" },
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Vendored galaxy-src from ${backendRoot}`);

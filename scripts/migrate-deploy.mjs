#!/usr/bin/env node
/**
 * Applies pending Prisma migrations to the deployment's own database.
 *
 * This runs as part of the build so that production schema changes never depend
 * on someone running a command from a laptop.
 *
 * Two details matter on a pooled Postgres (Neon's default connection string is
 * pooled through PgBouncer):
 *
 *   - Migrations take advisory locks and issue DDL, which transaction-mode
 *     pooling does not reliably support, so a direct (unpooled) connection is
 *     preferred when the platform provides one. Neon's Vercel integration
 *     exposes it as DATABASE_URL_UNPOOLED / POSTGRES_URL_NON_POOLING.
 *   - Nothing here invents a connection string. If none of these variables is
 *     set, the build fails loudly rather than deploying against nothing.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// The Prisma CLI reads .env itself, so do the same here for parity when this is
// run from a development checkout. Deployments have no .env file and get their
// configuration from the platform's environment instead.
try {
  process.loadEnvFile();
} catch {
  // No .env file, which is the normal case in a deployment.
}

const CANDIDATES = [
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL_UNPOOLED",
  "DATABASE_URL",
];

const chosen = CANDIDATES.find((name) => (process.env[name] ?? "").trim() !== "");

if (!chosen) {
  console.error(
    [
      "",
      "Cannot apply database migrations: no connection string in the environment.",
      "",
      `Set DATABASE_URL (checked, in order: ${CANDIDATES.join(", ")}).`,
      "On Vercel: Project Settings -> Environment Variables, for the environment",
      "you are deploying, and make sure it is available at build time.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

if (chosen !== "DATABASE_URL") {
  console.log(`Applying migrations over ${chosen} (direct connection).`);
} else {
  console.log("Applying migrations over DATABASE_URL.");
}

// Resolve the CLI from node_modules rather than trusting PATH, so this behaves
// the same whether it is run by npm, by the platform's build, or directly.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localBin = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);
const cli = existsSync(localBin) ? localBin : "prisma";

const result = spawnSync(cli, ["migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  // Only the URL is overridden; no credential is ever written down or logged.
  env: { ...process.env, DATABASE_URL: process.env[chosen] },
});

process.exit(result.status ?? 1);

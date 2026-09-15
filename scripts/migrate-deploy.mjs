#!/usr/bin/env node
/**
 * Applies pending Prisma migrations to the deployment's own database.
 *
 * This runs during the build so that production schema changes never depend on
 * someone running a command from a laptop. `prisma migrate deploy` only applies
 * migrations that are already committed, never generates or resets anything, so
 * it is safe to run on every deployment and is a no-op once they are applied.
 *
 * Migrations take advisory locks and issue DDL, which transaction-mode poolers
 * (Neon's default connection string is pooled through PgBouncer) do not reliably
 * support — so a DIRECT connection is preferred here, the opposite of what the
 * application wants. See src/lib/db/connection.ts for the application's order.
 *
 * Nothing here invents a connection string, and no value is ever printed.
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

/** Direct connections first; pooled ones only as a fallback. */
const CANDIDATES = [
  // Explicitly configured direct connections.
  "DIRECT_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  // Published by Vercel's Neon integration.
  "STORAGE_DATABASE_URL_UNPOOLED",
  "STORAGE_POSTGRES_URL_NON_POOLING",
  // Pooled, as a last resort: migrating over a pooler usually works for small
  // migrations and is better than not migrating at all.
  "DATABASE_URL",
  "STORAGE_DATABASE_URL",
  "STORAGE_POSTGRES_PRISMA_URL",
  "STORAGE_POSTGRES_URL",
];

const chosen = CANDIDATES.find((name) => (process.env[name] ?? "").trim() !== "");

if (!chosen) {
  // Report which connection-ish variables the build *can* see, by name only, so
  // a misconfigured environment is obvious from the build log.
  const visible = Object.keys(process.env)
    .filter((name) => /^(DATABASE_URL|DIRECT_URL|POSTGRES_|STORAGE_)/.test(name))
    .filter((name) => (process.env[name] ?? "").trim() !== "")
    .sort();

  console.error(
    [
      "",
      "Cannot apply database migrations: no connection string in this environment.",
      "",
      `Looked for, in order: ${CANDIDATES.join(", ")}`,
      "",
      visible.length
        ? `Variables that ARE visible here: ${visible.join(", ")}`
        : "No database-related variables are visible here at all.",
      "",
      "On Vercel, an environment variable is only available to a build if it is",
      "set for the environment being deployed (Production and Preview are",
      "separate). Project Settings -> Environment Variables.",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const pooled = !/UNPOOLED|NON_POOLING|DIRECT/.test(chosen);
console.log(
  `Applying migrations over ${chosen}${pooled ? " (pooled — a direct connection is preferred)" : " (direct connection)"}.`,
);

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

// Point at the schema explicitly so this does not depend on the caller's cwd.
const schema = path.join(root, "prisma", "schema.prisma");

const result = spawnSync(cli, ["migrate", "deploy", "--schema", schema], {
  stdio: "inherit",
  shell: process.platform === "win32",
  // Only the URL is overridden; no credential is written down or logged.
  env: { ...process.env, DATABASE_URL: process.env[chosen] },
});

process.exit(result.status ?? 1);

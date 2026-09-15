/**
 * Where the database connection string comes from.
 *
 * `DATABASE_URL` is the name this project uses, and it wins whenever it is set.
 * But a managed Postgres attached through a platform integration publishes its
 * own names — Vercel's Neon integration creates a `STORAGE_*` set — and those
 * are the credentials the platform actually rotates. Reading them directly means
 * the deployment works off the integration's own variables instead of a copy
 * that silently goes stale, and it keeps every credential out of this repository.
 *
 * Application queries prefer a POOLED connection: serverless instances are many
 * and short-lived, and a pooler is what keeps them from exhausting Postgres.
 * Migrations want the opposite — see scripts/migrate-deploy.mjs.
 */

/** Checked in order; the first non-empty one wins. */
export const APPLICATION_URL_VARIABLES = [
  // What this project documents, and what a self-hosted deployment sets.
  "DATABASE_URL",
  // Vercel Postgres' own name: pooled, and already tuned for Prisma.
  "POSTGRES_PRISMA_URL",
  // Vercel's Neon integration. The "PRISMA" one carries ?pgbouncer=true, which
  // is what stops Prisma using prepared statements through the pooler.
  "STORAGE_POSTGRES_PRISMA_URL",
  "STORAGE_DATABASE_URL",
  "STORAGE_POSTGRES_URL",
  // Direct connections, last: better than no database at all.
  "DATABASE_URL_UNPOOLED",
  "STORAGE_DATABASE_URL_UNPOOLED",
  "STORAGE_POSTGRES_URL_NON_POOLING",
] as const;

export interface ResolvedConnection {
  /** The connection string. */
  url: string;
  /** Which environment variable it came from, for logging. Never the value. */
  source: string;
}

export function resolveDatabaseConnection(
  env: NodeJS.ProcessEnv = process.env,
): ResolvedConnection | null {
  for (const name of APPLICATION_URL_VARIABLES) {
    const value = env[name]?.trim();
    if (value) return { url: value, source: name };
  }
  return null;
}

/**
 * Names of connection-ish variables that are visible, for diagnostics.
 * Values are never returned — only whether something is there to be found.
 */
export function visibleConnectionVariables(env: NodeJS.ProcessEnv = process.env): string[] {
  return Object.keys(env)
    .filter((name) => /^(DATABASE_URL|DIRECT_URL|POSTGRES_|STORAGE_)/.test(name))
    .filter((name) => (env[name] ?? "").trim() !== "")
    .sort();
}

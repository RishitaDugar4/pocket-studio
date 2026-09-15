import { PrismaClient } from "@prisma/client";
import { resolveDatabaseConnection } from "./connection";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * The connection string is resolved here rather than left to the schema's
 * env("DATABASE_URL"), so the app can also run off the names a platform
 * integration publishes. When nothing resolves, the client is constructed
 * without an explicit URL and Prisma raises its own (clear) error on the first
 * query — importing this module must never throw, or the build breaks.
 */
const connection = resolveDatabaseConnection();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(connection ? { datasourceUrl: connection.url } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

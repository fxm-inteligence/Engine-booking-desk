// Yours: one database client for the rules in the *.hooks.ts files. Generated code never touches this file.
import { PrismaClient } from "@prisma/client";

let client: PrismaClient | undefined;

/** The shared client, or undefined when there is no database (unit tests run without one). */
export function database(): PrismaClient | undefined {
  if (!process.env.DATABASE_URL) return undefined;
  client ??= new PrismaClient();
  return client;
}

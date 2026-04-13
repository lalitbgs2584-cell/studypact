import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from "../generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL missing in prisma.ts');
}

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
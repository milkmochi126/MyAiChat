import { PrismaClient } from '@prisma/client'

// PrismaClient 是附加到 global 物件的，以防止在開發模式下連接過多實例
const globalForPrisma = global

export const prisma =
  globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma 
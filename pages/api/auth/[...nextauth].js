import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "../../../lib/prisma";

// 添加調試日誌
console.log("Initializing NextAuth...");
console.log("Database URL:", process.env.DATABASE_URL);

// 使用 Prisma 直接創建數據庫表格
async function createTablesIfNotExist() {
  try {
    console.log("檢查或創建數據庫表格...");

    try {
      // 嘗試直接查詢用戶表 - 如果不存在會拋出錯誤
      await prisma.user.findFirst();
      console.log("表格存在，無需創建");
    } catch (error) {
      // 表格不存在的錯誤，需要創建模型
      console.log("表格不存在，嘗試創建數據庫模型");
      console.log("錯誤詳情:", error.message);

      // 如果表格不存在，手動創建核心表格
      try {
        // 使用原始 SQL 創建必要的表格
        // 創建 User 表
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "users" (
            "id" TEXT NOT NULL,
            "name" TEXT,
            "email" TEXT,
            "email_verified" TIMESTAMP(3),
            "image" TEXT,
            "bio" TEXT,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "users_pkey" PRIMARY KEY ("id")
          );
          CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
        `;
        console.log("創建 users 表成功");

        // 創建 Account 表
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "accounts" (
            "id" TEXT NOT NULL,
            "user_id" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "provider" TEXT NOT NULL,
            "provider_account_id" TEXT NOT NULL,
            "refresh_token" TEXT,
            "access_token" TEXT,
            "expires_at" INTEGER,
            "token_type" TEXT,
            "scope" TEXT,
            "id_token" TEXT,
            "session_state" TEXT,
            CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
          );
          CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" 
            ON "accounts"("provider", "provider_account_id");
          ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `;
        console.log("創建 accounts 表成功");

        // 創建 Session 表
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "sessions" (
            "id" TEXT NOT NULL,
            "session_token" TEXT NOT NULL,
            "user_id" TEXT NOT NULL,
            "expires" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
          );
          CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" ON "sessions"("session_token");
          ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `;
        console.log("創建 sessions 表成功");

        // 創建 VerificationToken 表
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "verification_tokens" (
            "identifier" TEXT NOT NULL,
            "token" TEXT NOT NULL,
            "expires" TIMESTAMP(3) NOT NULL
          );
          CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" ON "verification_tokens"("token");
          CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" 
            ON "verification_tokens"("identifier", "token");
        `;
        console.log("創建 verification_tokens 表成功");

        console.log("所有必要表格創建成功");
      } catch (sqlError) {
        console.error("SQL 執行錯誤:", sqlError.message);
      }
    }
  } catch (error) {
    console.error("初始化數據庫時發生錯誤:", error);
  }
}

// 嘗試創建表格
createTablesIfNotExist().catch(error => {
  console.error("表格創建過程拋出異常:", error);
});

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_REDIRECT_URI,
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = user.id;
        if (user.image) {
          session.user.image = user.image;
        }
      }
      console.log("Session callback. User:", user.id);
      return session;
    },
  },
  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
};

// 添加調試日誌
console.log("重定向請求:", {
  url: process.env.NEXTAUTH_URL,
  baseUrl: process.env.NEXTAUTH_URL,
});

export default NextAuth(authOptions); 
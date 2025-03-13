import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "../../../lib/prisma";

// 添加調試日誌
console.log("Initializing NextAuth...");
console.log("Database URL:", process.env.DATABASE_URL);

// 嘗試自動創建數據庫表格
async function createTablesIfNotExist() {
  try {
    console.log("Checking database tables...");

    // 檢查是否有必要的表格
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'accounts'
      );
    `;
    
    console.log("Table check result:", tableExists);

    if (!tableExists[0].exists) {
      console.log("Tables do not exist. Creating schema...");
      // 如果表格不存在，執行 schema push
      const { exec } = require('child_process');
      exec('npx prisma db push', (error, stdout, stderr) => {
        if (error) {
          console.error('Error executing Prisma db push:', error);
          return;
        }
        console.log('Prisma db push output:', stdout);
        if (stderr) console.error('Prisma db push stderr:', stderr);
      });
    } else {
      console.log("Tables already exist.");
    }
  } catch (error) {
    console.error("Error checking/creating tables:", error);
  }
}

// 嘗試創建表格
createTablesIfNotExist().catch(console.error);

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
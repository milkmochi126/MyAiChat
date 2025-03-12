import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "../../../lib/prisma";

// 確保使用正確的部署URL，而不是localhost
const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: `${appUrl}/api/auth/callback/google`
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      // 把用戶ID添加到會話中
      if (session.user) {
        session.user.id = user.id;
        
        // 確保頭像 URL 可用
        if (user.image) {
          session.user.image = user.image;
          console.log('用戶頭像 URL:', user.image);
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 確保重定向使用正確的部署URL
      console.log("重定向請求:", { url, baseUrl });
      
      // 如果URL是相對路徑或者包含部署網址，直接返回
      if (url.startsWith('/') || url.startsWith(baseUrl)) {
        return url;
      }
      
      // 如果URL包含localhost，替換為部署網址
      if (url.includes('localhost')) {
        return url.replace('http://localhost:3000', baseUrl);
      }
      
      // 默認行為
      return baseUrl;
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions); 
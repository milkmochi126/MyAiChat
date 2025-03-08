import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Navbar from "./Navbar";

export default function Layout({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === "loading";

  useEffect(() => {
    // 如果用戶未登錄且不在登錄頁面，則重定向到登錄頁面
    if (status === "unauthenticated" && !router.pathname.startsWith("/auth/")) {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // 只在真正加載時顯示加載畫面
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">載入中...</div>
      </div>
    );
  }

  // 如果未登入，不顯示任何內容，等待重定向
  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
} 
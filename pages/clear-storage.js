import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/router";
import Head from "next/head";
import { clearAllUserData } from "../utils/userStorage";

export default function ClearStorage() {
  const router = useRouter();
  const [message, setMessage] = useState("正在清除本地存儲...");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 清除所有本地存儲
    try {
      // 使用我們的工具函數清除所有數據
      clearAllUserData();
      
      setMessage("本地存儲已清除！");
      
      // 清除所有 cookie
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // 登出
      signOut({ redirect: false });
      
      // 倒計時後重定向
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push("/api/auth/signin");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } catch (error) {
      setMessage(`清除失敗: ${error.message}`);
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <Head>
        <title>清除存儲 - AI 聊天</title>
      </Head>
      
      <div className="max-w-md w-full p-6 bg-gray-800 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4">清除本地存儲</h1>
        <p className="mb-4">{message}</p>
        {countdown > 0 && (
          <p>
            {countdown} 秒後將重定向到登入頁面...
          </p>
        )}
        <button
          onClick={() => router.push("/api/auth/signin")}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          立即前往登入頁面
        </button>
      </div>
    </div>
  );
} 
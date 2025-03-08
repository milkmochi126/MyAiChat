import { signIn, useSession } from "next-auth/react";
import Head from "next/head";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function SignIn() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // 如果已登入，重定向到首頁
  useEffect(() => {
    if (session) {
      router.push("/welcome");
    }
  }, [session, router]);
  
  const handleSignIn = async (provider) => {
    try {
      setIsLoggingIn(true);
      await signIn(provider, { callbackUrl: "/" });
    } catch (error) {
      console.error("登入失敗:", error);
      setIsLoggingIn(false);
    }
  };
  
  // 如果正在檢查會話狀態，顯示加載畫面
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">載入中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <Head>
        <title>登入 - AI 聊天</title>
      </Head>
      
      <div className="max-w-md w-full p-6 bg-gray-800 rounded-lg shadow-lg">
        <div className="flex justify-center mb-8">
          <h1 className="text-3xl font-bold">歡迎回來</h1>
        </div>
        
        <div className="text-center mb-8">
          <p className="text-gray-300">登入後即可開始與虛擬角色聊天</p>
        </div>
        
        <button
          onClick={() => handleSignIn("google")}
          disabled={isLoggingIn}
          className={`flex items-center justify-center w-full py-3 bg-white text-gray-800 rounded-lg transition-colors mb-4 ${
            isLoggingIn ? "opacity-70 cursor-not-allowed" : "hover:bg-gray-100"
          }`}
        >
          {isLoggingIn ? (
            <>
              <div className="w-5 h-5 border-t-2 border-b-2 border-gray-800 rounded-full animate-spin mr-2"></div>
              登入中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                />
              </svg>
              使用 Google 登入
            </>
          )}
        </button>
        
        <div className="text-center text-sm text-gray-400 mt-8">
          <p>登入即表示您同意我們的服務條款與隱私政策</p>
        </div>
      </div>
    </div>
  );
} 
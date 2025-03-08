import "@/styles/globals.css";
import { SessionProvider, useSession } from "next-auth/react";
import Layout from "../components/Layout";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { getSafeUserId, initializeNewUser } from "../utils/userStorage";
import { Toaster } from 'react-hot-toast';

// 用戶初始化組件
function UserInitializer() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    // 當會話狀態變化時檢查用戶初始化
    if (status === 'authenticated' && session) {
      console.log('用戶已登錄，檢查初始化狀態');
      
      // 獲取安全的用戶 ID
      const userId = getSafeUserId(session);
      
      // 初始化新用戶數據
      initializeNewUser(userId, session);
    } else if (status === 'unauthenticated') {
      console.log('用戶未登錄');
    }
  }, [session, status]);
  
  return null;
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  
  // 檢查是否是登入頁面或不需要導航欄的頁面
  const isAuthPage = router.pathname.startsWith("/auth/");
  
  return (
    <SessionProvider session={session} refetchInterval={5 * 60}>
      {!isAuthPage && <UserInitializer />}
      <Toaster position="top-right" />
      
      {isAuthPage ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </SessionProvider>
  );
}

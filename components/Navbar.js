import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { getSafeUserId, getUserData, setUserData, clearAllUserData } from "../utils/userStorage";
import axios from "axios";

export default function Navbar() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  const navItems = [
    { name: "首頁", path: "/welcome" },
    { name: "聊天", path: "/" },
    { name: "好友", path: "/friends" },
    { name: "角色", path: "/characters" },
    { name: "設定", path: "/settings" },
  ];

  // 從用戶存儲和資料庫中獲取用戶資料
  useEffect(() => {
    if (session) {
      const userId = getSafeUserId(session);
      
      // 首先使用會話中的資料
      setUserProfile({
        name: session.user.name || '用戶',
        email: session.user.email || '',
        avatar: session.user.image || ''
      });
      
      // 然後嘗試從本地存儲獲取
      const storedProfile = getUserData(userId, 'userProfile', null);
      if (storedProfile) {
        setUserProfile(storedProfile);
      }
      
      // 最後嘗試從資料庫獲取最新資料
      axios.get('/api/user/profile')
        .then(response => {
          if (response.status === 200) {
            const dbProfile = response.data;
            
            // 更新用戶資料
            setUserProfile(prev => ({
              ...prev,
              name: dbProfile.name || prev.name,
              email: dbProfile.email || prev.email,
              avatar: dbProfile.image || prev.avatar
            }));
            
            // 同時更新本地存儲
            const updatedProfile = {
              ...storedProfile,
              name: dbProfile.name || storedProfile?.name,
              email: dbProfile.email || storedProfile?.email,
              avatar: dbProfile.image || storedProfile?.avatar
            };
            
            setUserData(userId, 'userProfile', updatedProfile);
          }
        })
        .catch(error => {
          console.error('獲取用戶資料失敗:', error);
        });
    } else {
      setUserProfile(null);
    }
  }, [session, router.pathname]);

  // 顯示的用戶名稱和頭像
  const displayName = userProfile?.name || session?.user?.name || "訪客";
  const avatarUrl = userProfile?.avatar || session?.user?.image;

  // 處理登出
  const handleSignOut = async () => {
    try {
      // 設置一個標誌，表示正在登出
      window.isLoggingOut = true;
      
      // 清除所有本地存儲的數據
      clearAllUserData();
      
      // 使用NextAuth登出，直接重定向到登入頁面
      await signOut({ redirect: true, callbackUrl: "/auth/signin" });
      
      // 不需要手動重定向和刷新頁面，NextAuth 會處理
    } catch (error) {
      console.error('登出失敗:', error);
      window.isLoggingOut = false;
      alert('登出過程中發生錯誤，請重試');
    }
  };

  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-xl font-bold">
                AI 聊天
              </Link>
            </div>
            
            {/* 桌面導航 */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      router.pathname === item.path
                        ? "bg-gray-900 text-white"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          
          {/* 用戶信息和登出按鈕 */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              {session ? (
                <div className="flex items-center">
                  <div 
                    className="flex items-center cursor-pointer hover:bg-gray-700 rounded-lg px-2 py-1 mr-3"
                    onClick={() => router.push('/settings')}
                  >
                    {avatarUrl && (
                      <img
                        className="h-8 w-8 rounded-full mr-2"
                        src={avatarUrl}
                        alt={displayName}
                        onError={(e) => {
                          console.error(`用戶頭像加載失敗: ${avatarUrl}`);
                          e.target.onerror = null;
                          e.target.src = '/img/default-avatar.svg';
                        }}
                      />
                    )}
                    <span className="text-sm">{displayName}</span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm"
                  >
                    登出
                  </button>
                </div>
              ) : (
                <Link
                  href="/api/auth/signin"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm"
                >
                  登入
                </Link>
              )}
            </div>
          </div>
          
          {/* 移動端菜單按鈕 */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
            >
              <span className="sr-only">打開主菜單</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 移動端菜單 */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  router.pathname === item.path
                    ? "bg-gray-900 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
            
            {session ? (
              <>
                <div 
                  className="flex items-center px-3 py-2 cursor-pointer hover:bg-gray-700 rounded-md"
                  onClick={() => router.push('/settings')}
                >
                  {avatarUrl && (
                    <img
                      className="h-8 w-8 rounded-full mr-2"
                      src={avatarUrl}
                      alt={displayName}
                      onError={(e) => {
                        console.error(`用戶頭像加載失敗: ${avatarUrl}`);
                        e.target.onerror = null;
                        e.target.src = '/img/default-avatar.svg';
                      }}
                    />
                  )}
                  <span className="text-sm">{displayName}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="mt-3 block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-red-600 hover:bg-red-700 text-white"
                >
                  登出
                </button>
              </>
            ) : (
              <Link
                href="/api/auth/signin"
                className="mt-3 block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-blue-600 hover:bg-blue-700 text-white"
              >
                登入
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Welcome() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 如果用戶未登錄，重定向到登錄頁面
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">歡迎使用 AI 聊天應用</h1>
          <p className="text-xl text-gray-500 dark:text-gray-300">
            與您創建的角色進行有趣的對話，探索 AI 聊天的無限可能
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gray-800 dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">開始聊天</h2>
            <p className="mb-4">查看您的聊天列表，繼續之前的對話或開始新的聊天。</p>
            <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">
              前往聊天
            </Link>
          </div>

          <div className="bg-gray-800 dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">管理角色</h2>
            <p className="mb-4">創建新角色，編輯現有角色，或瀏覽公開角色庫。</p>
            <Link href="/characters" className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded">
              角色管理
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800 dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">好友列表</h2>
            <p className="mb-4">查看您添加的好友角色，快速開始對話。</p>
            <Link href="/friends" className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded">
              查看好友
            </Link>
          </div>

          <div className="bg-gray-800 dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold mb-4">個人設置</h2>
            <p className="mb-4">管理您的個人資料、API 金鑰和應用設置。</p>
            <Link href="/settings" className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded">
              前往設置
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 
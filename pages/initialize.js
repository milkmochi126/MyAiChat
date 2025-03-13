import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Initialize() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();

  // 如果用戶未登入，重定向到登入頁面
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  async function initializeDatabase() {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/init-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '初始化失敗');
      }
      
      setResults(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>初始化數據庫 - MyAIChat</title>
      </Head>
      
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-8">
          <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
            數據庫初始化工具
          </h1>
          
          {status === 'loading' ? (
            <div className="text-center py-4">正在加載...</div>
          ) : (
            <>
              <div className="bg-blue-50 p-4 mb-6 rounded-md">
                <p className="text-blue-700 text-sm">
                  您好 <span className="font-bold">{session?.user?.name}</span>！
                  此工具將檢查並創建所需的數據庫表格，幫助解決應用程序初始化問題。
                </p>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={initializeDatabase}
                  disabled={loading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    loading 
                      ? 'bg-blue-300 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {loading ? '初始化中...' : '初始化數據庫'}
                </button>
                
                {error && (
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
                
                {results && (
                  <div className="bg-green-50 p-4 rounded-md">
                    <h3 className="text-green-800 font-medium mb-2">初始化結果</h3>
                    <p className="text-green-700 font-medium mb-2">
                      {results.message}
                    </p>
                    
                    {results.tables && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-green-800 mb-1">表格狀態:</p>
                        <ul className="text-sm text-green-700 pl-5 list-disc">
                          {Object.entries(results.tables).map(([table, exists]) => (
                            <li key={table}>
                              {table}: {exists ? '已存在' : '已創建'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <button
                        onClick={() => router.push('/')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        返回首頁
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 
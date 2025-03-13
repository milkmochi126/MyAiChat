import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Diagnostics() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState({
    diagnose: false,
    initV1: false,
    initV2: false,
    initOrder: false
  });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();
  
  // 如果用戶未登入，重定向到登入頁面
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  // 進行數據庫診斷
  async function runDiagnostics() {
    setLoading({ ...loading, diagnose: true });
    setError('');
    setResults(null);
    
    try {
      const response = await fetch('/api/diagnose', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '診斷失敗');
      }
      
      setResults(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading({ ...loading, diagnose: false });
    }
  }
  
  // 初始化數據庫 - V1 (原始版本)
  async function initializeDbV1() {
    setLoading({ ...loading, initV1: true });
    setError('');
    setResults(null);
    
    try {
      const response = await fetch('/api/init-trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '初始化V1失敗');
      }
      
      setResults(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading({ ...loading, initV1: false });
    }
  }
  
  // 初始化數據庫 - V2 (優化版本)
  async function initializeDbV2() {
    setLoading({ ...loading, initV2: true });
    setError('');
    setResults(null);
    
    try {
      const response = await fetch('/api/init-trigger-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '初始化V2失敗');
      }
      
      setResults(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading({ ...loading, initV2: false });
    }
  }
  
  // 初始化數據庫 - 按依賴順序
  async function initializeDbOrder() {
    setLoading({ ...loading, initOrder: true });
    setError('');
    setResults(null);
    
    try {
      const response = await fetch('/api/db-init-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: 'internal-call' // 實際API會驗證會話
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '初始化順序方法失敗');
      }
      
      setResults(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading({ ...loading, initOrder: false });
    }
  }

  // 格式化顯示JSON
  function formatJson(json) {
    return JSON.stringify(json, null, 2);
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>數據庫診斷 - MyAIChat</title>
      </Head>
      
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-center text-gray-900 mb-6">
              數據庫診斷與修復工具
            </h1>
            
            {status === 'loading' ? (
              <div className="text-center py-4">加載中...</div>
            ) : (
              <>
                <div className="bg-blue-50 p-4 mb-6 rounded-md">
                  <p className="text-blue-700">
                    您好 <span className="font-bold">{session?.user?.name}</span>！
                    這個工具可以幫助您診斷和修復數據庫問題。
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* 診斷按鈕 */}
                  <button
                    onClick={runDiagnostics}
                    disabled={loading.diagnose}
                    className={`flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      loading.diagnose 
                        ? 'bg-blue-300 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                    }`}
                  >
                    {loading.diagnose ? '診斷中...' : '運行數據庫診斷'}
                  </button>
                  
                  {/* 初始化V1按鈕 */}
                  <button
                    onClick={initializeDbV1}
                    disabled={loading.initV1}
                    className={`flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      loading.initV1 
                        ? 'bg-green-300 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                    }`}
                  >
                    {loading.initV1 ? '初始化中...' : '初始化數據庫 (原始版)'}
                  </button>
                  
                  {/* 初始化V2按鈕 */}
                  <button
                    onClick={initializeDbV2}
                    disabled={loading.initV2}
                    className={`flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      loading.initV2 
                        ? 'bg-purple-300 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
                    }`}
                  >
                    {loading.initV2 ? '初始化中...' : '初始化數據庫 (優化版)'}
                  </button>
                  
                  {/* 初始化順序版按鈕 */}
                  <button
                    onClick={initializeDbOrder}
                    disabled={loading.initOrder}
                    className={`flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      loading.initOrder 
                        ? 'bg-yellow-300 cursor-not-allowed' 
                        : 'bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500'
                    }`}
                  >
                    {loading.initOrder ? '初始化中...' : '初始化數據庫 (順序版)'}
                  </button>
                </div>
                
                {error && (
                  <div className="bg-red-50 p-4 rounded-md mb-6">
                    <h3 className="text-red-800 font-medium">發生錯誤</h3>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                )}
                
                {results && (
                  <div className="bg-gray-50 p-4 rounded-md overflow-hidden">
                    <h3 className="text-gray-800 font-medium mb-2">執行結果</h3>
                    <div className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-auto">
                      <pre className="text-xs">{formatJson(results)}</pre>
                    </div>
                    
                    {/* 表格狀態顯示 */}
                    {results.tables && (
                      <div className="mt-4">
                        <h4 className="text-gray-700 font-medium mb-2">表格狀態</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(results.tables).map(([table, data]) => (
                            <div 
                              key={table}
                              className={`p-2 rounded-md text-xs ${
                                data.exists || data === true
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {table}: {data.exists || data === true ? '已存在' : '已創建'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 flex justify-center">
                      <button
                        onClick={() => router.push('/')}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        返回首頁
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
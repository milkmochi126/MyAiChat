import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ClearStoragePage() {
  const router = useRouter();
  
  // 自動返回首頁
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <h1 className="text-2xl font-bold mb-6">本地存儲已停用</h1>
        
        <div className="mb-8">
          <p className="mb-4 text-gray-700">
            此應用已經完全改用數據庫模式，所有資料都保存在伺服器上而非瀏覽器本地存儲。
          </p>
          <p className="mb-4 text-gray-700">
            本地存儲不再被使用，因此無需清除。
          </p>
          <p className="text-blue-600">
            5秒後自動返回首頁...
          </p>
        </div>
        
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-md transition duration-300"
          onClick={() => router.push('/')}
        >
          立即返回首頁
        </button>
      </div>
    </div>
  );
} 
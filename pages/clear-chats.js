import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { getSafeUserId } from '../utils/userStorage';

export default function ClearChatsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [countdown, setCountdown] = useState(null);
  
  // 檢查用戶登錄狀態
  useEffect(() => {
    if (!session && session !== undefined) {
      // 未登錄用戶重定向到首頁
      router.push('/');
    }
  }, [session, router]);
  
  // 處理清除聊天
  const handleClearChats = async () => {
    try {
      if (confirmText !== '我確定') {
        alert('請輸入"我確定"以確認清除所有聊天');
        return;
      }
      
      setIsClearing(true);
      
      // 獲取用戶ID
      const userId = getSafeUserId(session);
      
      // 呼叫API刪除所有聊天
      await axios.delete('/api/chats?all=true');
      
      // 設置倒計時
      setCountdown(3);
    } catch (error) {
      console.error('清除聊天失敗:', error);
      alert('清除聊天失敗，請稍後再試');
      setIsClearing(false);
    }
  };
  
  // 處理倒計時
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      // 倒計時結束，跳轉到首頁
      router.push('/');
      return;
    }
    
    // 每秒減少倒計時
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, router]);
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6 text-center">清除所有聊天</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <p className="mb-2 text-red-600 font-semibold">警告：此操作將刪除所有聊天記錄！</p>
          <p className="mb-4 text-gray-700">
            這將永久刪除您的所有聊天記錄，但不會刪除您創建的角色。此操作無法撤銷。
          </p>
        </div>
        
        {isClearing ? (
          <div className="text-center">
            {countdown !== null ? (
              <div>
                <p className="text-green-600 mb-2">所有聊天記錄已清除！</p>
                <p className="text-gray-600">{countdown} 秒後自動返回首頁...</p>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                請輸入"我確定"以確認清除：
              </label>
              <input
                type="text"
                className="w-full p-2 border rounded-md"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="我確定"
              />
            </div>
            
            <div className="flex justify-between">
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition duration-300"
                onClick={() => router.push('/')}
              >
                取消
              </button>
              <button
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition duration-300"
                onClick={handleClearChats}
                disabled={confirmText !== '我確定'}
              >
                清除所有聊天
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 
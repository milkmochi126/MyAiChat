import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';
import { getSafeUserId, setUserData } from '../utils/userStorage';

export default function ClearChats() {
  const { data: session } = useSession();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // 載入聊天記錄
  useEffect(() => {
    const loadChats = async () => {
      try {
        if (!session) {
          setMessage('請先登入以管理您的聊天記錄');
          setLoading(false);
          return;
        }

        // 從API獲取聊天列表
        const response = await axios.get('/api/chats');
        const fetchedChats = response.data;
        
        setChats(fetchedChats);
        setMessage(`已找到 ${fetchedChats.length} 個聊天記錄`);
      } catch (error) {
        console.error('加載聊天列表失敗:', error);
        setMessage('加載聊天列表失敗: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [session]);

  // 刪除單個聊天
  const deleteChat = async (chatId) => {
    try {
      await axios.delete(`/api/chats/${chatId}`);
      return true;
    } catch (error) {
      console.error(`刪除聊天 ${chatId} 失敗:`, error);
      return false;
    }
  };

  // 刪除所有聊天
  const handleDeleteAll = async () => {
    if (!confirm('確定要刪除所有聊天記錄嗎？此操作不可恢復！')) {
      return;
    }

    setDeleting(true);
    setMessage('正在刪除所有聊天記錄...');

    let successCount = 0;
    let failCount = 0;

    for (const chat of chats) {
      const success = await deleteChat(chat.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // 更新進度消息
      setMessage(`正在刪除聊天記錄... (${successCount}/${chats.length})`);
    }

    // 清空本地存儲中的聊天列表
    if (session) {
      const userId = getSafeUserId(session);
      setUserData(userId, 'chatList', []);
    }

    setChats([]);
    setDeleting(false);
    setMessage(`刪除完成！成功: ${successCount}, 失敗: ${failCount}`);
  };

  // 返回首頁
  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">清理聊天記錄</h1>
      
      <div className="mb-4">
        <p className={`mb-4 ${message.includes('失敗') ? 'text-red-500' : message.includes('成功') ? 'text-green-500' : ''}`}>
          {message}
        </p>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={handleDeleteAll}
            disabled={loading || deleting || chats.length === 0}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {deleting ? '刪除中...' : '刪除所有聊天記錄'}
          </button>
          
          <button
            onClick={handleGoHome}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            返回首頁
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center">
          <p>加載中...</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold mb-2">聊天記錄列表</h2>
          
          {chats.length === 0 ? (
            <p>沒有聊天記錄</p>
          ) : (
            <div className="grid gap-4">
              {chats.map(chat => (
                <div key={chat.id} className="border p-4 rounded flex justify-between items-center">
                  <div>
                    <p><strong>角色:</strong> {chat.characterName}</p>
                    <p><strong>ID:</strong> {chat.id}</p>
                    <p><strong>最後訊息:</strong> {chat.lastMessage || '無訊息'}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (await deleteChat(chat.id)) {
                        setChats(chats.filter(c => c.id !== chat.id));
                      }
                    }}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
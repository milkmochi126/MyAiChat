import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import axios from "axios";
import { getSafeUserId, getUserData, setUserData } from "../utils/userStorage";

export default function Home() {
  const { data: session } = useSession();
  const [chatList, setChatList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState("本地模式");
  const router = useRouter();
  
  // 添加長按/右鍵選單狀態
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    chatId: null,
    characterName: ""
  });
  
  // 添加確認對話框狀態
  const [deleteConfirm, setDeleteConfirm] = useState({
    visible: false,
    chatId: null,
    characterName: "",
    inputName: ""
  });
  
  // 參考長按計時器
  const longPressTimer = useRef(null);
  // 參考文檔對象，用於監聽點擊事件
  const documentRef = useRef(null);

  // 檢查後端連線狀態 - 改為本地模式
  useEffect(() => {
    // 不再嘗試連接後端
    setLoading(false);
    
    // 設置文檔引用
    documentRef.current = document;
    
    // 添加文檔點擊事件監聽器，用於關閉上下文菜單
    const handleDocumentClick = (e) => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [contextMenu.visible]);

  // 載入聊天記錄
  useEffect(() => {
    const loadChats = async () => {
      try {
        console.log('開始加載聊天列表');
        
        if (!session || window.isLoggingOut) {
          console.log('未登錄或正在登出，清空聊天列表');
          setChatList([]);
          setLoading(false);
          return;
        }
        
        // 獲取用戶ID
        const userId = getSafeUserId(session);
        
        try {
          // 從API獲取聊天列表
          const response = await axios.get('/api/chats');
          const fetchedChats = response.data;
          
          console.log('已加載聊天:', fetchedChats.length);
          
          // 檢查頭像
          fetchedChats.forEach((chat, index) => {
            console.log(`聊天 ${index + 1} - ${chat.characterName} 的頭像:`, chat.characterAvatar || '無頭像');
            
            // 確保頭像格式正確
            if (chat.characterAvatar && typeof chat.characterAvatar === 'string') {
              // 如果頭像不是base64格式或URL，嘗試修復
              if (!chat.characterAvatar.startsWith('data:') && !chat.characterAvatar.startsWith('http')) {
                console.log(`  修復頭像路徑: ${chat.characterAvatar} -> /img/${chat.characterAvatar}`);
              }
            }
          });
          
          // 更新聊天列表
          setChatList(fetchedChats);
          
          // 同時更新本地存儲
          setUserData(userId, 'chatList', fetchedChats);
        } catch (apiError) {
          console.error('加載聊天列表失敗:', apiError);
          
          // 如果是未授權錯誤且正在登出，則忽略
          if (apiError.response?.status === 401 && window.isLoggingOut) {
            console.log('正在登出，忽略未授權錯誤');
            return;
          }
          
          // 如果API請求失敗，嘗試從本地存儲加載
          const localChats = getUserData(userId, 'chatList', []);
          setChatList(localChats);
        } finally {
          setLoading(false);
        }
      } catch (error) {
        console.error('加載聊天列表失敗:', error);
        setChatList([]);
        setLoading(false);
      }
    };
    
    loadChats();
    
    // 設置事件監聽器，當頁面可見時刷新聊天列表
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("首頁變為可見，刷新聊天列表");
        loadChats();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session]);

  // 處理聊天選擇
  const handleChatSelect = (chat) => {
    try {
      console.log(`嘗試開始與角色 ${chat.characterId || '已刪除'} 的聊天`);
      
      // 檢查 session 是否有效
      if (!session) {
        console.error('未登錄，無法開始聊天');
        alert("請先登入後再開始聊天");
        return;
      }
      
      // 如果角色已被刪除，但我們有聊天ID，則使用聊天ID進入聊天頁面
      if (!chat.characterId && chat.isDeleted) {
        console.log(`開始與已刪除角色 ${chat.characterName} 的聊天，使用聊天ID: ${chat.id}`);
        window.location.href = `/chat/${chat.id}?type=chat`;
        return;
      }
      
      // 檢查角色ID是否存在
      if (!chat.characterId) {
        console.error(`聊天 ${chat.id} 沒有關聯的角色ID`);
        alert("無法開始聊天，找不到關聯的角色");
        return;
      }
      
      console.log(`開始與角色 ${chat.characterName} (${chat.characterId}) 的聊天`);
      
      // 使用 window.location.href 而不是 router.push，以確保頁面完全重新加載
      window.location.href = `/chat/${chat.characterId}`;
    } catch (error) {
      console.error("開始聊天時出錯:", error);
      alert("開始聊天時出錯，請稍後再試");
    }
  };
  
  // 處理右鍵點擊
  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 設置上下文菜單位置和信息
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      chatId: chat.id,
      characterName: chat.characterName
    });
  };
  
  // 處理長按開始
  const handleTouchStart = (e, chat) => {
    e.stopPropagation();
    
    // 清除任何現有計時器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    // 設置新計時器，在750毫秒後顯示上下文菜單
    longPressTimer.current = setTimeout(() => {
      // 獲取觸摸位置
      const touch = e.touches[0];
      setContextMenu({
        visible: true,
        x: touch.clientX,
        y: touch.clientY,
        chatId: chat.id,
        characterName: chat.characterName
      });
    }, 750);
  };
  
  // 處理觸摸結束
  const handleTouchEnd = () => {
    // 清除長按計時器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  
  // 處理觸摸移動
  const handleTouchMove = () => {
    // 如果用戶在長按過程中移動手指，取消長按
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  
  // 處理確認刪除對話框開啟
  const handleDeleteChat = (chatId, characterName) => {
    setContextMenu(prev => ({ ...prev, visible: false }));
    setDeleteConfirm({
      visible: true,
      chatId,
      characterName,
      inputName: ""
    });
  };
  
  // 處理確認刪除對話框中的輸入變化
  const handleConfirmNameChange = (e) => {
    setDeleteConfirm(prev => ({
      ...prev,
      inputName: e.target.value
    }));
  };
  
  // 處理最終刪除確認
  const handleConfirmDelete = async () => {
    // 檢查輸入的名稱是否匹配
    if (deleteConfirm.inputName === deleteConfirm.characterName) {
      try {
        // 使用API刪除聊天
        await axios.delete(`/api/chats/${deleteConfirm.chatId}`);
        
        // 更新聊天列表
        setChatList(prev => prev.filter(chat => chat.id !== deleteConfirm.chatId));
        
        // 關閉對話框
        setDeleteConfirm({
          visible: false,
          chatId: null,
          characterName: "",
          inputName: ""
        });
        
        console.log('成功刪除聊天:', deleteConfirm.chatId);
      } catch (error) {
        console.error('刪除聊天失敗:', error);
        
        // 顯示更詳細的錯誤信息
        const errorMessage = error.response?.data?.error || '未知錯誤';
        const errorDetails = error.response?.data?.details || '';
        
        alert(`刪除聊天失敗: ${errorMessage}\n${errorDetails}\n\n請稍後再試或聯繫管理員。`);
      }
    } else {
      // 如果名稱不匹配，可以顯示錯誤訊息或震動
      alert('角色名稱不正確，請重新輸入');
    }
  };
  
  // 處理取消刪除
  const handleCancelDelete = () => {
    setDeleteConfirm({
      visible: false,
      chatId: null,
      characterName: "",
      inputName: ""
    });
  };

  // 格式化時間
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} 分鐘前`;
    } else if (diffHours < 24) {
      return `${diffHours} 小時前`;
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    }
  };
  
  // 獲取消息預覽文本
  const getMessagePreview = (message) => {
    if (!message) return "";
    
    // 移除角色名稱前綴 (如果有)
    let content = message;
    const colonIndex = message.indexOf(':');
    if (colonIndex > 0) {
      content = message.substring(colonIndex + 1).trim();
    }
    
    // 限制長度
    return content.length > 30 ? content.substring(0, 30) + '...' : content;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">我的聊天</h1>
        
        <div className="flex space-x-2">
          <Link href="/characters" className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-2 rounded">
            角色列表
          </Link>
        </div>
      </div>

      <div className="flex flex-col h-full">
        <header className="px-4 py-2 bg-gray-800 flex items-center justify-between">
          <h1 className="text-xl font-bold">聊天</h1>
          <div className="text-sm text-gray-400 flex items-center">
            <span className="mr-2">模式: {backendStatus}</span>
            <Link href="/characters" className="p-2 rounded-full hover:bg-gray-700 mx-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </Link>
            <Link href="/settings" className="p-2 rounded-full hover:bg-gray-700 mx-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </header>

        <div className="flex-grow overflow-y-auto">
          {chatList.length > 0 ? (
            <ul className="divide-y divide-gray-700">
              {chatList.map((chat) => (
                <li 
                  key={chat.id} 
                  className="px-4 py-3 hover:bg-gray-800 cursor-pointer"
                  onClick={() => handleChatSelect(chat)}
                  onContextMenu={(e) => handleContextMenu(e, chat)} 
                  onTouchStart={(e) => handleTouchStart(e, chat)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                >
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                      {chat.characterAvatar ? (
                        <img 
                          src={chat.characterAvatar.startsWith('data:') ? chat.characterAvatar : 
                              (chat.characterAvatar.startsWith('http') ? chat.characterAvatar : `/img/${chat.characterAvatar}`)}
                          alt={chat.characterName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error(`頭像加載失敗: ${chat.characterAvatar}`);
                            e.target.onerror = null;
                            e.target.src = '/img/default-avatar.svg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">
                          {chat.characterName?.[0] || "?"}
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex-grow min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-base font-medium truncate">
                          {chat.characterName}
                          {chat.isDeleted && <span className="text-xs text-gray-400 ml-2">(已刪除的角色)</span>}
                        </h3>
                        <span className="text-xs text-gray-400">{formatTime(chat.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {getMessagePreview(chat.lastMessage)}
                      </p>
                    </div>
                    {chat.unread > 0 && (
                      <div className="ml-2 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs">{chat.unread}</span>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center">
              <p className="text-gray-400 mb-4">您尚未開始任何對話</p>
              <Link href="/characters" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded transition">
                瀏覽角色
              </Link>
            </div>
          )}
        </div>
        
        {/* 右鍵/長按選單 */}
        {contextMenu.visible && (
          <div 
            className="fixed bg-gray-800 shadow-lg rounded-md overflow-hidden z-50"
            style={{ 
              top: `${contextMenu.y}px`, 
              left: `${contextMenu.x}px`,
              transform: 'translate(-50%, -50%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <ul>
              <li 
                className="px-4 py-2 hover:bg-gray-700 text-red-400 cursor-pointer flex items-center"
                onClick={() => handleDeleteChat(contextMenu.chatId, contextMenu.characterName)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                刪除聊天記錄
              </li>
            </ul>
          </div>
        )}
        
        {/* 確認刪除對話框 */}
        {deleteConfirm.visible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg w-11/12 max-w-md p-4 shadow-xl">
              <h2 className="text-xl font-bold mb-4">確認刪除</h2>
              <p className="mb-2">您確定要刪除與 <span className="font-semibold text-yellow-400">{deleteConfirm.characterName}</span> 的所有聊天記錄嗎？</p>
              <p className="mb-4 text-red-400 text-sm">此操作不可恢復！</p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  請輸入角色名稱「{deleteConfirm.characterName}」以確認刪除
                </label>
                <input 
                  type="text" 
                  value={deleteConfirm.inputName} 
                  onChange={handleConfirmNameChange}
                  className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="輸入角色名稱..."
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button 
                  onClick={handleCancelDelete}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  取消
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  className={`px-4 py-2 rounded ${
                    deleteConfirm.inputName === deleteConfirm.characterName 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gray-600 cursor-not-allowed'
                  }`}
                  disabled={deleteConfirm.inputName !== deleteConfirm.characterName}
                >
                  刪除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import axios from "axios";
import { getSafeUserId, getUserData, setUserData } from "../utils/userStorage";

export default function Friends() {
  const { data: session } = useSession();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  // 獲取當前用戶資料
  useEffect(() => {
    if (session) {
      const userId = getSafeUserId(session);
      const storedProfile = getUserData(userId, 'userProfile', null);
      
      if (storedProfile) {
        setCurrentUser(storedProfile);
      } else {
        // 如果沒有本地存儲的個人資料，則使用session中的資料
        const defaultProfile = {
          name: session.user.name,
          email: session.user.email,
          avatar: session.user.image
        };
        setCurrentUser(defaultProfile);
        
        // 保存到本地存儲
        setUserData(userId, 'userProfile', defaultProfile);
      }
    } else {
      setCurrentUser(null);
    }
  }, [session]);

  // 定義獲取好友的函數，以便重複使用
  const fetchFriends = async () => {
    try {
      setLoading(true);
      
      if (!session || window.isLoggingOut) {
        console.log('未登錄或正在登出，清空好友列表');
        setFriends([]);
        setLoading(false);
        return;
      }
      
      // 獲取用戶ID
      const userId = getSafeUserId(session);
      console.log('獲取好友列表，用戶ID:', userId);
      
      try {
        // 從API獲取好友列表
        console.log('開始從API獲取好友數據');
        
        // 直接獲取完整的好友角色數據
        const response = await axios.get('/api/user-friends');
        const friendCharacters = response.data || [];
        console.log('API返回好友角色數據:', friendCharacters.length, '個好友');
        
        if (friendCharacters.length === 0) {
          console.log('沒有找到好友，設置空列表');
          setFriends([]);
          setUserData(userId, 'friendsList', []);
          setLoading(false);
          return;
        }
        
        // 檢查返回的數據是否有效
        if (!Array.isArray(friendCharacters)) {
          console.error('API返回的好友數據不是數組:', friendCharacters);
          // 嘗試從本地存儲加載
          const localFriends = getUserData(userId, 'friendsList', []);
          setFriends(localFriends);
          setLoading(false);
          return;
        }
        
        // 處理好友數據，確保格式一致
        const processedFriends = friendCharacters.map(friend => {
          if (!friend || typeof friend !== 'object') {
            console.warn('無效的好友數據:', friend);
            return null;
          }
          
          console.log('處理好友數據:', friend.id, friend.name);
          
          // 確保tags是數組
          let processedTags = [];
          if (friend.tags) {
            if (Array.isArray(friend.tags)) {
              processedTags = friend.tags.map(tag => {
                if (typeof tag === 'string') {
                  return tag;
                } else if (typeof tag === 'object' && tag !== null) {
                  return tag.name || '未知標籤';
                } else {
                  return '未知標籤';
                }
              });
            }
          }
          
          // 添加默認好感度和最後互動時間
          return {
            ...friend,
            tags: processedTags,
            isFriend: true,
            affinity: friend.affinity || 50,
            lastInteraction: friend.addedAt || new Date().toISOString()
          };
        }).filter(Boolean); // 過濾掉無效的好友
        
        console.log('處理後的好友列表:', processedFriends.length, '個好友');
        console.log('好友列表詳情:', processedFriends.map(f => ({ id: f.id, name: f.name })));
        
        setFriends(processedFriends);
        
        // 同時更新本地存儲
        setUserData(userId, 'friendsList', processedFriends);
        console.log('更新本地存儲的好友列表');
        
        // 同時更新myCharacters中的好友狀態
        const myCharacters = getUserData(userId, 'myCharacters', []);
        const updatedCharacters = myCharacters.map(char => {
          const isFriend = processedFriends.some(friend => friend.id === char.id);
          return { ...char, isFriend };
        });
        setUserData(userId, 'myCharacters', updatedCharacters);
        console.log('更新本地存儲的角色列表中的好友狀態');
      } catch (apiError) {
        console.error('API請求失敗:', apiError);
        if (apiError.response) {
          console.error('API錯誤詳情:', apiError.response.data);
          console.error('API錯誤狀態:', apiError.response.status);
        }
        
        // 如果是未授權錯誤且正在登出，則忽略
        if (apiError.response?.status === 401 && window.isLoggingOut) {
          console.log('正在登出，忽略未授權錯誤');
          return;
        }
        
        // 從本地存儲加載
        console.log('嘗試從本地存儲加載好友列表');
        const localFriends = getUserData(userId, 'friendsList', []);
        console.log('本地存儲中的好友:', localFriends.length, '個好友');
        setFriends(localFriends);
      }
    } catch (error) {
      console.error('加載好友列表失敗:', error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  // 載入好友列表
  useEffect(() => {
    fetchFriends();
    
    // 添加頁面可見性變化監聽器
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("好友頁面變為可見，刷新數據");
        fetchFriends();
      }
    };
    
    // 添加路由變化監聽器
    const handleRouteChange = () => {
      console.log("路由變化，刷新好友數據");
      fetchFriends();
    };
    
    // 監聽頁面可見性變化
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 監聽Next.js路由變化
    if (router.events) {
      router.events.on('routeChangeComplete', handleRouteChange);
    }
    
    // 清理函數
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (router.events) {
        router.events.off('routeChangeComplete', handleRouteChange);
      }
    };
  }, []);

  // 根據好感度獲取等級和顏色
  const getAffinityLevel = (value) => {
    if (value >= 90) return { label: "摯愛", color: "#FF54A7" };
    if (value >= 75) return { label: "愛慕", color: "#FF6B8B" };
    if (value >= 60) return { label: "喜歡", color: "#FF986B" };
    if (value >= 45) return { label: "友善", color: "#FFCC6B" };
    if (value >= 30) return { label: "普通", color: "#7DC0FF" };
    if (value >= 15) return { label: "冷淡", color: "#6B83FF" };
    if (value >= 0) return { label: "冷淡", color: "#6B83FF" };
    return { label: "厭惡", color: "#7E6BFF" };
  };

  // 格式化最後互動時間
  const formatLastInteraction = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "今天";
    } else if (diffDays === 1) {
      return "昨天";
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}週前`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months}個月前`;
    }
  };

  // 修改好友選擇處理函數，從跳轉到頁面改為顯示彈出視窗
  const handleFriendSelect = (friendId) => {
    const friend = friends.find(f => f.id === friendId);
    if (friend) {
      setSelectedCharacter(friend);
      setShowModal(true);
    }
  };

  // 關閉模態視窗
  const closeModal = () => {
    setShowModal(false);
    setSelectedCharacter(null);
  };

  // 開始聊天
  const handleStartChat = (characterId) => {
    try {
      console.log(`嘗試開始與角色 ${characterId} 的聊天`);
      
      // 檢查角色是否存在
      const friend = friends.find(f => f.id === characterId);
      if (!friend) {
        console.error(`找不到ID為 ${characterId} 的好友`);
        alert("找不到該角色，請刷新頁面後重試");
        return;
      }
      
      // 檢查 session 是否有效
      if (!session) {
        console.error('未登錄，無法開始聊天');
        alert("請先登入後再開始聊天");
        return;
      }
      
      console.log(`開始與角色 ${friend.name} (${characterId}) 的聊天`);
      
      // 使用 window.location.href 而不是 router.push，以確保頁面完全重新加載
      window.location.href = `/chat/${characterId}`;
    } catch (error) {
      console.error("開始聊天時出錯:", error);
      alert("開始聊天時出錯，請稍後再試");
    }
  };

  // 編輯角色
  const handleEditCharacter = (characterId) => {
    router.push(`/settings?tab=editCharacter&id=${characterId}`);
  };

  // 加入好友 (已經是好友，所以不需要這個功能)
  // 移除好友
  const removeFromFriends = async (e, characterId) => {
    e.stopPropagation(); // 阻止點擊事件傳播到卡片
    
    try {
      if (!session) {
        alert("請先登入！");
        return;
      }
      
      // 獲取用戶ID
      const userId = getSafeUserId(session);
      
      try {
        // 使用API刪除好友關係
        console.log('嘗試從API刪除好友關係:', characterId);
        await axios.delete(`/api/user-friends?characterId=${characterId}`);
        console.log('好友關係已從API刪除');
        
        // 從狀態中移除角色
        setFriends(prev => prev.filter(friend => friend.id !== characterId));
        
        // 更新本地存儲
        const myCharacters = getUserData(userId, 'myCharacters', []);
        const updatedCharacters = myCharacters.map(character => 
          character.id === characterId 
            ? { ...character, isFriend: false } 
            : character
        );
        setUserData(userId, 'myCharacters', updatedCharacters);
        console.log('更新本地存儲的角色列表');
        
        // 更新好友列表
        const friendsList = getUserData(userId, 'friendsList', []);
        const updatedFriendsList = friendsList.filter(friend => friend.id !== characterId);
        setUserData(userId, 'friendsList', updatedFriendsList);
        console.log('更新本地存儲的好友列表');
        
        // 如果當前正在查看該角色的詳情，關閉模態視窗
        if (selectedCharacter && selectedCharacter.id === characterId) {
          closeModal();
        }
        
        alert("已從好友中移除!");
      } catch (apiError) {
        console.error('API刪除好友關係失敗:', apiError);
        
        // 即使API失敗，我們仍然更新本地存儲
        // 從狀態中移除角色
        setFriends(prev => prev.filter(friend => friend.id !== characterId));
        
        // 更新本地存儲
        const myCharacters = getUserData(userId, 'myCharacters', []);
        const updatedCharacters = myCharacters.map(character => 
          character.id === characterId 
            ? { ...character, isFriend: false } 
            : character
        );
        setUserData(userId, 'myCharacters', updatedCharacters);
        
        // 更新好友列表
        const friendsList = getUserData(userId, 'friendsList', []);
        const updatedFriendsList = friendsList.filter(friend => friend.id !== characterId);
        setUserData(userId, 'friendsList', updatedFriendsList);
        
        // 如果當前正在查看該角色的詳情，關閉模態視窗
        if (selectedCharacter && selectedCharacter.id === characterId) {
          closeModal();
        }
        
        alert("已從好友中移除! (本地更新)");
      }
    } catch (error) {
      console.error("移除好友失敗:", error);
      alert("移除好友失敗，請稍後再試");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-xl">載入中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 py-2 bg-gray-800">
        <h1 className="text-xl font-bold">好友</h1>
      </header>

      <div className="flex-grow overflow-y-auto">
        {friends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {friends.map((friend) => {
              const affinityInfo = getAffinityLevel(friend.affinity);
              
              return (
                <div 
                  key={friend.id}
                  className="bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer transition transform hover:scale-105 hover:shadow-xl relative"
                  onClick={() => handleFriendSelect(friend.id)}
                >
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-700 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                      {friend.avatar ? (
                        <img 
                          src={friend.avatar.startsWith('data:') ? friend.avatar : `/img/${friend.avatar}`} 
                          alt={friend.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-500 text-3xl">{friend.name?.[0] || "?"}</div>
                      )}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium">{friend.name}</h3>
                      <p className="text-sm text-gray-400">{friend.job}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between items-center">
                      <span 
                        className="text-sm font-medium" 
                        style={{ color: affinityInfo.color }}
                      >
                        {affinityInfo.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        最後互動: {formatLastInteraction(friend.lastInteraction)}
                      </span>
                    </div>
                    
                    <div className="w-full h-2 bg-gray-600 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ 
                          width: `${friend.affinity}%`, 
                          backgroundColor: affinityInfo.color 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  {/* 添加底部操作區域 */}
                  <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center px-4 pb-3">
                    <span className="text-xs text-gray-400">
                      {friend.creator ? `由 ${typeof friend.creator === 'string' ? friend.creator : (friend.creator?.name || "本地用戶")} 創建` : ''}
                    </span>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 阻止點擊事件傳播到卡片
                        removeFromFriends(e, friend.id);
                      }}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm transition"
                    >
                      移除好友
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 p-4">
            <p className="text-center text-gray-400 mb-6">你還沒有添加好友</p>
            <button 
              onClick={() => router.push("/characters")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              瀏覽角色
            </button>
          </div>
        )}
      </div>

      {/* 角色詳情模態視窗 */}
      {showModal && selectedCharacter && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* 關閉按鈕 */}
            <button 
              onClick={closeModal}
              className="absolute right-4 top-4 text-gray-400 hover:text-white z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 模態視窗內容 */}
            <div className="p-6">
              {/* 角色基本資訊卡片 */}
              <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg mb-6">
                <div className="p-6 flex flex-col md:flex-row gap-6">
                  {/* 角色頭像 */}
                  <div className="w-full md:w-1/3 flex justify-center">
                    <div className="w-48 h-48 bg-gray-700 rounded-full overflow-hidden flex items-center justify-center">
                      {selectedCharacter.avatar ? (
                        <img 
                          src={selectedCharacter.avatar.startsWith('data:') ? selectedCharacter.avatar : `/img/${selectedCharacter.avatar}`} 
                          alt={selectedCharacter.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-500 text-5xl">{selectedCharacter.name?.[0] || "?"}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* 角色基本資訊 */}
                  <div className="w-full md:w-2/3">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-2xl font-bold">{selectedCharacter.name}</h2>
                      <div className="flex gap-2">
                        {/* 不公開標記 */}
                        {selectedCharacter.isPublic === false && (
                          <span className="px-2 py-1 bg-red-600 rounded-full text-xs">不公開</span>
                        )}
                        {/* 性別標籤 */}
                        {selectedCharacter.gender && (
                          <span className="px-2 py-1 bg-purple-600 rounded-full text-xs">{selectedCharacter.gender}</span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-lg text-gray-300 mb-2">{selectedCharacter.job || "無職業"}</p>
                    
                    {/* 標籤列表 */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {/* 顯示標籤 */}
                      {selectedCharacter.tags && selectedCharacter.tags.map((tag, index) => (
                        <span 
                          key={index} 
                          className="px-2 py-1 rounded-full bg-blue-600 text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      
                      {/* 兼容舊版數據 */}
                      {(!selectedCharacter.tags || selectedCharacter.tags.length === 0) && selectedCharacter.tag && selectedCharacter.tag !== "男性" && selectedCharacter.tag !== "女性" && (
                        <span 
                          className="px-2 py-1 rounded-full bg-blue-600 text-xs"
                        >
                          {selectedCharacter.tag}
                        </span>
                      )}
                    </div>
                    
                    {/* 角色台詞 */}
                    {selectedCharacter.quote && (
                      <div className="mb-4 p-3 bg-gray-700 rounded-lg italic text-gray-300 border-l-4 border-blue-500">
                        "{selectedCharacter.quote}"
                      </div>
                    )}
                    
                    {/* 操作按鈕 */}
                    <div className="flex flex-wrap gap-3 mt-4">
                      <button
                        onClick={() => handleStartChat(selectedCharacter.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        開始聊天
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromFriends(e, selectedCharacter.id);
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                        移除好友
                      </button>
                      
                      {/* 只有創建者才能編輯角色 */}
                      {selectedCharacter.creator && currentUser && (
                        typeof selectedCharacter.creator === 'string' ? 
                          selectedCharacter.creator === currentUser.name : 
                          selectedCharacter.creator.id === session?.user?.id
                      ) && (
                        <button
                          onClick={() => handleEditCharacter(selectedCharacter.id)}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          編輯角色
                        </button>
                      )}
                    </div>
                    
                    {/* 在按鈕下方添加作者信息 */}
                    <div className="mt-4 flex flex-col border-t border-gray-700 pt-3">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-gray-300">創建者: <span className="text-blue-400 font-medium">
                          {typeof selectedCharacter.creator === 'string' 
                            ? selectedCharacter.creator 
                            : (selectedCharacter.creator?.name || "本地用戶")}
                        </span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 角色詳細資訊區 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 角色描述 */}
                <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                  <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">角色描述</h3>
                  <p className="text-gray-300 whitespace-pre-line">{selectedCharacter.description || "暫無描述"}</p>
                </div>
                
                {/* 初次見面場景 */}
                <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                  <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">初次見面場景</h3>
                  <p className="text-gray-300 whitespace-pre-line mb-3">{selectedCharacter.firstChatScene || "暫無設定"}</p>
                  {selectedCharacter.firstChatLine && (
                    <div className="p-3 bg-gray-700 rounded-lg italic text-gray-300 border-l-4 border-purple-500">
                      "{selectedCharacter.firstChatLine}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
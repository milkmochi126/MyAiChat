import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getSafeUserId, getUserData, setUserData } from "../../utils/userStorage";
import axios from "axios";

export default function CharacterDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchCharacter = async () => {
      try {
        setLoading(true);
        
        if (!session) {
          console.log('未登錄，無法獲取角色數據');
          alert("請先登入以查看角色詳情");
          router.push("/");
          return;
        }
        
        // 獲取用戶ID
        const userId = getSafeUserId(session);
        console.log('獲取角色詳情，用戶ID:', userId, '角色ID:', id);
        
        try {
          // 直接從API獲取角色數據
          const response = await axios.get(`/api/characters/${id}`);
          const apiCharacter = response.data;
          console.log('從API獲取到角色:', apiCharacter.name);
          
          // 檢查是否是好友
          let isFriendStatus = apiCharacter.isFriend === true;
          
          // 如果API沒有返回好友狀態，嘗試從用戶好友列表中檢查
          if (isFriendStatus === undefined) {
            try {
              // 獲取用戶好友列表
              const friendsResponse = await axios.get('/api/user-friends');
              const friends = friendsResponse.data || [];
              
              // 檢查角色是否在好友列表中
              isFriendStatus = friends.some(friend => friend.id === id);
              console.log('從好友列表檢查好友狀態:', isFriendStatus);
            } catch (friendsError) {
              console.error('獲取好友列表失敗:', friendsError);
              
              // 如果API請求失敗，嘗試從本地存儲檢查
              const localFriends = getUserData(userId, 'friendsList', []);
              isFriendStatus = localFriends.some(friend => friend.id === id);
              console.log('從本地存儲檢查好友狀態:', isFriendStatus);
            }
          }
          
          // 設置角色數據和好友狀態
          setCharacter(apiCharacter);
          setIsFriend(isFriendStatus);
          
          // 更新本地存儲
          const myCharacters = getUserData(userId, 'myCharacters', []);
          const characterExists = myCharacters.some(char => char.id === id);
          
          if (characterExists) {
            // 更新現有角色
            const updatedCharacters = myCharacters.map(char => {
              if (char.id === id) {
                return { ...apiCharacter, isFriend: isFriendStatus };
              }
              return char;
            });
            setUserData(userId, 'myCharacters', updatedCharacters);
          } else {
            // 添加新角色
            const updatedCharacters = [...myCharacters, { ...apiCharacter, isFriend: isFriendStatus }];
            setUserData(userId, 'myCharacters', updatedCharacters);
          }
          
          // 如果是好友，確保好友列表中有此角色
          if (isFriendStatus) {
            const friendsList = getUserData(userId, 'friendsList', []);
            if (!friendsList.some(friend => friend.id === id)) {
              const updatedFriendsList = [...friendsList, {
                ...apiCharacter,
                isFriend: true,
                addedAt: new Date().toISOString(),
                affinity: 50
              }];
              setUserData(userId, 'friendsList', updatedFriendsList);
            }
          }
        } catch (apiError) {
          console.error('API請求失敗:', apiError);
          
          // 如果API請求失敗，嘗試從本地存儲獲取
          const myCharacters = getUserData(userId, 'myCharacters', []);
          const foundCharacter = myCharacters.find(char => char.id === id);
          
          if (foundCharacter) {
            console.log('從本地存儲找到角色:', foundCharacter.name);
            setCharacter(foundCharacter);
            setIsFriend(foundCharacter.isFriend === true);
          } else {
            console.log('未找到角色');
            alert("未找到此角色");
            router.push("/characters");
          }
        }
      } catch (error) {
        console.error("獲取角色詳情失敗:", error);
        alert("獲取角色詳情失敗，請稍後再試");
        router.push("/characters");
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [id, router, session]);

  const handleStartChat = () => {
    router.push(`/chat/${id}`);
  };

  const handleEditCharacter = () => {
    router.push(`/settings?tab=editCharacter&id=${id}`);
  };

  const toggleFriend = async () => {
    try {
      if (!session) {
        alert("請先登入！");
        return;
      }
      
      // 顯示加載狀態
      setLoading(true);
      
      // 獲取用戶ID
      const userId = getSafeUserId(session);
      console.log('切換好友狀態，用戶ID:', userId, '角色ID:', id, '當前狀態:', isFriend);
      
      try {
        if (!isFriend) {
          // 添加好友
          console.log('嘗試添加好友...');
          const response = await axios.post('/api/user-friends', { 
            characterId: id 
          });
          console.log('添加好友API響應:', response.data);
          
          // 更新UI狀態
          setIsFriend(true);
          setCharacter(prev => ({ ...prev, isFriend: true }));
          
          // 更新本地存儲
          const myCharacters = getUserData(userId, 'myCharacters', []);
          const updatedCharacters = myCharacters.map(char => 
            char.id === id ? { ...char, isFriend: true } : char
          );
          
          // 如果角色不在列表中，添加它
          if (!myCharacters.some(char => char.id === id)) {
            updatedCharacters.push({
              ...character,
              isFriend: true
            });
          }
          setUserData(userId, 'myCharacters', updatedCharacters);
          console.log('本地存儲已更新，角色列表長度:', updatedCharacters.length);
          
          // 更新好友列表
          const friendsList = getUserData(userId, 'friendsList', []);
          if (!friendsList.some(friend => friend.id === id)) {
            const updatedFriendsList = [...friendsList, {
              ...character,
              isFriend: true,
              addedAt: new Date().toISOString(),
              affinity: 50
            }];
            setUserData(userId, 'friendsList', updatedFriendsList);
            console.log('本地存儲已更新，好友列表長度:', updatedFriendsList.length);
          }
          
          alert("已加入好友!");
        } else {
          // 移除好友
          console.log('嘗試移除好友...');
          const response = await axios.delete(`/api/user-friends?characterId=${id}`);
          console.log('移除好友API響應:', response.data);
          
          // 更新UI狀態
          setIsFriend(false);
          setCharacter(prev => ({ ...prev, isFriend: false }));
          
          // 更新本地存儲
          const myCharacters = getUserData(userId, 'myCharacters', []);
          const updatedCharacters = myCharacters.map(char => 
            char.id === id ? { ...char, isFriend: false } : char
          );
          setUserData(userId, 'myCharacters', updatedCharacters);
          console.log('本地存儲已更新，角色列表長度:', updatedCharacters.length);
          
          // 更新好友列表
          const friendsList = getUserData(userId, 'friendsList', []);
          const updatedFriendsList = friendsList.filter(friend => friend.id !== id);
          setUserData(userId, 'friendsList', updatedFriendsList);
          console.log('本地存儲已更新，好友列表長度:', updatedFriendsList.length);
          
          alert("已從好友中移除!");
        }
        
        // 刷新好友列表
        try {
          console.log('刷新好友列表...');
          const refreshResponse = await axios.get('/api/user-friends');
          console.log('刷新好友列表API響應:', refreshResponse.data);
        } catch (refreshError) {
          console.error('刷新好友列表失敗:', refreshError);
        }
      } catch (apiError) {
        console.error('API操作失敗:', apiError);
        if (apiError.response) {
          console.error('API錯誤詳情:', apiError.response.data);
        }
        alert("更新好友狀態失敗，請稍後再試");
      }
    } catch (error) {
      console.error("更新好友狀態失敗:", error);
      alert("更新好友狀態失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push("/characters");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">未找到角色</h1>
        <Link href="/characters" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition">
          返回角色列表
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {/* 頂部導航 */}
      <header className="px-4 py-3 bg-gray-800 flex justify-between items-center">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-300 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回
        </button>
        
        <h1 className="text-xl font-bold">角色詳情</h1>
        
        <div className="w-16">
          {/* 可以在此添加其他操作按鈕 */}
        </div>
      </header>

      {/* 主要內容 */}
      <div className="flex-grow p-4 md:p-6 max-w-4xl mx-auto w-full">
        {/* 角色基本資訊卡片 */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg mb-6">
          <div className="p-6 flex flex-col md:flex-row gap-6">
            {/* 角色頭像 */}
            <div className="w-full md:w-1/3 flex justify-center">
              <div className="w-48 h-48 bg-gray-700 rounded-full overflow-hidden flex items-center justify-center">
                {character.avatar ? (
                  <img 
                    src={character.avatar.startsWith('data:') ? character.avatar : `/img/${character.avatar}`} 
                    alt={character.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-500 text-5xl">{character.name?.[0] || "?"}</div>
                )}
              </div>
            </div>
            
            {/* 角色基本資訊 */}
            <div className="w-full md:w-2/3">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold">{character.name}</h2>
                <div className="flex gap-2">
                  {/* 不公開標記 */}
                  {character.isPublic === false && (
                    <span className="px-2 py-1 bg-red-600 rounded-full text-xs">不公開</span>
                  )}
                  {/* 性別標籤 */}
                  {character.gender && (
                    <span className="px-2 py-1 bg-purple-600 rounded-full text-xs">{character.gender}</span>
                  )}
                </div>
              </div>
              
              <p className="text-lg text-gray-300 mb-2">{character.job || "無職業"}</p>
              
              {/* 標籤列表 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {/* 顯示標籤 */}
                {character.tags && Array.isArray(character.tags) && character.tags.map((tag, index) => {
                  // 確保標籤有正確的格式
                  let tagName = null;
                  
                  if (typeof tag === 'string') {
                    tagName = tag;
                  } else if (tag && typeof tag === 'object') {
                    tagName = tag.name || null;
                  }
                  
                  // 只渲染有效的標籤
                  return tagName ? (
                    <span 
                      key={index} 
                      className="px-2 py-1 rounded-full bg-blue-600 text-xs"
                    >
                      {tagName}
                    </span>
                  ) : null;
                })}
                
                {/* 兼容舊版數據 */}
                {(!character.tags || !Array.isArray(character.tags) || character.tags.length === 0) && character.tag && character.tag !== "男性" && character.tag !== "女性" && (
                  <span 
                    className="px-2 py-1 rounded-full bg-blue-600 text-xs"
                  >
                    {character.tag}
                  </span>
                )}
              </div>
              
              {/* 角色台詞 */}
              {character.quote && (
                <div className="mb-4 p-3 bg-gray-700 rounded-lg italic text-gray-300 border-l-4 border-blue-500">
                  "{character.quote}"
                </div>
              )}
              
              {/* 操作按鈕 */}
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={handleStartChat}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md transition flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                  開始聊天
                </button>
                
                <button
                  onClick={toggleFriend}
                  className={`px-4 py-2 ${isFriend ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} rounded-md transition flex items-center`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  {isFriend ? '移除好友' : '加為好友'}
                </button>
                
                <button
                  onClick={handleEditCharacter}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  編輯角色
                </button>
              </div>
              
              {/* 在按鈕下方添加作者信息 */}
              <div className="mt-4 flex flex-col border-t border-gray-700 pt-3">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-gray-300">創建者: <span className="text-blue-400 font-medium">{typeof character.creator === 'string' ? character.creator : (character.creator?.name || "本地用戶")}</span></p>
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-300">創建時間: <span className="text-blue-400 font-medium">{character.createdAt ? new Date(character.createdAt).toLocaleDateString() : "未知"}</span></p>
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
            <p className="text-gray-300 whitespace-pre-line">{character.description || "暫無描述"}</p>
          </div>
          
          {/* 初次見面場景 */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h3 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">初次見面場景</h3>
            <p className="text-gray-300 whitespace-pre-line mb-3">{character.firstChatScene || "暫無設定"}</p>
            {character.firstChatLine && (
              <div className="p-3 bg-gray-700 rounded-lg italic text-gray-300 border-l-4 border-purple-500">
                "{character.firstChatLine}"
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
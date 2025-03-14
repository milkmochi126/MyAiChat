import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import axios from "axios";
import { getSafeUserId, getUserData, setUserData } from "../utils/userStorage";

export default function Characters() {
  const { data: session } = useSession();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [availableTags, setAvailableTags] = useState([]);
  const [showPrivate, setShowPrivate] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();

  // 載入角色列表
  const loadCharacters = async () => {
    try {
      setLoading(true);
      
      if (!session) {
        console.log('未登錄，清空角色列表');
        setCharacters([]);
        setLoading(false);
        return;
      }
      
      const userId = getSafeUserId(session);
      
      // 加載用戶的角色
      try {
        // 加載用戶好友列表作為預處理
        let userFriends = [];
        try {
          const friendsResponse = await axios.get('/api/user-friends');
          userFriends = friendsResponse.data;
          console.log('成功加載用戶好友列表:', userFriends.length);
        } catch (friendsError) {
          console.error('加載用戶好友列表失敗:', friendsError);
        }
        
        // 從API加載自己的角色
        const myResponse = await axios.get('/api/characters?type=my');
        let myCharactersData = myResponse.data;
        
        console.log('成功加載我的角色:', myCharactersData.length);
        
        // 標記我的角色
        myCharactersData = myCharactersData.map(char => ({
          ...char,
          isMine: true
        }));
        
        // 保存我的角色到臨時變量
        const allCharacters = [...myCharactersData];
        
        // 從API加載公開角色
        const publicResponse = await axios.get('/api/public-characters');
        let publicCharactersData = publicResponse.data;
        
        console.log('成功加載公開角色:', publicCharactersData.length);
        
        // 標記已添加的角色
        publicCharactersData = publicCharactersData.map(c => ({
          ...c,
          isFriend: userFriends.some(f => f.characterId === c.id)
        }));
        
        // 過濾掉已經在「我的角色」中的角色，避免重複顯示
        publicCharactersData = publicCharactersData.filter(c => !c.isMine);
        
        // 合併我的角色和公開角色
        setCharacters([...allCharacters, ...publicCharactersData]);
      } catch (apiError) {
        console.error('API請求失敗:', apiError);
        
        if (apiError.response?.status === 401) {
          console.log('未授權，可能是會話已過期');
          alert('您的登入狀態已過期，請重新登入。');
          return;
        }
        
        alert('無法從伺服器加載角色數據，請檢查網路連接或重新登入。');
        setCharacters([]);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('加載角色列表失敗:', error);
      setCharacters([]);
    }
  };

  useEffect(() => {
    loadCharacters();
  }, [session]);

  // 獲取當前用戶資料
  useEffect(() => {
    if (session) {
      const userId = getSafeUserId(session);
      const storedProfile = getUserData(userId, 'userProfile', null);
      
      if (storedProfile) {
        setCurrentUser(storedProfile);
      } else {
        // 如果沒有本地存儲的個人資料，則使用會話中的資料
        const defaultProfile = {
          name: session.user.name || '用戶',
          email: session.user.email || '',
          avatar: session.user.image || ''
        };
        setCurrentUser(defaultProfile);
        
        // 保存到本地存儲
        setUserData(userId, 'userProfile', defaultProfile);
      }
    } else {
      setCurrentUser(null);
    }
  }, [session]);

  // 篩選和搜尋角色
  const filteredCharacters = characters.filter(character => {
    // 再依據搜尋關鍵字篩選
    const matchesSearch = 
      character.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      character.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      character.job?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      character.tags?.some(tag => {
        // 確保 tag.name 存在
        const tagName = typeof tag === 'string' ? tag : (tag && tag.name ? tag.name : '');
        return tagName.toLowerCase().includes(searchQuery.toLowerCase());
      });
    
    // 再依據標籤篩選
    if (selectedFilter === "all") {
      return matchesSearch;
    } else if (selectedFilter === "male") {
      return matchesSearch && character.gender === "男性";
    } else if (selectedFilter === "female") {
      return matchesSearch && character.gender === "女性";
    } else if (selectedFilter === "other") {
      return matchesSearch && character.gender === "其他";
    } else {
      // 動態標籤篩選
      return matchesSearch && (
        (character.tags && character.tags.some(tag => {
          // 確保 tag.name 存在
          const tagName = typeof tag === 'string' ? tag : (tag && tag.name ? tag.name : '');
          return tagName === selectedFilter;
        })) || 
        character.tag === selectedFilter
      );
    }
  });

  const handleCharacterSelect = (characterId) => {
    try {
      console.log('選中角色:', characterId);
      
      if (!characterId) {
        console.error('無效的角色ID');
        return;
      }
      
      const character = characters.find(c => c && c.id === characterId);
      
      if (!character) {
        console.error('未找到選中的角色:', characterId);
        return;
      }
      
      console.log('找到選中的角色:', character.name);
      
      // 創建一個深拷貝，避免修改原始數據
      const characterCopy = JSON.parse(JSON.stringify(character));
      
      // 確保角色數據格式正確
      if (!characterCopy.tags) {
        characterCopy.tags = [];
      } else if (!Array.isArray(characterCopy.tags)) {
        console.warn(`角色 ${characterCopy.id} 的tags不是數組:`, characterCopy.tags);
        characterCopy.tags = [];
      }
      
      // 確保每個標籤都有 name 屬性
      characterCopy.tags = characterCopy.tags.map(tag => {
        if (typeof tag === 'string') {
          return { name: tag };
        } else if (typeof tag === 'object' && tag !== null) {
          return { name: tag.name || '未知標籤' };
        } else {
          return { name: '未知標籤' };
        }
      });
      
      setSelectedCharacter(characterCopy);
      setShowModal(true);
    } catch (error) {
      console.error('選中角色時出錯:', error);
    }
  };

  // 加入好友
  const addFriend = async (character) => {
    try {
      if (!session) {
        alert('請先登入');
        return;
      }
      
      const userId = getSafeUserId(session);
      
      // 添加到我的好友
      await axios.post('/api/user-friends', {
        characterId: character.id
      });
      
      // 更新公開角色列表，標記已添加的角色
      setCharacters(prevCharacters => 
        prevCharacters.map(c => 
          c.id === character.id 
            ? { ...c, isFriend: true } 
            : c
        )
      );
      
      console.log(`已將 ${character.name} 添加為好友`);
    } catch (error) {
      console.error('添加好友失敗:', error);
      alert('添加好友失敗，請重試');
    }
  };

  // 移除好友
  const removeFriend = async (character) => {
    try {
      if (!session) {
        alert('請先登入');
        return;
      }
      
      const userId = getSafeUserId(session);
      
      // 從API移除好友 - 修正 URL 格式
      await axios.delete(`/api/user-friends?characterId=${character.id}`);
      
      // 更新公開角色列表，移除標記
      setCharacters(prevCharacters => 
        prevCharacters.map(c => 
          c.id === character.id 
            ? { ...c, isFriend: false } 
            : c
        )
      );
      
      console.log(`已將 ${character.name} 從好友中移除`);
    } catch (error) {
      console.error('移除好友失敗:', error);
      alert('移除好友失敗，請重試');
    }
  };

  // 更新角色的公開/私有狀態
  const togglePublic = async (character) => {
    try {
      if (!session) {
        alert('請先登入');
        return;
      }
      
      // 調用API更新角色的公開狀態
      await axios.put(`/api/characters/${character.id}`, {
        isPublic: !character.isPublic
      });
      
      // 更新本地角色列表
      setCharacters(prev => 
        prev.map(c => 
          c.id === character.id 
            ? { ...c, isPublic: !c.isPublic } 
            : c
        )
      );
      
      console.log(`已更新角色 ${character.name} 的公開狀態為: ${!character.isPublic ? '公開' : '私有'}`);
    } catch (error) {
      console.error('更新角色公開狀態失敗:', error);
      alert('更新失敗，請重試');
    }
  };

  // 刪除角色
  const deleteCharacter = async (character) => {
    try {
      if (!session) {
        alert('請先登入');
        return;
      }
      
      // 確認刪除
      if (!window.confirm(`確定要刪除 ${character.name} 嗎？此操作不可撤銷，相關聊天記錄會保留但將無法繼續對話。`)) {
        return;
      }
      
      const userId = getSafeUserId(session);
      
      // 從API刪除角色
      await axios.delete(`/api/characters/${character.id}`);
      
      // 更新角色列表
      setCharacters(prev => prev.filter(c => c.id !== character.id));
      
      console.log(`已刪除角色: ${character.name}`);
    } catch (error) {
      console.error('刪除角色失敗:', error);
      alert('刪除角色失敗，請重試');
    }
  };

  // 關閉模態視窗
  const closeModal = () => {
    console.log('關閉角色詳情模態視窗');
    setShowModal(false);
    // 延遲清除選中的角色，避免模態視窗關閉時的閃爍
    setTimeout(() => {
      setSelectedCharacter(null);
    }, 300);
  };

  // 開始聊天
  const handleStartChat = (characterId) => {
    router.push(`/chat/${characterId}`);
  };

  // 編輯角色
  const handleEditCharacter = (characterId) => {
    router.push(`/settings?tab=editCharacter&id=${characterId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 py-3 bg-gray-800 flex flex-col md:flex-row md:items-center gap-3">
        <h1 className="text-xl font-bold">角色列表</h1>
        
        <div className="relative flex-grow md:max-w-md">
          <input
            type="text"
            className="w-full px-4 py-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="搜尋角色..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400"
            onClick={() => setSearchQuery("")}
          >
            {searchQuery && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 md:ml-2">
          <button 
            className={`px-3 py-1 rounded-full text-sm ${selectedFilter === 'all' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setSelectedFilter("all")}
          >
            全部
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-sm ${selectedFilter === 'male' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setSelectedFilter("male")}
          >
            男性
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-sm ${selectedFilter === 'female' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setSelectedFilter("female")}
          >
            女性
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-sm ${selectedFilter === 'other' ? 'bg-blue-600' : 'bg-gray-700'}`}
            onClick={() => setSelectedFilter("other")}
          >
            其他
          </button>
          
          {/* 動態生成標籤篩選按鈕 */}
          {availableTags.map(tag => (
            <button 
              key={tag}
              className={`px-3 py-1 rounded-full text-sm ${selectedFilter === tag ? 'bg-blue-600' : 'bg-gray-700'}`}
              onClick={() => setSelectedFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-grow overflow-y-auto p-4">
        {filteredCharacters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map((character) => (
              <div 
                key={character.id}
                onClick={() => handleCharacterSelect(character.id)} 
                className="bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer transition transform hover:scale-105 hover:shadow-xl"
              >
                <div className="p-4 flex flex-col">
                  <div className="flex items-start mb-4">
                    {/* 角色頭像 - 改為圓形 */}
                    <div className="w-20 h-20 bg-gray-700 rounded-full overflow-hidden flex-shrink-0 mr-4">
                      {character.avatar ? (
                        <img 
                          src={character.avatar.startsWith('data:') ? 
                               character.avatar : 
                               (character.avatar.startsWith('http') ? 
                                character.avatar : 
                                `/img/${character.avatar}`)}
                          alt={character.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('頭像加載失敗:', character.avatar);
                            e.target.onerror = null;
                            e.target.src = '/img/default-avatar.svg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <span className="text-2xl">{character.name?.[0] || "?"}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 角色信息 */}
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold">{character.name}</h3>
                      </div>
                      <p className="text-sm text-gray-300">{character.job}</p>
                      
                      {/* 顯示標籤 */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {/* 顯示性別標籤 */}
                        {character.gender && (
                          <span 
                            className="text-xs px-2 py-1 rounded-full bg-purple-600 whitespace-nowrap"
                          >
                            {character.gender}
                          </span>
                        )}
                        
                        {/* 確保標籤是數組並且每個標籤都有正確的格式 */}
                        {Array.isArray(character.tags) && character.tags.map((tag, index) => {
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
                              className="text-xs px-2 py-1 rounded-full bg-blue-600 whitespace-nowrap"
                            >
                              {tagName}
                            </span>
                          ) : null;
                        })}
                        
                        {/* 兼容舊版數據，如果沒有tags但有tag字段 */}
                        {(!character.tags || !Array.isArray(character.tags) || character.tags.length === 0) && 
                         character.tag && 
                         typeof character.tag === 'string' && 
                         character.tag !== "男性" && 
                         character.tag !== "女性" && (
                          <span 
                            className="text-xs px-2 py-1 rounded-full bg-blue-600 whitespace-nowrap"
                          >
                            {character.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 角色描述 */}
                  <p className="text-sm text-gray-300 line-clamp-3 mb-4">
                    {character.description}
                  </p>
                  
                  <div className="mt-auto flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      由 {typeof character.creator === 'string' ? character.creator : (character.creator?.name || "本地用戶")} 創建
                    </span>
                    
                    <div className="flex space-x-2">
                      {character.isFriend ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 阻止事件冒泡
                            removeFriend(character);
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm transition"
                        >
                          移除好友
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 阻止事件冒泡
                            addFriend(character);
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm transition"
                        >
                          加為好友
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            {characters.length > 0 ? (
              <p className="text-gray-400 mb-4">無符合對象</p>
            ) : (
              <>
                <p className="text-gray-400 mb-4">
                  暫無角色，您可以創建第一個角色
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => router.push('/settings?tab=newCharacter')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition"
                  >
                    創建角色
                  </button>
                </div>
              </>
            )}
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
                          src={selectedCharacter.avatar.startsWith('data:') ? 
                               selectedCharacter.avatar : 
                               (selectedCharacter.avatar.startsWith('http') ? 
                                selectedCharacter.avatar : 
                                `/img/${selectedCharacter.avatar}`)}
                          alt={selectedCharacter.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.log('頭像加載失敗:', selectedCharacter.avatar);
                            e.target.onerror = null;
                            e.target.src = '/img/default-avatar.svg';
                          }}
                        />
                      ) : (
                        <div className="text-gray-500 text-5xl">{selectedCharacter.name?.[0] || "?"}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* 角色基本資訊 */}
                  <div className="w-full md:w-2/3">
                    <div className="flex flex-col p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div className="flex justify-between items-start mb-2">
                          <h2 className="text-2xl font-bold">{selectedCharacter.name}</h2>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {/* 性別標籤 */}
                          {selectedCharacter.gender && typeof selectedCharacter.gender === 'string' && (
                            <span className="px-2 py-1 bg-purple-600 rounded-full text-xs">{selectedCharacter.gender}</span>
                          )}
                          
                          {/* 標籤 */}
                          {Array.isArray(selectedCharacter.tags) && selectedCharacter.tags.map((tag, index) => {
                            // 確保標籤有正確的格式
                            let tagName = null;
                            
                            if (typeof tag === 'string') {
                              tagName = tag;
                            } else if (tag && typeof tag === 'object') {
                              tagName = tag.name || null;
                            }
                            
                            // 只渲染有效的標籤
                            return tagName ? (
                              <span key={index} className="px-2 py-1 bg-blue-600 rounded-full text-xs">
                                {tagName}
                              </span>
                            ) : null;
                          })}
                          
                          {/* 兼容性處理 */}
                          {(!selectedCharacter.tags || !Array.isArray(selectedCharacter.tags) || selectedCharacter.tags.length === 0) && 
                           selectedCharacter.tag && 
                           typeof selectedCharacter.tag === 'string' && 
                           selectedCharacter.tag !== "男性" && 
                           selectedCharacter.tag !== "女性" && (
                            <span className="px-2 py-1 bg-blue-600 rounded-full text-xs">{selectedCharacter.tag}</span>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-300 mb-6">{selectedCharacter.job}</p>
                      
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
                          onClick={async () => {
                            try {
                              if (!session) {
                                alert("請先登入！");
                                return;
                              }
                              
                              const userId = getSafeUserId(session);
                              
                              if (!selectedCharacter.isFriend) {
                                // 添加好友
                                const response = await axios.post('/api/user-friends', { 
                                  characterId: selectedCharacter.id 
                                });
                                
                                if (response.status === 200 || response.status === 201) {
                                  // 更新前端狀態
                                  const updatedCharacters = characters.map(char => {
                                    if (char.id === selectedCharacter.id) {
                                      return { ...char, isFriend: true };
                                    }
                                    return char;
                                  });
                                  
                                  // 更新頁面狀態
                                  setCharacters(updatedCharacters);
                                  setSelectedCharacter({
                                    ...selectedCharacter,
                                    isFriend: true
                                  });
                                  
                                  // 更新用戶存儲
                                  // 更新角色列表中的好友狀態
                                  const myCharacters = getUserData(userId, 'myCharacters', []);
                                  const updatedMyCharacters = myCharacters.map(char => 
                                    char.id === selectedCharacter.id ? { ...char, isFriend: true } : char
                                  );
                                  setUserData(userId, 'myCharacters', updatedMyCharacters);
                                  
                                  // 更新好友列表
                                  const friendsList = getUserData(userId, 'friendsList', []);
                                  if (!friendsList.some(f => f.id === selectedCharacter.id)) {
                                    const updatedFriendsList = [...friendsList, {
                                      ...selectedCharacter,
                                      isFriend: true,
                                      addedAt: new Date().toISOString(),
                                      affinity: 50
                                    }];
                                    setUserData(userId, 'friendsList', updatedFriendsList);
                                  }
                                  
                                  alert("已加入好友!");
                                }
                              } else {
                                // 移除好友
                                await axios.delete(`/api/user-friends?characterId=${selectedCharacter.id}`);
                                
                                // 更新前端狀態
                                const updatedCharacters = characters.map(char => {
                                  if (char.id === selectedCharacter.id) {
                                    return { ...char, isFriend: false };
                                  }
                                  return char;
                                });
                                
                                // 更新頁面狀態
                                setCharacters(updatedCharacters);
                                setSelectedCharacter({
                                  ...selectedCharacter,
                                  isFriend: false
                                });
                                
                                // 更新用戶存儲
                                // 更新角色列表中的好友狀態
                                const myCharacters = getUserData(userId, 'myCharacters', []);
                                const updatedMyCharacters = myCharacters.map(char => 
                                  char.id === selectedCharacter.id ? { ...char, isFriend: false } : char
                                );
                                setUserData(userId, 'myCharacters', updatedMyCharacters);
                                
                                // 更新好友列表
                                const friendsList = getUserData(userId, 'friendsList', []);
                                const updatedFriendsList = friendsList.filter(friend => friend.id !== selectedCharacter.id);
                                setUserData(userId, 'friendsList', updatedFriendsList);
                                
                                alert("已從好友中移除!");
                              }
                            } catch (error) {
                              console.error("更新好友狀態失敗:", error);
                              alert("更新好友狀態失敗，請稍後再試");
                            }
                          }}
                          className={`px-4 py-2 ${selectedCharacter.isFriend ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} rounded-md transition flex items-center`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                          {selectedCharacter.isFriend ? '移除好友' : '加為好友'}
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
                          <p className="text-gray-300">創建者: <span className="text-blue-400 font-medium">{typeof selectedCharacter.creator === 'string' ? selectedCharacter.creator : (selectedCharacter.creator?.name || "本地用戶")}</span></p>
                        </div>
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
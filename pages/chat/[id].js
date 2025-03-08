import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatPage = () => {
  const router = useRouter();
  const { id, type } = router.query;
  const { data: session } = useSession();
  const [character, setCharacter] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [affinity, setAffinity] = useState(0);
  const [currentModel, setCurrentModel] = useState('gemini');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // 添加當前使用模型狀態和API金鑰狀態
  const [apiKey, setApiKey] = useState(null);
  const [apiKeys, setApiKeys] = useState({
    gpt: "",
    claude: "",
    gemini: ""
  });

  // 滾動到底部
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  
  useEffect(() => {
    if (id && session) {
      loadChat();
    }
  }, [id, session]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 載入聊天數據
  const loadChat = async () => {
    try {
      setLoading(true);
      
      if (!session) {
        console.log("未登錄，無法載入聊天");
        setLoading(false);
        return;
      }
      
      console.log(`嘗試載入ID: ${id} 的聊天數據，類型: ${type || 'character'}`);
      
      // 判斷是通過角色ID還是聊天ID進入
      const isChatId = type === 'chat';
      
      if (isChatId) {
        // 通過聊天ID直接獲取聊天數據
        console.log(`通過聊天ID獲取數據: ${id}`);
        try {
          const chatResponse = await axios.get(`/api/chats/${id}`);
          const chatData = chatResponse.data;
          
          // 設置聊天ID
          setCurrentChatId(id);
          
          // 設置好感度
          setAffinity(chatData.affinity || 0);
          
          // 如果聊天有關聯的角色，設置角色數據
          if (chatData.character) {
            console.log(`聊天關聯的角色: ${chatData.character.name}`);
            setCharacter({
              ...chatData.character,
              isDeleted: chatData.character.isDeleted || !chatData.character.id
            });
          } else if (chatData.characterName) {
            // 如果沒有關聯的角色，但有角色名稱，創建一個已刪除的角色對象
            console.log(`聊天關聯的角色已刪除: ${chatData.characterName}`);
            setCharacter({
              id: null,
              name: chatData.characterName,
              avatar: null,
              job: null,
              isDeleted: true
            });
          } else {
            console.error("聊天沒有關聯的角色信息");
            setLoading(false);
            return;
          }
          
          // 設置聊天記錄
          if (chatData.messages && chatData.messages.length > 0) {
            console.log(`載入 ${chatData.messages.length} 條聊天記錄`);
            setMessages(chatData.messages);
          } else {
            console.log("沒有找到聊天記錄");
            setMessages([]);
          }
          
          setLoading(false);
          return;
        } catch (error) {
          console.error("獲取聊天數據失敗:", error);
          setLoading(false);
          return;
        }
      }
      
      // 以下是通過角色ID獲取數據的原有邏輯
      console.log(`嘗試從API獲取角色數據: ${id}`);
      try {
        const characterResponse = await axios.get(`/api/characters/${id}`);
        const characterData = characterResponse.data;
        
        if (!characterData) {
          console.log("API返回了空的角色數據");
          // 不立即跳轉，而是嘗試從聊天記錄中獲取角色信息
          console.log("嘗試從聊天記錄中獲取角色信息");
        } else {
          console.log(`成功獲取角色數據: ${characterData.name}`);
          setCharacter(characterData);
        }
        
        // 查找或創建與該角色的聊天
        let chatData;
        try {
          // 查找現有聊天
          console.log(`嘗試獲取用戶的所有聊天`);
          const chatsResponse = await axios.get('/api/chats');
          const chats = chatsResponse.data;
          console.log(`獲取到 ${chats.length} 個聊天`);
          
          const existingChat = chats.find(chat => chat.characterId === id);
          console.log(`是否找到與角色 ${id} 的現有聊天: ${!!existingChat}`);
          
          if (existingChat) {
            // 獲取聊天詳情
            console.log(`嘗試獲取聊天詳情: ${existingChat.id}`);
            const chatDetailResponse = await axios.get(`/api/chats/${existingChat.id}`);
            chatData = chatDetailResponse.data;
            setAffinity(chatData.affinity || 0);
            
            // 如果角色已被刪除，但聊天記錄中有角色信息
            if (!characterData && chatData.character && chatData.character.isDeleted) {
              console.log(`角色已被刪除，使用聊天記錄中的角色信息: ${chatData.character.name}`);
              setCharacter({
                ...chatData.character,
                isDeleted: true
              });
            }
            
            // 設置聊天記錄
            if (chatData.messages && chatData.messages.length > 0) {
              console.log(`載入 ${chatData.messages.length} 條聊天記錄`);
              setMessages(chatData.messages);
            } else {
              // 如果沒有消息，創建初始消息
              console.log(`沒有找到聊天記錄，創建初始消息`);
              const characterName = characterData?.name || chatData.character?.name || "此角色";
              const initialMessage = {
                role: 'assistant',
                content: `你好，我是${characterName}。很高興認識你！`
              };
              setMessages([initialMessage]);
            }
          } else {
            // 創建新聊天
            console.log(`沒有找到現有聊天，創建新聊天`);
            const newChatResponse = await axios.post('/api/chats', { characterId: id });
            chatData = newChatResponse.data;
            setAffinity(0);
            
            // 創建初始消息
            console.log(`創建初始消息`);
            const characterName = characterData?.name || "此角色";
            let initialMessage = {
              role: 'assistant',
              content: `你好，我是${characterName}。很高興認識你！`
            };
            
            // 如果角色有自定義的初始消息，則使用它
            if (characterData?.firstChatLine) {
              initialMessage.content = characterData.firstChatLine;
            } else if (characterData?.firstChatScene) {
              initialMessage.content = characterData.firstChatScene;
            }
            
            setMessages([initialMessage]);
            
            // 保存初始消息
            console.log(`保存初始消息到數據庫`);
            await saveMessage("assistant", initialMessage.content);
          }
          
          // 設置當前聊天ID
          setCurrentChatId(chatData.id);
          console.log(`設置當前聊天ID: ${chatData.id}`);
        } catch (error) {
          console.error("獲取或創建聊天失敗:", error);
        }
      } catch (error) {
        console.error("獲取角色數據失敗:", error);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("載入聊天數據失敗:", error);
      setLoading(false);
    }
  };

  // 保存消息到數據庫
  const saveMessage = async (role, content, model = currentModel) => {
    if (!currentChatId) return;
    
    try {
      const response = await axios.post('/api/messages', {
        chatId: currentChatId,
        role,
        content,
        model
      });
      console.log('已保存消息到數據庫:', role);
      return response.data;
    } catch (error) {
      console.error('保存消息失敗:', error);
      // 顯示更詳細的錯誤信息
      if (error.response) {
        // 服務器回應了錯誤
        console.error('錯誤狀態:', error.response.status);
        console.error('錯誤數據:', error.response.data);
      } else if (error.request) {
        // 請求已發送但沒有收到回應
        console.error('沒有收到回應:', error.request);
      } else {
        // 設置請求時發生錯誤
        console.error('錯誤信息:', error.message);
      }
      
      // 可以在這裡添加用戶通知
      toast?.error?.('保存消息失敗，請稍後再試');
      
      return null;
    }
  };

  // 保存整個聊天記錄
  const saveChat = async (messages) => {
    if (!currentChatId) return;
    
    try {
      // 這裡可以實現保存整個聊天記錄的邏輯
      // 目前我們只是保存最新的消息，所以這個函數可以是空的
      console.log('保存聊天記錄:', messages.length, '條消息');
    } catch (error) {
      console.error('保存聊天記錄失敗:', error);
    }
  };

  // 發送訊息
  const handleSendMessage = async () => {
    if (!input.trim() || sending || !currentChatId) return;
    
    // 如果角色已被刪除，不允許發送新消息
    if (character?.isDeleted) {
      alert("此角色已被刪除，無法發送新消息。");
      return;
    }
    
    try {
      setSending(true);
      
      // 添加用戶消息到UI
      const userMessage = {
        role: "user",
        content: input.trim(),
        timestamp: new Date().toISOString(),
        model: currentModel
      };
      
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput('');
      
      // 保存用戶消息到數據庫
      await saveMessage("user", userMessage.content, currentModel);
      
      // 滾動到底部
      setTimeout(() => {
        scrollToBottom();
      }, 100);
      
      // 獲取AI回覆
      try {
        const response = await axios.post('/api/chats', {
          characterId: id,
          message: userMessage.content,
          chatId: currentChatId,
          model: currentModel
        });
        
        // 添加AI回覆到UI
        const aiMessage = {
          role: "assistant",
          content: response.data.reply,
          timestamp: new Date().toISOString(),
          model: response.data.model || currentModel
        };
        
        setMessages([...updatedMessages, aiMessage]);
        
        // 保存AI回覆到數據庫
        await saveMessage("assistant", aiMessage.content, aiMessage.model);
        
        // 更新好感度
        if (response.data.affinity !== undefined) {
          setAffinity(response.data.affinity);
        }
      } catch (error) {
        console.error('獲取AI回覆失敗:', error);
        // 顯示更詳細的錯誤信息
        if (error.response) {
          // 服務器回應了錯誤
          console.error('錯誤狀態:', error.response.status);
          console.error('錯誤數據:', error.response.data);
        } else if (error.request) {
          // 請求已發送但沒有收到回應
          console.error('沒有收到回應:', error.request);
        } else {
          // 設置請求時發生錯誤
          console.error('錯誤信息:', error.message);
        }
        
        // 添加錯誤消息到UI
        const errorMessage = {
          role: "assistant",
          content: "抱歉，我無法回應您的訊息。請稍後再試。",
          timestamp: new Date().toISOString(),
          isError: true
        };
        
        setMessages([...updatedMessages, errorMessage]);
        toast.error('獲取AI回覆失敗，請稍後再試');
      } finally {
        setSending(false);
        
        // 滾動到底部
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    } catch (error) {
      console.error("發送消息失敗:", error);
      toast.error("發送消息失敗，請稍後再試");
      setSending(false);
    }
  };

  // 清空聊天歷史記錄
  const handleClearChat = async () => {
    if (!currentChatId) return;
    
    if (confirm('確定要清空所有聊天記錄嗎？此操作不可恢復。')) {
      try {
        // 刪除現有聊天
        await axios.delete(`/api/chats/${currentChatId}`);
        
        // 創建新聊天
        const response = await axios.post('/api/chats', { characterId: id });
        const newChat = response.data;
        setCurrentChatId(newChat.id);
        
        // 保留初始消息
        let initialMessage = {
          role: "assistant",
          content: `你好，我是${character.name}。很高興認識你！`,
          timestamp: new Date().toISOString(),
          model: currentModel
        };
        
        // 如果角色有自定義的初始消息，則使用它
        if (character?.firstChatLine) {
          initialMessage.content = character.firstChatLine;
        } else if (character?.firstChatScene) {
          initialMessage.content = character.firstChatScene;
        }
        
        // 更新UI
        setMessages([initialMessage]);
        
        // 保存初始消息到數據庫
        await saveMessage("assistant", initialMessage.content);
        
        console.log('聊天記錄已清空，並創建了新的聊天');
      } catch (error) {
        console.error('清空聊天記錄失敗:', error);
      }
    }
  };

  // 返回角色列表
  const handleBack = () => {
    router.push('/');
  };

  // 檢查聊天狀態
  const checkChatStatus = async () => {
    console.log('--- 聊天狀態診斷 ---');
    try {
      if (!currentChatId) {
        console.log('當前沒有活動的聊天ID');
        return;
      }
      
      // 獲取當前聊天詳情
      const chatResponse = await axios.get(`/api/chats/${currentChatId}`);
      const chat = chatResponse.data;
      console.log(`聊天ID: ${currentChatId}`);
      console.log(`角色: ${chat.character.name}`);
      console.log(`消息數量: ${chat.messages.length}`);
      
      // 獲取所有聊天
      const chatsResponse = await axios.get('/api/chats');
      const chats = chatsResponse.data;
      console.log(`用戶總共有 ${chats.length} 個聊天`);
    } catch (error) {
      console.error('檢查聊天狀態時出錯:', error);
    }
    console.log('-------------------');
  };

  // 前往設定頁面
  const handleGoToSettings = () => {
    router.push('/settings');
  };

  // 組件掛載時檢查本地存儲
  useEffect(() => {
    if (id) {
      setTimeout(() => {
        checkChatStatus();
      }, 1000);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <h1 className="text-xl mb-4">找不到這個角色</h1>
        <button 
          onClick={handleBack}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          返回角色列表
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* 頭部 - 角色資訊 (固定在頂部) */}
      <header className="bg-gray-800 p-4 flex items-center justify-between shadow-md fixed top-0 left-0 right-0 z-10">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex items-center cursor-pointer hover:bg-gray-700 p-2 rounded-lg transition" onClick={handleGoToSettings}>
            <div className="w-10 h-10 bg-gray-700 rounded-full overflow-hidden mr-3">
              {character.avatar ? (
                <img 
                  src={character.avatar.startsWith('data:') ? character.avatar : `/img/${character.avatar}`}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  {character.name?.[0] || "?"}
                </div>
              )}
            </div>
            
            <div>
              <h1 className="text-lg font-semibold flex items-center">
                {character.name}
                {character.isDeleted && (
                  <span className="ml-2 text-xs bg-red-800 text-red-200 px-2 py-1 rounded-full">
                    已刪除
                  </span>
                )}
              </h1>
              {character.job && <p className="text-sm text-gray-400">{character.job}</p>}
            </div>
          </div>
        </div>
      </header>
      
      {/* 對話內容 - 彈性可滾動區域 */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto"
        style={{ 
          paddingTop: '64px', // 與header高度相同
          paddingBottom: '65px' // 與底部輸入框高度相同，避免使用硬編碼的padding值
        }}
      >
        {messages.length === 0 ? (
          <div className="flex justify-center items-center h-full p-4 text-gray-500 text-center">
            未找到聊天記錄，開始發送消息吧！
          </div>
        ) : (
          <div className="flex flex-col p-4 space-y-3 min-h-full">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role !== 'user' && (
                  <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden mr-2 flex-shrink-0 self-end">
                    {character?.avatar && !character.isDeleted ? (
                      <img 
                        src={character.avatar.startsWith('data:') ? character.avatar : `/img/${character.avatar}`}
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        {character?.name?.[0] || "?"}
                      </div>
                    )}
                  </div>
                )}
                
                <div 
                  className={`max-w-[70%] p-3 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-gray-700 text-white rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line text-sm">{message.content}</p>
                  
                  {/* 顯示使用的模型 */}
                  {message.role === 'assistant' && message.model && (
                    <div className="mt-1 flex items-center justify-end">
                      <span className={`text-xs ${
                        message.model === 'gpt' ? 'text-green-400' : 
                        message.model === 'claude' ? 'text-purple-400' : 
                        message.model === 'gemini' ? 'text-blue-400' : 
                        'text-gray-400'
                      }`}>
                        {message.model === 'gpt' ? 'GPT' : 
                         message.model === 'claude' ? 'Claude' : 
                         message.model === 'gemini' ? 'Gemini' : 
                         message.model}
                      </span>
                    </div>
                  )}
                </div>
                
                {message.role === 'user' && (
                  <div className="w-8 h-8 bg-gray-600 rounded-full overflow-hidden ml-2 flex-shrink-0 self-end flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            
            {sending && (
              <div className="flex justify-start">
                <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden mr-2 flex-shrink-0 self-end">
                  {character.avatar ? (
                    <img 
                      src={character.avatar.startsWith('data:') ? character.avatar : `/img/${character.avatar}`}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      {character.name?.[0] || "?"}
                    </div>
                  )}
                </div>
                
                <div className="max-w-[70%] p-3 rounded-2xl bg-gray-700 rounded-tl-none">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 參考點，用於自動滾動到底部 */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* 底部輸入框 */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-2">
        {character?.isDeleted ? (
          <div className="text-center text-gray-400 py-2">
            此角色已被刪除，無法發送新消息
          </div>
        ) : (
          <div className="flex items-center">
            {/* 模型選擇按鈕 */}
            <div className="relative mr-2">
              <div className="relative">
                <button
                  onClick={() => setModelMenuOpen(!modelMenuOpen)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${
                    currentModel === 'gpt' ? 'bg-green-900 text-green-300' :
                    currentModel === 'claude' ? 'bg-purple-900 text-purple-300' :
                    'bg-blue-900 text-blue-300'
                  }`}
                  disabled={character?.isDeleted}
                >
                  <span>{
                    currentModel === 'gpt' ? 'GPT' :
                    currentModel === 'claude' ? 'Claude' :
                    'Gemini'
                  }</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {modelMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-1 bg-gray-800 rounded-lg shadow-lg overflow-hidden z-10">
                    <button
                      onClick={() => {
                        setCurrentModel('gpt');
                        setModelMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded ${currentModel === 'gpt' ? 'bg-green-900 text-green-300' : 'hover:bg-gray-700'}`}
                    >
                      GPT
                    </button>
                    <button
                      onClick={() => {
                        setCurrentModel('claude');
                        setModelMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded ${currentModel === 'claude' ? 'bg-purple-900 text-purple-300' : 'hover:bg-gray-700'}`}
                    >
                      Claude
                    </button>
                    <button
                      onClick={() => {
                        setCurrentModel('gemini');
                        setModelMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded ${currentModel === 'gemini' ? 'bg-blue-900 text-blue-300' : 'hover:bg-gray-700'}`}
                    >
                      Gemini
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {character?.isDeleted ? (
              <div className="flex-1 bg-gray-700 text-gray-400 rounded-lg px-4 py-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                此角色已被刪除，無法發送新消息
              </div>
            ) : (
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
                placeholder="輸入消息..."
                className="flex-1 bg-gray-700 text-white rounded-l-lg px-4 py-2 focus:outline-none"
                disabled={sending}
              />
            )}
            
            <button
              onClick={handleSendMessage}
              disabled={sending || !input.trim() || character?.isDeleted}
              className={`bg-blue-600 text-white rounded-r-lg px-4 py-2 ${
                sending || !input.trim() || character?.isDeleted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
            >
              {sending ? (
                <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 調試信息（開發環境可見） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-20 right-4 bg-black bg-opacity-70 p-2 rounded-md text-xs text-gray-400 max-w-xs overflow-auto max-h-40">
          <div>ID: {id}</div>
          <div>消息數: {messages.length}</div>
          <div>當前模型: {currentModel}</div>
          <button 
            onClick={checkChatStatus}
            className="mt-1 px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs"
          >
            檢查聊天狀態
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatPage; 
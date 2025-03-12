import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import ChatMessage from '@/components/ChatMessage';

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

  // API金鑰狀態
  const [apiKeys, setApiKeys] = useState({
    gpt: "",
    claude: "",
    gemini: ""
  });
  
  // API金鑰錯誤狀態
  const [apiKeyError, setApiKeyError] = useState(null);

  // 添加一個標記，防止重複加載
  const [hasLoaded, setHasLoaded] = useState(false);

  // 使用 ref 來記錄上一次的 ID 和類型
  const prevIdRef = useRef(id);
  const prevTypeRef = useRef(type);

  // 滾動到底部
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };
  
  useEffect(() => {
    // 確保 router.query 中的值已填充且 session 存在
    if (id && session && !hasLoaded) {
      console.log(`開始載入，參數: id=${id}, type=${type}, hasLoaded=${hasLoaded}`);
      setHasLoaded(true); // 設置標記，防止重複加載
      loadChat();
      loadUserProfile(); // 載入用戶設定檔，包括 API 金鑰
    }
  }, [id, session, type, hasLoaded]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // 載入用戶設定檔和 API 金鑰
  const loadUserProfile = async () => {
    try {
      const response = await axios.get('/api/user/profile');
      if (response.data?.apiKeys) {
        setApiKeys(response.data.apiKeys);
        // 如果用戶有默認模型，使用它
        if (response.data.defaultModel) {
          setCurrentModel(response.data.defaultModel);
        }
      }
    } catch (error) {
      console.error('無法載入用戶設定檔:', error);
    }
  };

  // 載入聊天數據
  const loadChat = async () => {
    try {
      // 避免在沒有必要參數時繼續
      if (!id || !session) {
        console.log(`參數不足，無法載入聊天: id=${id}, session=${!!session}`);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      console.log(`=== 聊天資料載入開始 ===`);
      console.log(`ID: ${id}, 類型: ${type || 'character'}`);
      console.log(`路由參數:`, JSON.stringify(router.query));
      
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
            // 如果沒有消息，創建初始消息
            console.log(`沒有找到聊天記錄，創建初始消息`);
            const characterName = chatData.character?.name || "此角色";
            let initialMessage = {
              role: 'assistant',
              content: `你好，我是${characterName}。很高興認識你！`
            };
            
            // 如果角色有自定義的初始消息，則使用它
            if (chatData.character?.firstChatLine) {
              initialMessage.content = chatData.character.firstChatLine;
              console.log(`使用角色自定義的初始消息: ${initialMessage.content.substring(0, 30)}...`);
            } else if (chatData.character?.firstChatScene) {
              initialMessage.content = chatData.character.firstChatScene;
              console.log(`使用角色自定義的場景: ${initialMessage.content.substring(0, 30)}...`);
            }
            
            setMessages([initialMessage]);
            
            // 直接保存初始消息到數據庫
            const chatId = chatData.id;
            console.log(`保存初始消息到數據庫，聊天ID: ${chatId}`);
            try {
              const savedMessage = await axios.post('/api/messages', {
                chatId: chatId,
                role: "assistant",
                content: initialMessage.content,
                model: currentModel
              });
              console.log('成功保存初始消息:', savedMessage.data);
            } catch (msgError) {
              console.error('保存初始消息失敗:', msgError);
              toast?.error?.('保存初始消息失敗，可能導致對話不連續');
            }
          }
          
          // 設置當前聊天ID (如果還沒有設置)
          if (!currentChatId) {
            setCurrentChatId(chatData.id);
            console.log(`設置當前聊天ID: ${chatData.id}`);
          }
          
          // 完成載入，關閉加載狀態
          setLoading(false);
          return; // 重要：提前返回，避免執行下面通過角色ID加載的邏輯
        } catch (error) {
          console.error("獲取聊天數據失敗:", error);
          setLoading(false);
          return;
        }
      }
      
      // 以下是通過角色ID獲取數據的原有邏輯
      console.log(`嘗試從API獲取角色數據: ${id}`);
      try {
        console.log(`發送角色數據請求到: /api/characters/${id}`);
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
              let initialMessage = {
                role: 'assistant',
                content: `你好，我是${characterName}。很高興認識你！`
              };
              
              // 如果角色有自定義的初始消息，則使用它
              if (characterData?.firstChatLine) {
                initialMessage.content = characterData.firstChatLine;
                console.log(`使用角色自定義的初始消息: ${initialMessage.content.substring(0, 30)}...`);
              } else if (characterData?.firstChatScene) {
                initialMessage.content = characterData.firstChatScene;
                console.log(`使用角色自定義的場景: ${initialMessage.content.substring(0, 30)}...`);
              }
              
              setMessages([initialMessage]);
              
              // 直接保存初始消息到數據庫
              const chatId = existingChat.id;
              console.log(`保存初始消息到數據庫，聊天ID: ${chatId}`);
              try {
                const savedMessage = await axios.post('/api/messages', {
                  chatId: chatId,
                  role: "assistant",
                  content: initialMessage.content,
                  model: currentModel
                });
                console.log('成功保存初始消息:', savedMessage.data);
              } catch (msgError) {
                console.error('保存初始消息失敗:', msgError);
                toast?.error?.('保存初始消息失敗，可能導致對話不連續');
              }
            }
          } else {
            // 創建新聊天
            console.log(`沒有找到現有聊天，創建新聊天，角色ID: ${id}`);
            const newChatResponse = await axios.post('/api/chats', { characterId: id });
            chatData = newChatResponse.data;
            
            // 立即設置當前聊天ID，以便後續保存消息
            setCurrentChatId(chatData.id);
            const chatId = chatData.id; // 保存一個本地變數以供立即使用
            console.log(`設置當前聊天ID: ${chatId}, 關聯角色ID: ${id}`);
            
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
              console.log(`使用角色自定義的初始消息: ${initialMessage.content.substring(0, 30)}...`);
            } else if (characterData?.firstChatScene) {
              initialMessage.content = characterData.firstChatScene;
              console.log(`使用角色自定義的場景: ${initialMessage.content.substring(0, 30)}...`);
            }
            
            setMessages([initialMessage]);
            
            // 直接使用chatId保存初始消息，而不依賴於狀態更新
            console.log(`保存初始消息到數據庫，聊天ID: ${chatId}`);
            try {
              const savedMessage = await axios.post('/api/messages', {
                chatId: chatId,
                role: "assistant",
                content: initialMessage.content,
                model: currentModel
              });
              console.log('成功保存初始消息:', savedMessage.data);
            } catch (msgError) {
              console.error('保存初始消息失敗:', msgError);
              toast?.error?.('保存初始消息失敗，可能導致對話不連續');
            }
          }
          
          // 設置當前聊天ID (如果還沒有設置)
          if (!currentChatId) {
            setCurrentChatId(chatData.id);
            console.log(`設置當前聊天ID: ${chatData.id}`);
          }
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
      console.log('已保存消息到數據庫:', role, '內容:', content.substring(0, 30) + '...');
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

  // 檢查當前模型的 API 金鑰
  const checkApiKey = (model) => {
    const key = apiKeys[model];
    if (!key) {
      setApiKeyError({
        model: model,
        message: `您尚未設置 ${model.toUpperCase()} 的 API 金鑰，請前往設定頁面設置。`
      });
      return false;
    }
    
    // 簡單的金鑰格式檢查
    let isValidFormat = true;
    
    switch(model) {
      case 'gpt':
        // OpenAI 金鑰通常以 sk- 開頭
        isValidFormat = key.startsWith('sk-') && key.length > 10;
        break;
      case 'claude':
        // Anthropic 金鑰格式檢查
        isValidFormat = key.length > 10;
        break;
      case 'gemini':
        // Google AI 金鑰格式檢查
        isValidFormat = key.length > 10;
        break;
    }
    
    if (!isValidFormat) {
      setApiKeyError({
        model: model,
        message: `您的 ${model.toUpperCase()} API 金鑰格式可能不正確，請檢查。`
      });
      return false;
    }
    
    return true;
  };
  
  // 處理模型變更
  const handleModelChange = (model) => {
    setCurrentModel(model);
    setModelMenuOpen(false);
    
    // 檢查所選模型的 API 金鑰
    checkApiKey(model);
    
    // 添加模型特定提示
    let modelTip = "";
    switch(model) {
      case 'gpt':
        modelTip = "已切換到 OpenAI GPT 模型";
        break;
      case 'claude':
        modelTip = "已切換到 Anthropic Claude 模型";
        break;
      case 'gemini':
        modelTip = "已切換到 Google Gemini 模型";
        break;
    }
    
    toast(modelTip, { 
      icon: '🔄',
      duration: 2000
    });
  };

  // 發送消息
  const handleSendMessage = async () => {
    if (!input.trim() || sending || !currentChatId) return;
    
    // 如果角色已被刪除，不允許發送新消息
    if (character?.isDeleted) {
      toast.error("此角色已被刪除，無法發送新消息。");
      return;
    }
    
    // 檢查 API 金鑰
    if (!checkApiKey(currentModel)) {
      toast.error(`缺少 ${currentModel.toUpperCase()} API 金鑰，請前往設定頁面設置。`);
      return;
    }
    
    try {
      setSending(true);
      setApiKeyError(null); // 清除之前的錯誤
      
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
        // 使用角色的ID而不是聊天ID作為characterId
        const characterId = character?.id;
        
        // 進行檢查，確保有有效的角色ID
        if (!characterId) {
          console.error("無法獲取有效的角色ID，使用當前角色:", character);
          toast.error("無法獲取角色信息，請刷新頁面重試");
          setSending(false);
          return;
        }
        
        console.log("發送請求到前端 API，參數:", {
          characterId: characterId, // 確保使用正確的角色ID
          message: userMessage.content,
          chatId: currentChatId,
          model: currentModel
        });
        
        const response = await axios.post('/api/chats', {
          characterId: characterId, // 使用角色ID
          message: userMessage.content,
          chatId: currentChatId,
          model: currentModel
        });
        
        console.log("API 回應:", response.data);
        
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
        
        // 獲取詳細的錯誤信息
        let errorMessage = "獲取AI回覆失敗，請稍後再試";
        let errorDetails = "";
        
        if (error.response) {
          console.error('錯誤響應狀態:', error.response.status);
          console.error('錯誤響應詳情:', error.response.data);
          
          errorMessage = error.response.data?.error || errorMessage;
          errorDetails = JSON.stringify(error.response.data, null, 2);
        } else if (error.request) {
          console.error('請求已發送但沒有收到響應:', error.request);
          errorMessage = "伺服器沒有響應，請檢查後端服務是否運行";
        } else {
          console.error('錯誤詳情:', error.message);
          errorMessage = error.message;
        }
        
        // 顯示詳細錯誤給用戶
        toast.error(
          <div>
            <div className="font-bold">{errorMessage}</div>
            {errorDetails && <pre className="text-xs mt-2 max-h-40 overflow-auto">{errorDetails}</pre>}
          </div>,
          { duration: 10000 }
        );
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
    if (!currentChatId || sending) return;
    
    try {
      const willClearMemory = window.confirm("是否同時清除角色對您的記憶？\n\n選擇「確定」將同時清除記憶，角色將忘記之前所有對話中的信息。\n選擇「取消」則僅清除聊天記錄，保留角色記憶。");
      
      // 發送刪除請求
      await axios.delete(`/api/chats/${currentChatId}?clearMemory=${willClearMemory}`);
      
      // 創建新聊天
      try {
        const response = await axios.post('/api/chats', { characterId: id });
        const newChat = response.data;
        setCurrentChatId(newChat.id);
        
        // 保留初始消息
        let initialMessage = {
          role: "assistant",
          content: `*(微微一笑)*\n你好，我是${character.name}。很高興認識你！`,
          timestamp: new Date().toISOString(),
          model: currentModel
        };
        
        // 更新UI
        setMessages([initialMessage]);
        
        // 保存初始消息到數據庫
        await saveMessage("assistant", initialMessage.content);
        
      } catch (createError) {
        console.error('創建新聊天失敗:', createError);
        setMessages([]);
      }
      
      // 顯示成功消息
      if (willClearMemory) {
        toast.success("聊天記錄和角色記憶已清除");
      } else {
        toast.success("聊天記錄已清除");
      }
      
    } catch (error) {
      console.error("清除聊天失敗:", error);
      toast.error("清除聊天失敗，請稍後再試");
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
    router.push('/settings?tab=api');
  };

  // 組件掛載時檢查本地存儲
  useEffect(() => {
    if (id) {
      setTimeout(() => {
        checkChatStatus();
      }, 1000);
    }
  }, [id]);

  // 添加一個重置函數，在需要時重新載入聊天
  const resetChatState = useCallback(() => {
    setHasLoaded(false);
    setLoading(true);
    setMessages([]);
    setCharacter(null);
    setCurrentChatId(null);
    console.log('聊天狀態已重置，準備重新載入');
  }, []);
  
  // 監聽路由變化，在 ID 或類型變化時重置狀態
  useEffect(() => {
    // 首次加載不需要重置
    if (!id || !prevIdRef.current) {
      prevIdRef.current = id;
      prevTypeRef.current = type;
      return;
    }
    
    // 檢查 ID 或類型是否變化
    if (id !== prevIdRef.current || type !== prevTypeRef.current) {
      console.log(`路由變化: ${prevIdRef.current}→${id}, 類型: ${prevTypeRef.current}→${type}`);
      resetChatState();
      prevIdRef.current = id;
      prevTypeRef.current = type;
    }
  }, [id, type, resetChatState]);

  // 組件掛載和卸載處理
  useEffect(() => {
    // 組件掛載時
    console.log('聊天組件掛載');
    
    // 組件卸載時清理
    return () => {
      console.log('聊天組件卸載，清理狀態');
      setHasLoaded(false);
      setMessages([]);
      setCharacter(null);
      setCurrentChatId(null);
    };
  }, []);

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
        {/* API金鑰錯誤提示 */}
        {apiKeyError && (
          <div className="sticky top-16 mx-auto my-2 max-w-md bg-red-900 border border-red-700 rounded-lg p-3 text-red-100 shadow-lg z-10">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold">{apiKeyError.message}</p>
                <div className="mt-2">
                  <button 
                    onClick={handleGoToSettings}
                    className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded-md text-sm"
                  >
                    前往設定
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setApiKeyError(null)}
                className="ml-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="flex justify-center items-center h-full p-4 text-gray-500 text-center">
            未找到聊天記錄，開始發送消息吧！
          </div>
        ) : (
          <div className="flex flex-col p-4 space-y-3 min-h-full">
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                character={character}
                isUser={message.role === 'user'}
              />
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
                  } ${!apiKeys[currentModel] ? 'bg-opacity-50' : ''}`}
                  disabled={character?.isDeleted}
                >
                  <span>{
                    currentModel === 'gpt' ? 'GPT' :
                    currentModel === 'claude' ? 'Claude' :
                    'Gemini'
                  }</span>
                  {!apiKeys[currentModel] && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {modelMenuOpen && (
                  <div className="absolute bottom-full left-0 mb-1 bg-gray-800 rounded-lg shadow-lg overflow-hidden z-10">
                    <button
                      onClick={() => handleModelChange('gpt')}
                      className={`w-full text-left px-3 py-2 rounded flex items-center justify-between ${currentModel === 'gpt' ? 'bg-green-900 text-green-300' : 'hover:bg-gray-700'}`}
                    >
                      <span>GPT</span>
                      {!apiKeys.gpt && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleModelChange('claude')}
                      className={`w-full text-left px-3 py-2 rounded flex items-center justify-between ${currentModel === 'claude' ? 'bg-purple-900 text-purple-300' : 'hover:bg-gray-700'}`}
                    >
                      <span>Claude</span>
                      {!apiKeys.claude && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => handleModelChange('gemini')}
                      className={`w-full text-left px-3 py-2 rounded flex items-center justify-between ${currentModel === 'gemini' ? 'bg-blue-900 text-blue-300' : 'hover:bg-gray-700'}`}
                    >
                      <span>Gemini</span>
                      {!apiKeys.gemini && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                    </button>
                    <div className="border-t border-gray-700 mt-1 pt-1 px-3 py-2">
                      <Link href="/settings?tab=api" className="text-sm text-blue-400 hover:text-blue-300 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        設定 API 金鑰
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={apiKeyError ? "請先設定 API 金鑰..." : "輸入消息..."}
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2"
              disabled={character?.isDeleted || sending || apiKeyError}
            />
            
            <button
              onClick={handleSendMessage}
              className={`ml-2 p-2 ${!apiKeyError && !character?.isDeleted && input.trim() && !sending ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 cursor-not-allowed'} rounded-full transition-colors`}
              disabled={character?.isDeleted || !input.trim() || sending || apiKeyError}
            >
              {sending ? (
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
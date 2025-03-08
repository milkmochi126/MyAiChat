// UUID生成和會話管理工具函數
import { v4 as uuidv4 } from 'uuid';

// 生成UUID
export function generateUUID() {
  return 'session_' + uuidv4();
}

// 格式化時間顯示
export function formatTime(isoString) {
  if (!isoString) return '';
  
  const date = new Date(isoString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // 今天的消息只顯示時間
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // 昨天的消息顯示"昨天"
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天';
  }
  
  // 一週內的消息顯示星期幾
  if (now - date < 7 * 24 * 60 * 60 * 1000) {
    const weekdays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    return weekdays[date.getDay()];
  }
  
  // 其他顯示日期
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

// 獲取消息預覽
export function getMessagePreview(message) {
  if (!message) return '開始新對話...';
  return message.length > 30 ? message.substring(0, 30) + '...' : message;
}

// 獲取特定角色的會話數量
export function getSessionCount(characterId, sessionsList) {
  if (!sessionsList || !characterId) return 0;
  return sessionsList.filter(session => session.characterId === characterId).length;
}

// 獲取特定會話在同角色會話中的序號
export function getCharacterSessionIndex(session, sessionsList) {
  if (!session || !sessionsList) return 1;
  
  const characterSessions = sessionsList
    .filter(s => s.characterId === session.characterId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  const index = characterSessions.findIndex(s => s.sessionUuid === session.sessionUuid);
  return index !== -1 ? index + 1 : 1;
}

// 遷移舊數據到新的會話列表格式
export const migrateOldChatData = () => {
  console.log('開始遷移舊數據');
  
  try {
    // 檢查是否已經有新格式的會話列表
    const existingNewData = localStorage.getItem('chatSessionsList');
    if (existingNewData) {
      try {
        const sessions = JSON.parse(existingNewData);
        if (sessions && sessions.length > 0) {
          console.log('已存在新格式數據，無需遷移');
          return sessions;
        }
      } catch (error) {
        console.error('解析現有新格式數據失敗:', error);
      }
    }
    
    // 檢查是否有舊格式數據
    const oldSessions = localStorage.getItem('chatSessions');
    if (oldSessions) {
      try {
        const sessions = JSON.parse(oldSessions);
        if (sessions && sessions.length > 0) {
          console.log('找到舊格式數據，進行遷移');
          localStorage.setItem('chatSessionsList', oldSessions);
          
          // 確保數據格式正確
          const validatedSessions = sessions.map(session => {
            return {
              ...session,
              sessionUuid: session.sessionUuid || `session_${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
              createdAt: session.createdAt || new Date().toISOString(),
              lastActiveAt: session.lastActiveAt || new Date().toISOString(),
            };
          });
          
          localStorage.setItem('chatSessionsList', JSON.stringify(validatedSessions));
          console.log('數據遷移完成，更新了', validatedSessions.length, '個會話');
          return validatedSessions;
        }
      } catch (error) {
        console.error('遷移舊格式數據失敗:', error);
      }
    }
    
    // 檢查是否有其他可能包含會話數據的鍵
    const oldMessageKeys = Object.keys(localStorage).filter(key => key.startsWith('messages_'));
    const chatKeys = Object.keys(localStorage).filter(key => key.startsWith('chat_'));
    
    console.log('找到 messages_ 開頭的鍵:', oldMessageKeys.length);
    console.log('找到 chat_ 開頭的鍵:', chatKeys.length);
    
    // 合併所有可能的會話 ID
    const allPossibleSessionIds = new Set([
      ...oldMessageKeys.map(key => key.replace('messages_', '')),
      ...chatKeys.map(key => key.replace('chat_', ''))
    ]);
    
    console.log('可能的會話 ID 總數:', allPossibleSessionIds.size);
    
    if (allPossibleSessionIds.size > 0) {
      // 建立新的會話列表
      const newSessions = [];
      
      // 嘗試從本地存儲的角色數據獲取額外信息
      let characters = [];
      try {
        const charactersData = localStorage.getItem('myCharacters');
        if (charactersData) {
          characters = JSON.parse(charactersData);
          console.log('找到角色數據:', characters.length, '個角色');
        }
      } catch (error) {
        console.error('讀取角色數據失敗:', error);
      }
      
      // 為每個會話 ID 創建一個新的會話記錄
      Array.from(allPossibleSessionIds).forEach(sessionId => {
        try {
          // 嘗試獲取聊天消息
          let messageKey = `messages_${sessionId}`;
          let messageData = localStorage.getItem(messageKey);
          
          // 如果沒有找到，嘗試使用 chat_ 前綴
          if (!messageData) {
            messageKey = `chat_${sessionId}`;
            messageData = localStorage.getItem(messageKey);
          }
          
          if (messageData) {
            try {
              const messages = JSON.parse(messageData);
              if (messages && messages.length > 0) {
                // 嘗試獲取最後一條消息作為預覽
                const lastMessage = messages[messages.length - 1].content;
                
                // 嘗試從角色數據中查找可能的角色信息
                let characterInfo = null;
                if (characters.length > 0) {
                  characterInfo = characters.find(c => c.id === sessionId || sessionId.includes(c.id));
                }
                
                // 創建新的會話記錄
                newSessions.push({
                  sessionUuid: sessionId,
                  characterId: characterInfo ? characterInfo.id : sessionId,
                  characterName: characterInfo ? characterInfo.name : '未知角色',
                  avatar: characterInfo ? characterInfo.avatar : null,
                  title: '',
                  lastMessage: lastMessage,
                  createdAt: new Date().toISOString(),
                  lastActiveAt: new Date().toISOString()
                });
              }
            } catch (parseError) {
              console.error('解析消息數據失敗:', parseError);
            }
          }
        } catch (error) {
          console.error('處理會話 ID 失敗:', sessionId, error);
        }
      });
      
      if (newSessions.length > 0) {
        console.log('成功構建新會話列表，共', newSessions.length, '個會話');
        localStorage.setItem('chatSessionsList', JSON.stringify(newSessions));
        return newSessions;
      }
    }
    
    console.log('未找到可遷移的舊數據');
    return null;
  } catch (error) {
    console.error('數據遷移過程中出錯:', error);
    return null;
  }
};

// 創建新的對話會話
export function createNewSession(character) {
  const sessionUuid = generateUUID();
  const timestamp = new Date().toISOString();
  
  // 處理頭像
  let avatarUrl = null;
  if (character.avatar) {
    // 如果是base64格式或完整URL，直接使用
    if (character.avatar.startsWith('data:') || character.avatar.startsWith('http')) {
      avatarUrl = character.avatar;
    } else {
      // 否則假設是文件名，添加路徑前綴
      avatarUrl = character.avatar;
    }
  }
  
  const session = {
    sessionUuid,
    characterId: character.id,
    characterName: character.name,
    avatar: avatarUrl,
    title: '',
    lastMessage: '',
    lastActiveAt: timestamp,
    createdAt: timestamp
  };
  
  console.log(`創建新會話: ${character.name}, 頭像: ${avatarUrl || '無頭像'}`);
  
  try {
    // 獲取當前會話列表
    const sessionsJson = localStorage.getItem('chatSessions');
    const sessions = sessionsJson ? JSON.parse(sessionsJson) : [];
    
    // 添加新會話到列表頂部
    const updatedSessions = [session, ...sessions];
    localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
    
    // 初始化空消息列表
    localStorage.setItem(`messages_${sessionUuid}`, JSON.stringify([]));
    
    return session;
  } catch (error) {
    console.error('創建新會話失敗:', error);
    return null;
  }
}

// 分叉會話
export function forkSession(sessionUuid, sessionsList) {
  try {
    // 查找原始會話
    const originalSession = sessionsList.find(s => s.sessionUuid === sessionUuid);
    if (!originalSession) return null;
    
    // 創建新會話ID
    const newSessionUuid = generateUUID();
    const timestamp = new Date().toISOString();
    
    // 創建分叉會話
    const forkedSession = {
      ...originalSession,
      sessionUuid: newSessionUuid,
      title: `${originalSession.title || originalSession.characterName}的副本`,
      lastActiveAt: timestamp,
      createdAt: timestamp,
      isForked: true,
      forkParentId: sessionUuid
    };
    
    // 更新會話列表
    const updatedSessions = [forkedSession, ...sessionsList];
    localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
    
    // 複製原始會話的消息
    const messagesJson = localStorage.getItem(`messages_${sessionUuid}`);
    if (messagesJson) {
      localStorage.setItem(`messages_${newSessionUuid}`, messagesJson);
    } else {
      localStorage.setItem(`messages_${newSessionUuid}`, JSON.stringify([]));
    }
    
    return forkedSession;
  } catch (error) {
    console.error('分叉會話失敗:', error);
    return null;
  }
}

// 獲取會話的消息列表
export function getSessionMessages(sessionUuid) {
  try {
    const messagesJson = localStorage.getItem(`messages_${sessionUuid}`);
    return messagesJson ? JSON.parse(messagesJson) : [];
  } catch (error) {
    console.error(`獲取會話 ${sessionUuid} 的消息失敗:`, error);
    return [];
  }
}

// 更新會話信息
export function updateSession(sessionUuid, updates, sessionsList) {
  try {
    const updatedSessions = sessionsList.map(session => {
      if (session.sessionUuid === sessionUuid) {
        return { ...session, ...updates };
      }
      return session;
    });
    
    localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
    return updatedSessions;
  } catch (error) {
    console.error(`更新會話 ${sessionUuid} 失敗:`, error);
    return sessionsList;
  }
} 
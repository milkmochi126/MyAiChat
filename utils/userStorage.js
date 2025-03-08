// 用戶存儲工具 - 為不同Google帳戶提供獨立的數據存儲

// 存儲遷移標誌鍵名
const MIGRATION_COMPLETED_KEY = 'userStorage_migrationCompleted';
// 默認用戶 ID 鍵名（用於第一個登錄的用戶）
const DEFAULT_USER_KEY = 'userStorage_defaultUserId';
// 當前活動用戶 ID 鍵名
const CURRENT_USER_KEY = 'userStorage_currentUserId';
// 上次登錄的用戶 ID 鍵名
const LAST_USER_KEY = 'userStorage_lastUserId';

// 獲取安全的用戶 ID（確保即使 googleId 不存在也能正常運行）
export function getSafeUserId(session) {
  try {
    let userId = null;
    
    // 如果有 googleId，優先使用它
    if (session?.user?.googleId) {
      userId = session.user.googleId;
      console.log('getSafeUserId: 使用 googleId:', userId);
      
      // 保存當前活動用戶 ID
      localStorage.setItem(CURRENT_USER_KEY, userId);
      return userId;
    }
    
    // 如果有 user.id，使用它
    if (session?.user?.id) {
      userId = session.user.id;
      console.log('getSafeUserId: 使用 user.id:', userId);
      
      // 保存當前活動用戶 ID
      localStorage.setItem(CURRENT_USER_KEY, userId);
      return userId;
    }
    
    // 如果沒有會話但有當前活動用戶 ID，使用它
    const currentUserId = localStorage.getItem(CURRENT_USER_KEY);
    if (currentUserId) {
      console.log('getSafeUserId: 使用當前活動用戶 ID:', currentUserId);
      return currentUserId;
    }
    
    // 如果沒有任何 ID，檢查本地存儲中是否有默認用戶 ID
    let defaultUserId = localStorage.getItem(DEFAULT_USER_KEY);
    
    // 如果本地存儲中沒有默認用戶 ID，創建一個
    if (!defaultUserId) {
      defaultUserId = 'default_user_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem(DEFAULT_USER_KEY, defaultUserId);
      console.log('getSafeUserId: 創建默認用戶 ID:', defaultUserId);
    } else {
      console.log('getSafeUserId: 使用默認用戶 ID:', defaultUserId);
    }
    
    // 保存當前活動用戶 ID
    localStorage.setItem(CURRENT_USER_KEY, defaultUserId);
    return defaultUserId;
  } catch (error) {
    console.error('獲取安全用戶 ID 失敗:', error);
    // 在發生錯誤時返回一個固定的默認 ID
    return 'default_user_fallback';
  }
}

// 獲取帶有用戶ID前綴的存儲鍵
export function getUserKey(userId, key) {
  if (!userId) {
    console.warn('警告: 調用 getUserKey 時 userId 為空，將使用未前綴的原始鍵');
    return key;
  }
  return `user_${userId}_${key}`;
}

// 從localStorage獲取數據，支持用戶隔離
export function getUserData(userId, key, defaultValue = null) {
  try {
    // 確保 userId 有值
    if (!userId) {
      console.warn(`警告: 調用 getUserData 時 userId 為空，key=${key}`);
      // 嘗試使用本地存儲中的默認用戶 ID
      const defaultUserId = localStorage.getItem(DEFAULT_USER_KEY);
      if (defaultUserId) {
        userId = defaultUserId;
      }
    }
    
    const userKey = getUserKey(userId, key);
    const data = localStorage.getItem(userKey);
    if (data === null || data === undefined) return defaultValue;
    return JSON.parse(data);
  } catch (error) {
    console.error(`讀取用戶數據失敗 [${key}]:`, error);
    return defaultValue;
  }
}

// 向localStorage寫入數據，支持用戶隔離
export function setUserData(userId, key, value) {
  try {
    // 檢查是否在瀏覽器環境中
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.error('setUserData: 不在瀏覽器環境中或localStorage不可用');
      return false;
    }
    
    // 確保 userId 有值
    if (!userId) {
      console.warn(`警告: 調用 setUserData 時 userId 為空，key=${key}`);
      // 嘗試使用本地存儲中的默認用戶 ID
      const defaultUserId = localStorage.getItem(DEFAULT_USER_KEY);
      if (defaultUserId) {
        userId = defaultUserId;
      } else {
        console.error('setUserData: 無法獲取有效的用戶ID');
        return false;
      }
    }
    
    // 檢查value是否為undefined
    if (value === undefined) {
      console.error(`setUserData: 嘗試保存undefined值，key=${key}`);
      return false;
    }
    
    const userKey = getUserKey(userId, key);
    const valueToStore = JSON.stringify(value);
    
    // 檢查數據大小
    if (valueToStore.length > 5000000) { // 約5MB
      console.warn(`警告: 嘗試保存的數據過大 (${valueToStore.length} 字節)，可能超出localStorage限制`);
    }
    
    localStorage.setItem(userKey, valueToStore);
    console.log(`成功保存數據: ${userKey}, 大小: ${valueToStore.length} 字節`);
    return true;
  } catch (error) {
    console.error(`保存用戶數據失敗 [${key}]:`, error);
    // 嘗試判斷是否是存儲空間已滿的錯誤
    if (error.name === 'QuotaExceededError' || 
        error.code === 22 || 
        error.message.includes('quota') || 
        error.message.includes('storage')) {
      console.error('localStorage存儲空間已滿，請清理一些數據');
      alert('存儲空間已滿，請清理一些數據後再試');
    }
    return false;
  }
}

// 刪除用戶特定數據
export function removeUserData(userId, key) {
  try {
    if (!userId) {
      console.warn(`警告: 調用 removeUserData 時 userId 為空，key=${key}`);
      return false;
    }
    
    const userKey = getUserKey(userId, key);
    localStorage.removeItem(userKey);
    return true;
  } catch (error) {
    console.error(`刪除用戶數據失敗 [${key}]:`, error);
    return false;
  }
}

// 獲取所有以特定前綴開頭的鍵
function getKeysWithPrefix(prefix) {
  try {
    return Object.keys(localStorage).filter(key => key.startsWith(prefix));
  } catch (error) {
    console.error('獲取帶前綴的鍵失敗:', error);
    return [];
  }
}

// 數據遷移 - 只針對第一個登入的用戶執行一次
export function migrateDataToUserSpecific(userId) {
  try {
    if (!userId) {
      console.warn('嘗試執行數據遷移，但用戶 ID 為空');
      return false;
    }
    
    // 檢查是否已完成遷移
    const migrationKey = `migration_completed_${userId}`;
    const migrationCompleted = localStorage.getItem(migrationKey);
    if (migrationCompleted === 'true') {
      console.log(`用戶 ${userId} 的數據已經遷移過，跳過遷移`);
      return true; // 已完成遷移，無需重複
    }
    
    console.log('開始將數據遷移到用戶特定存儲，用戶 ID:', userId);
    
    // 遷移用戶配置文件
    const legacyUserProfile = localStorage.getItem('userProfile');
    if (legacyUserProfile) {
      try {
        const userKey = getUserKey(userId, 'userProfile');
        localStorage.setItem(userKey, legacyUserProfile);
        console.log('用戶配置文件已遷移');
      } catch (e) {
        console.error('遷移用戶配置文件失敗:', e);
      }
    }
    
    // 遷移角色列表
    const legacyCharacters = localStorage.getItem('characters');
    if (legacyCharacters) {
      try {
        const userKey = getUserKey(userId, 'myCharacters');  // 修改為 myCharacters
        localStorage.setItem(userKey, legacyCharacters);
        console.log('角色列表已遷移到 myCharacters');
      } catch (e) {
        console.error('遷移角色列表失敗:', e);
      }
    }
    
    // 遷移聊天會話列表
    const legacyChatSessions = localStorage.getItem('chatSessionsList');
    if (legacyChatSessions) {
      try {
        const userKey = getUserKey(userId, 'chatSessionsList');
        localStorage.setItem(userKey, legacyChatSessions);
        console.log('聊天會話列表已遷移');
      } catch (e) {
        console.error('遷移聊天會話列表失敗:', e);
      }
    }
    
    // 遷移所有聊天記錄
    const chatKeys = getKeysWithPrefix('chat_');
    let migratedCount = 0;
    for (const chatKey of chatKeys) {
      try {
        const sessionId = chatKey.replace('chat_', '');
        const messagesData = localStorage.getItem(chatKey);
        if (messagesData) {
          const userKey = getUserKey(userId, `messages_${sessionId}`);
          localStorage.setItem(userKey, messagesData);
          migratedCount++;
        }
      } catch (e) {
        console.error(`遷移聊天記錄 ${chatKey} 失敗:`, e);
      }
    }
    console.log(`已遷移 ${migratedCount} 個聊天記錄`);
    
    // 標記遷移已完成 - 使用用戶特定的標記
    localStorage.setItem(migrationKey, 'true');
    console.log(`用戶 ${userId} 的數據遷移已完成`);
    return true;
  } catch (error) {
    console.error('數據遷移失敗:', error);
    return false;
  }
}

// 獲取用戶特定的聊天會話消息
export function getUserSessionMessages(userId, sessionUuid) {
  try {
    if (!userId || !sessionUuid) {
      console.warn(`警告: 調用 getUserSessionMessages 時參數不完整，userId=${userId}, sessionUuid=${sessionUuid}`);
      if (!sessionUuid) return [];
      
      // 如果 userId 為空但有 sessionUuid，嘗試使用默認用戶 ID
      if (!userId) {
        const defaultUserId = localStorage.getItem(DEFAULT_USER_KEY);
        if (defaultUserId) {
          userId = defaultUserId;
        } else {
          // 如果沒有默認用戶 ID，嘗試檢查舊格式的消息
          const legacyKey = `chat_${sessionUuid}`;
          const legacyData = localStorage.getItem(legacyKey);
          if (legacyData) {
            try {
              return JSON.parse(legacyData);
            } catch (e) {
              console.error('解析舊格式消息失敗:', e);
              return [];
            }
          }
          return [];
        }
      }
    }
    
    const messagesKey = `messages_${sessionUuid}`;
    return getUserData(userId, messagesKey, []);
  } catch (error) {
    console.error('獲取會話消息失敗:', error);
    return [];
  }
}

// 保存用戶特定的聊天會話消息
export function saveUserSessionMessages(userId, sessionUuid, messages) {
  try {
    if (!userId || !sessionUuid) {
      console.warn(`警告: 調用 saveUserSessionMessages 時參數不完整，userId=${userId}, sessionUuid=${sessionUuid}`);
      if (!sessionUuid) return false;
      
      // 如果 userId 為空但有 sessionUuid，嘗試使用默認用戶 ID
      if (!userId) {
        const defaultUserId = localStorage.getItem(DEFAULT_USER_KEY);
        if (defaultUserId) {
          userId = defaultUserId;
        } else {
          // 如果沒有默認用戶 ID，創建一個
          userId = 'default_user_' + Math.random().toString(36).substring(2, 15);
          localStorage.setItem(DEFAULT_USER_KEY, userId);
          console.log('創建默認用戶 ID 用於保存消息:', userId);
        }
      }
    }
    
    const messagesKey = `messages_${sessionUuid}`;
    return setUserData(userId, messagesKey, messages);
  } catch (error) {
    console.error('保存會話消息失敗:', error);
    return false;
  }
}

// 獲取當前用戶的聊天會話列表
export function getUserSessionsList(userId) {
  return getUserData(userId, 'chatSessionsList', []);
}

// 獲取當前用戶的角色列表
export function getUserCharacters(userId) {
  return getUserData(userId, 'myCharacters', []);
}

// 保存用戶的會話列表
export function saveUserSessionsList(userId, sessions) {
  return setUserData(userId, 'chatSessionsList', sessions);
}

// 更新特定會話信息
export function updateUserSession(userId, sessionUuid, updates) {
  const sessionsList = getUserSessionsList(userId);
  const updatedSessions = sessionsList.map(session => {
    if (session.sessionUuid === sessionUuid) {
      return { ...session, ...updates };
    }
    return session;
  });
  
  return saveUserSessionsList(userId, updatedSessions);
}

// 初始化新用戶數據
export function initializeNewUser(userId, session) {
  try {
    if (!userId) {
      console.warn('嘗試初始化新用戶，但用戶 ID 為空');
      return false;
    }
    
    console.log(`開始初始化新用戶 ${userId} 的數據`);
    
    // 檢查是否是新用戶（與上次登錄的用戶不同）
    const lastUserId = localStorage.getItem(LAST_USER_KEY);
    if (lastUserId === userId) {
      console.log(`用戶 ${userId} 已經登錄過，不需要初始化`);
      return false;
    }
    
    // 保存當前用戶 ID 為上次登錄的用戶 ID
    localStorage.setItem(LAST_USER_KEY, userId);
    
    // 清除所有本地存儲數據
    clearAllUserData();
    
    // 初始化用戶個人資料
    if (session?.user) {
      const defaultProfile = {
        name: session.user.name || '',
        email: session.user.email || '',
        avatar: session.user.image || '',
        apiKey: '',
        apiKeys: {},
        defaultModel: 'gpt-3.5-turbo'
      };
      
      setUserData(userId, 'userProfile', defaultProfile);
    }
    
    // 初始化空的聊天列表
    setUserData(userId, 'chatList', []);
    
    // 初始化空的好友列表
    setUserData(userId, 'friendsList', []);
    
    // 初始化空的角色列表
    setUserData(userId, 'myCharacters', []);
    
    console.log(`用戶 ${userId} 的數據初始化完成`);
    return true;
  } catch (error) {
    console.error(`初始化用戶 ${userId} 的數據失敗:`, error);
    return false;
  }
}

// 清除所有本地存儲數據（不區分用戶）
export function clearAllUserData() {
  try {
    console.log('開始清除所有本地存儲數據');
    
    // 保存一些需要保留的系統設置
    const lastUserId = localStorage.getItem(LAST_USER_KEY);
    
    // 清除所有 localStorage
    localStorage.clear();
    
    // 恢復需要保留的系統設置
    if (lastUserId) {
      localStorage.setItem(LAST_USER_KEY, lastUserId);
    }
    
    // 清除所有 sessionStorage
    sessionStorage.clear();
    
    console.log('所有本地存儲數據已清除');
    return true;
  } catch (error) {
    console.error('清除所有本地存儲數據失敗:', error);
    return false;
  }
}

// 清除特定用戶的所有數據
export function clearUserData(userId) {
  try {
    if (!userId) {
      console.warn('嘗試清除用戶數據，但用戶 ID 為空');
      return false;
    }
    
    console.log(`開始清除用戶 ${userId} 的所有數據`);
    
    // 獲取所有 localStorage 鍵
    const allKeys = Object.keys(localStorage);
    
    // 計數器
    let removedCount = 0;
    
    // 用戶特定的前綴
    const userPrefix = `user_${userId}_`;
    
    // 遍歷所有鍵
    for (const key of allKeys) {
      // 如果鍵以用戶前綴開頭，則刪除
      if (key.startsWith(userPrefix)) {
        localStorage.removeItem(key);
        removedCount++;
      }
    }
    
    console.log(`已清除用戶 ${userId} 的 ${removedCount} 個數據項`);
    return true;
  } catch (error) {
    console.error(`清除用戶 ${userId} 的數據失敗:`, error);
    return false;
  }
} 
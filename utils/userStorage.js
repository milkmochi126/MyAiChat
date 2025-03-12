// 用戶存儲工具 - 全部使用API而非本地儲存

// 獲取安全的用戶 ID（確保即使 id 不存在也能正常運行）
export function getSafeUserId(session) {
  try {
    if (session?.user?.id) {
      return session.user.id;
    }
    return null;
  } catch (error) {
    console.error('獲取安全用戶 ID 失敗:', error);
    return null;
  }
}

// 以下函數保留API，但移除了本地儲存功能

// 原本從localStorage獲取數據的函數，現在僅返回默認值
export function getUserData(userId, key, defaultValue = null) {
  console.log(`getUserData已不再支持本地儲存，返回默認值: ${key}`);
  return defaultValue;
}

// 原本向localStorage寫入數據的函數，現在不執行任何操作
export function setUserData(userId, key, value) {
  console.log(`setUserData已不再支持本地儲存，忽略: ${key}`);
  return true;
}

// 原本刪除用戶特定數據的函數，現在不執行任何操作
export function removeUserData(userId, key) {
  console.log(`removeUserData已不再支持本地儲存，忽略: ${key}`);
  return true;
}

// 原本獲取用戶會話消息的函數，現在僅返回空數組
export function getUserSessionMessages(userId, sessionUuid) {
  console.log(`getUserSessionMessages已不再支持本地儲存，返回空數組`);
  return [];
}

// 原本保存用戶會話消息的函數，現在不執行任何操作
export function saveUserSessionMessages(userId, sessionUuid, messages) {
  console.log(`saveUserSessionMessages已不再支持本地儲存，忽略`);
  return true;
}

// 原本獲取用戶會話列表的函數，現在僅返回空數組
export function getUserSessionsList(userId) {
  console.log(`getUserSessionsList已不再支持本地儲存，返回空數組`);
  return [];
}

// 原本獲取用戶角色的函數，現在僅返回空數組
export function getUserCharacters(userId) {
  console.log(`getUserCharacters已不再支持本地儲存，返回空數組`);
  return [];
}

// 原本保存用戶會話列表的函數，現在不執行任何操作
export function saveUserSessionsList(userId, sessions) {
  console.log(`saveUserSessionsList已不再支持本地儲存，忽略`);
  return true;
}

// 原本更新用戶會話的函數，現在不執行任何操作
export function updateUserSession(userId, sessionUuid, updates) {
  console.log(`updateUserSession已不再支持本地儲存，忽略`);
  return true;
}

// 初始化新用戶 - 不再將數據保存到本地
export function initializeNewUser(userId, session) {
  console.log(`initializeNewUser已不再支持本地儲存，忽略`);
  return true;
}

// 清除所有用戶數據 - 不再需要
export function clearAllUserData() {
  console.log(`clearAllUserData已不再支持本地儲存，忽略`);
  return true;
}

// 清除特定用戶數據 - 不再需要
export function clearUserData(userId) {
  console.log(`clearUserData已不再支持本地儲存，忽略`);
  return true;
} 
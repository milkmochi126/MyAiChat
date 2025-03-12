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

// 以下函數已被棄用，改為使用數據庫

// 遷移舊數據 - 已不再需要
export const migrateOldChatData = () => {
  console.log('migrateOldChatData已不再支持本地儲存，忽略');
  return null;
};

// 創建新的對話會話 - 已由API替代
export function createNewSession(character) {
  console.log('createNewSession已不再支持本地儲存，請使用API');
  return null;
}

// 複製會話 - 已由API替代
export function forkSession(sessionUuid, sessionsList) {
  console.log('forkSession已不再支持本地儲存，請使用API');
  return null;
}

// 獲取會話消息 - 已由API替代
export function getSessionMessages(sessionUuid) {
  console.log('getSessionMessages已不再支持本地儲存，請使用API');
  return [];
}

// 更新會話 - 已由API替代
export function updateSession(sessionUuid, updates, sessionsList) {
  console.log('updateSession已不再支持本地儲存，請使用API');
  return false;
} 
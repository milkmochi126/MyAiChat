from typing import Dict, List, Any, Optional
import asyncio
from model_factory import ModelFactory
from memory_manager import memory_manager
from affinity_evaluator import affinity_evaluator

class ChatManager:
    """
    聊天管理器，處理聊天請求和對話管理
    """
    
    def __init__(self):
        """初始化聊天管理器"""
        # 存儲不同用戶和角色的對話歷史
        self._chat_histories = {}  # 用戶ID -> 角色ID -> 對話歷史
        
        # 存儲不同用戶和角色的好感度
        self._affinities = {}  # 用戶ID -> 角色ID -> 好感度值
        
        # 默認起始好感度
        self._default_affinity = 0  # 範圍為 0-100
    
    def get_chat_history(self, user_id: str, character_id: str) -> List[Dict[str, str]]:
        """
        獲取特定用戶和角色的對話歷史
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            
        返回:
            對話歷史列表
        """
        # 確保用戶ID存在
        if user_id not in self._chat_histories:
            self._chat_histories[user_id] = {}
        
        # 確保角色ID存在
        if character_id not in self._chat_histories[user_id]:
            self._chat_histories[user_id][character_id] = []
        
        return self._chat_histories[user_id][character_id]
    
    def add_message(self, user_id: str, character_id: str, role: str, content: str) -> None:
        """
        添加消息到對話歷史
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            role: 消息角色（"user" 或 "assistant"）
            content: 消息內容
        """
        chat_history = self.get_chat_history(user_id, character_id)
        chat_history.append({
            "role": role,
            "content": content
        })
        
        # 管理對話歷史長度，避免無限增長
        if len(chat_history) > 50:  # 保留最多 50 條消息
            self._chat_histories[user_id][character_id] = chat_history[-50:]
    
    def reset_chat(self, user_id: str, character_id: str) -> None:
        """
        重置特定用戶和角色的對話歷史
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
        """
        if user_id in self._chat_histories and character_id in self._chat_histories[user_id]:
            self._chat_histories[user_id][character_id] = []
    
    def reset_all_chats(self, user_id: Optional[str] = None) -> None:
        """
        重置所有對話或特定用戶的所有對話
        
        參數:
            user_id: 用戶ID（可選，如果提供則只重置該用戶的對話）
        """
        if user_id:
            if user_id in self._chat_histories:
                self._chat_histories[user_id] = {}
        else:
            self._chat_histories = {}
    
    def get_affinity(self, user_id: str, character_id: str) -> int:
        """
        獲取特定用戶和角色的好感度
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            
        返回:
            好感度值
        """
        # 確保用戶ID存在
        if user_id not in self._affinities:
            self._affinities[user_id] = {}
        
        # 確保角色ID存在，並使用默認好感度
        if character_id not in self._affinities[user_id]:
            self._affinities[user_id][character_id] = self._default_affinity
        
        return self._affinities[user_id][character_id]
    
    def update_affinity(self, user_id: str, character_id: str, change: int) -> int:
        """
        更新特定用戶和角色的好感度
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            change: 好感度變化值
            
        返回:
            更新後的好感度值
        """
        current_affinity = self.get_affinity(user_id, character_id)
        new_affinity = max(0, min(100, current_affinity + change))  # 確保範圍在 0-100 之間
        self._affinities[user_id][character_id] = new_affinity
        return new_affinity
    
    def set_affinity(self, user_id: str, character_id: str, value: int) -> int:
        """
        設置特定用戶和角色的好感度
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            value: 好感度值
            
        返回:
            設置後的好感度值
        """
        # 確保好感度在有效範圍內
        affinity = max(0, min(100, value))
        
        # 確保用戶ID存在
        if user_id not in self._affinities:
            self._affinities[user_id] = {}
        
        # 設置好感度
        self._affinities[user_id][character_id] = affinity
        return affinity
    
    async def process_chat(self, api_key: str, character_id: str, message: str, 
                         user_id: str = "default_user", reset_context: bool = False, 
                         model_type: str = "gemini", character: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        處理聊天請求
        
        參數:
            api_key: API密鑰
            character_id: 角色ID
            message: 用戶消息
            user_id: 用戶ID
            reset_context: 是否重置對話上下文
            model_type: 模型類型
            character: 角色設定（可選）
            
        返回:
            處理結果的字典
        """
        print(f"收到聊天請求: user_id={user_id}, character_id={character_id}, model_type={model_type}")
        
        try:
            # 確保API Key存在
            if not api_key:
                return {
                    "success": False,
                    "error": "缺少 API 金鑰",
                    "details": "請在設定頁面中添加對應模型的 API 金鑰",
                    "status_code": 400
                }
            
            # 確保角色設定存在
            if not character:
                return {
                    "success": False,
                    "error": "缺少角色設定",
                    "details": f"找不到ID為 {character_id} 的角色設定",
                    "status_code": 404
                }
            
            # 如果請求重置上下文，刪除當前對話歷史
            if reset_context:
                self.reset_chat(user_id, character_id)
            
            # 獲取對話歷史
            chat_history = self.get_chat_history(user_id, character_id)
            
            # 添加用戶消息到歷史記錄
            self.add_message(user_id, character_id, "user", message)
            
            # 獲取模型處理器
            model_handler = ModelFactory.get_model_handler(model_type)
            
            # 調用模型生成回應
            print(f"開始生成回應，使用模型: {model_type}")
            result = await model_handler.generate_response(
                api_key, 
                message, 
                chat_history, 
                character, 
                user_id, 
                character_id
            )
            
            # 處理API響應
            if not result["success"]:
                print(f"生成回應失敗: {result.get('error', '未知錯誤')}")
                return result
            
            ai_reply = result["reply"]
            print(f"成功生成回應，長度: {len(ai_reply)}")
            
            # 將AI回覆添加到對話歷史
            self.add_message(user_id, character_id, "assistant", ai_reply)
            
            # 啟動後台任務來更新角色記憶
            asyncio.create_task(self._update_memory(
                api_key,
                user_id,
                character_id,
                character,
                chat_history,
                model_type
            ))
            
            # 獲取當前好感度
            current_affinity = self.get_affinity(user_id, character_id)
            
            # 評估好感度變化
            affinity_change = await affinity_evaluator.evaluate_affinity_change(
                api_key,
                character,
                message,
                ai_reply,
                current_affinity
            )
            
            # 更新好感度
            new_affinity = self.update_affinity(user_id, character_id, affinity_change)
            print(f"好感度變化: {affinity_change}, 新好感度: {new_affinity}")
            
            # 返回結果
            return {
                "success": True,
                "reply": ai_reply, 
                "history_length": len(chat_history),
                "affinity": new_affinity,
                "affinity_change": affinity_change
            }
            
        except Exception as e:
            # 捕獲所有其他錯誤
            import traceback
            error_trace = traceback.format_exc()
            error_msg = f"處理聊天請求時發生錯誤: {str(e)}"
            print(error_msg)
            print(f"錯誤詳情:\n{error_trace}")
            
            return {
                "success": False,
                "error": "處理聊天請求時發生錯誤",
                "details": str(e),
                "status_code": 500
            }
    
    async def _update_memory(self, api_key: str, user_id: str, character_id: str, 
                           character: Dict[str, Any], chat_history: List[Dict[str, str]], 
                           model_type: str) -> None:
        """
        更新角色記憶的後台任務
        
        參數:
            api_key: API密鑰
            user_id: 用戶ID
            character_id: 角色ID
            character: 角色設定
            chat_history: 對話歷史
            model_type: 模型類型
        """
        try:
            # 只使用最近的對話，減輕計算負擔
            recent_messages = chat_history[-10:]
            
            # 使用記憶管理器生成記憶
            new_memory = await memory_manager.generate_memory_from_conversation(
                api_key, 
                character, 
                recent_messages, 
                model_type
            )
            
            # 獲取現有記憶
            existing_memory = await memory_manager.get_memory(user_id, character_id)
            
            # 合併新記憶和現有記憶（避免重複）
            for category in ["personal_info", "preferences", "important_events"]:
                for item in new_memory[category]:
                    if item not in existing_memory[category]:
                        existing_memory[category].append(item)
            
            # 更新記憶
            await memory_manager.update_memory(user_id, character_id, existing_memory)
            
            print(f"已更新 {user_id} 對 {character_id} 的記憶")
            
        except Exception as e:
            print(f"更新記憶時出錯: {str(e)}")
            import traceback
            print(f"錯誤詳情:\n{traceback.format_exc()}")

# 創建聊天管理器的單例實例
chat_manager = ChatManager() 
from typing import Dict, List, Any, Optional
import requests
import json
import os
import sys
import asyncio
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 資料庫設定
DB_URL = os.getenv("DATABASE_URL")

class MemoryManager:
    """
    管理角色的記憶，包括用戶信息、偏好和重要事件
    """
    
    def __init__(self):
        """初始化記憶管理器"""
        # 存儲不同用戶和角色的記憶
        self._memories = {}  # 用戶ID -> 角色ID -> 記憶數據
        self._memories_cache = {}  # 用於緩存記憶的字典
        self._connected = False
        self.conn = None
    
    async def ensure_connected(self):
        """確保與數據庫的連接已建立"""
        if self._connected and self.conn:
            # 檢查連接是否仍然有效
            try:
                with self.conn.cursor() as cur:
                    cur.execute("SELECT 1")
                return  # 連接有效，直接返回
            except Exception:
                # 連接已斷開，需要重新連接
                self._connected = False
                try:
                    self.conn.close()
                except:
                    pass  # 忽略關閉錯誤
                self.conn = None
        
        # 嘗試連接數據庫
        try:
            self.conn = psycopg2.connect(DB_URL)
            self.conn.autocommit = True
            self._connected = True
            print("成功連接到記憶數據庫")
        except Exception as e:
            self._connected = False
            self.conn = None
            print(f"連接記憶數據庫時出錯: {str(e)}")
            raise
    
    async def get_memory(self, user_id: str, character_id: str) -> Dict[str, List[str]]:
        """
        獲取特定用戶和角色的記憶
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            
        返回:
            包含個人信息、偏好和重要事件的記憶字典
        """
        # 如果有緩存，直接返回
        cache_key = f"{user_id}_{character_id}"
        if cache_key in self._memories_cache:
            return self._memories_cache[cache_key]
        
        # 初始化空記憶結構
        memory = {
            "personal_info": [],
            "preferences": [],
            "important_events": []
        }
        
        # 嘗試確保資料庫連接
        try:
            await self.ensure_connected()
        except Exception as e:
            print(f"確保資料庫連接時出錯: {str(e)}")
            # 資料庫連接失敗，返回空記憶
            self._memories_cache[cache_key] = memory
            return memory
        
        # 如果沒有數據庫連接，返回空記憶
        if not self._connected or not self.conn:
            print("無法連接到資料庫，返回空記憶")
            self._memories_cache[cache_key] = memory
            return memory
        
        # 從資料庫獲取記憶
        try:  
            with self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                print(f"查詢用戶 {user_id} 與角色 {character_id} 的記憶")
                cur.execute("""
                    SELECT memory_type, content
                    FROM memories
                    WHERE user_id = %s AND character_id = %s
                """, (user_id, character_id))
                
                for row in cur.fetchall():
                    if row['memory_type'] in memory:
                        memory[row['memory_type']].append(row['content'])
                
                print(f"從資料庫找到 {sum(len(items) for items in memory.values())} 條記憶項目")
            
            # 緩存記憶
            self._memories_cache[cache_key] = memory
            return memory
        
        except Exception as e:
            print(f"從數據庫獲取記憶時出錯: {str(e)}")
            import traceback
            print(traceback.format_exc())
            
            # 發生錯誤，返回空記憶
            self._memories_cache[cache_key] = memory
            return memory
    
    async def update_memory(self, user_id: str, character_id: str, memory: Dict[str, List[str]]) -> None:
        """
        更新特定用戶和角色的記憶
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            memory: 新的記憶數據
        """
        # 更新內存緩存
        cache_key = f"{user_id}_{character_id}"
        self._memories_cache[cache_key] = memory
        
        # 如果沒有數據庫連接，只更新緩存
        if not self._connected or not self.conn:
            print("警告：沒有數據庫連接，記憶只保存在內存中")
            return
        
        try:
            await self.ensure_connected()
            
            # 獲取當前數據庫中的記憶
            current_db_memories = {}
            
            with self.conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
                cur.execute("""
                    SELECT id, memory_type, content
                    FROM memories
                    WHERE user_id = %s AND character_id = %s
                """, (user_id, character_id))
                
                for row in cur.fetchall():
                    if row['memory_type'] not in current_db_memories:
                        current_db_memories[row['memory_type']] = {}
                    current_db_memories[row['memory_type']][row['content']] = row['id']
            
            # 處理每種記憶類型
            with self.conn.cursor() as cur:
                for memory_type, items in memory.items():
                    existing_items = current_db_memories.get(memory_type, {})
                    
                    # 添加新項目
                    for item in items:
                        if item not in existing_items:
                            cur.execute("""
                                INSERT INTO memories (user_id, character_id, memory_type, content)
                                VALUES (%s, %s, %s, %s)
                            """, (user_id, character_id, memory_type, item))
                    
                    # 刪除移除的項目
                    db_items = set(existing_items.keys())
                    current_items = set(items)
                    items_to_delete = db_items - current_items
                    
                    for item in items_to_delete:
                        item_id = existing_items[item]
                        cur.execute("DELETE FROM memories WHERE id = %s", (item_id,))
            
            print(f"已更新用戶 {user_id} 與角色 {character_id} 的記憶到數據庫")
            
        except Exception as e:
            print(f"更新記憶到數據庫時出錯: {str(e)}")
            import traceback
            print(traceback.format_exc())
    
    async def add_personal_info(self, user_id: str, character_id: str, info: str) -> None:
        """
        添加用戶個人信息到記憶
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            info: 要添加的個人信息
        """
        memory = await self.get_memory(user_id, character_id)
        if info not in memory["personal_info"]:
            memory["personal_info"].append(info)
            await self.update_memory(user_id, character_id, memory)
    
    async def add_preference(self, user_id: str, character_id: str, preference: str) -> None:
        """
        添加用戶偏好到記憶
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            preference: 要添加的偏好
        """
        memory = await self.get_memory(user_id, character_id)
        if preference not in memory["preferences"]:
            memory["preferences"].append(preference)
            await self.update_memory(user_id, character_id, memory)
    
    async def add_important_event(self, user_id: str, character_id: str, event: str) -> None:
        """
        添加重要事件到記憶
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            event: 要添加的重要事件
        """
        memory = await self.get_memory(user_id, character_id)
        if event not in memory["important_events"]:
            memory["important_events"].append(event)
            await self.update_memory(user_id, character_id, memory)
    
    async def get_formatted_memory(self, user_id: str, character_id: str) -> str:
        """
        獲取格式化的記憶文本，用於添加到提示詞中
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
            
        返回:
            格式化的記憶文本
        """
        memory = await self.get_memory(user_id, character_id)
        
        # 如果沒有任何記憶，返回空字符串
        if not any([memory["personal_info"], memory["preferences"], memory["important_events"]]):
            return ""
        
        memory_text = "關於用戶的記憶:\n\n"
        
        if memory["personal_info"]:
            memory_text += "用戶個人資訊:\n" + "\n".join([f"- {info}" for info in memory["personal_info"]]) + "\n\n"
        
        if memory["preferences"]:
            memory_text += "用戶偏好:\n" + "\n".join([f"- {pref}" for pref in memory["preferences"]]) + "\n\n"
        
        if memory["important_events"]:
            memory_text += "重要對話或事件:\n" + "\n".join([f"- {event}" for event in memory["important_events"]]) + "\n\n"
        
        return memory_text
    
    async def clear_memory(self, user_id: str, character_id: str) -> None:
        """
        清除特定用戶和角色的所有記憶
        
        參數:
            user_id: 用戶ID
            character_id: 角色ID
        """
        # 清除內存緩存
        cache_key = f"{user_id}_{character_id}"
        if cache_key in self._memories_cache:
            del self._memories_cache[cache_key]
        
        # 如果沒有數據庫連接，只清除緩存
        if not self._connected or not self.conn:
            return
        
        try:
            await self.ensure_connected()
            
            with self.conn.cursor() as cur:
                cur.execute("""
                    DELETE FROM memories
                    WHERE user_id = %s AND character_id = %s
                """, (user_id, character_id))
            
            print(f"已清除用戶 {user_id} 與角色 {character_id} 的所有記憶")
        except Exception as e:
            print(f"清除記憶時出錯: {str(e)}")
    
    async def generate_memory_from_conversation(self, api_key: str, character: Dict[str, Any], 
                                       recent_messages: List[Dict[str, str]], model_type: str = "gemini") -> Dict[str, List[str]]:
        """
        根據最近的對話生成記憶
        
        參數:
            api_key: API密鑰
            character: 角色設定
            recent_messages: 最近的對話消息
            model_type: 模型類型
            
        返回:
            更新後的記憶
        """
        # 實現這部分會很複雜，涉及調用LLM來分析對話並生成記憶
        # 在此只提供基本框架，實際實現需要更多的工作
        # 這應該在一個單獨的非同步任務中執行，以避免阻塞主對話流程
        
        # 示例實現：使用簡單啟發式方法根據消息中的關鍵詞提取信息
        # 實際實現應該使用LLM或專門的分析工具
        
        memory = {
            "personal_info": [],
            "preferences": [],
            "important_events": []
        }
        
        # 示例：簡單的關鍵詞檢測（實際實現應該使用NLP或LLM）
        for msg in recent_messages:
            if msg["role"] == "user":
                content = msg["content"].lower()
                
                # 檢測個人信息
                if "我是" in content or "我叫" in content or "我的名字" in content:
                    memory["personal_info"].append(f"用戶可能透露了名字：{msg['content']}")
                
                # 檢測偏好
                if "我喜歡" in content or "我愛" in content:
                    memory["preferences"].append(f"用戶表達了喜好：{msg['content']}")
                
                # 檢測重要事件
                if "昨天" in content or "今天" in content or "明天" in content:
                    memory["important_events"].append(f"用戶提到的事件：{msg['content']}")
        
        return memory
    
    async def disconnect(self):
        """斷開與數據庫的連接"""
        if self._connected and self.conn:
            self.conn.close()
            self._connected = False
            print("已斷開與記憶數據庫的連接")

# 單例模式，確保整個應用只有一個記憶管理器實例
memory_manager = MemoryManager() 
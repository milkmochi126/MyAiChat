from abc import ABC, abstractmethod
from typing import Dict, Any, List

class ModelHandler(ABC):
    """
    模型處理器的抽象基類，定義所有模型處理器必須實現的方法
    """
    
    @abstractmethod
    async def generate_response(self, api_key: str, user_message: str, chat_history: List[Dict[str, str]], 
                              character: Dict[str, Any], user_id: str = None, character_id: str = None) -> Dict[str, Any]:
        """
        生成對話回應的抽象方法
        
        參數:
            api_key: API密鑰
            user_message: 用戶消息
            chat_history: 對話歷史
            character: 角色設定
            user_id: 用戶ID（可選）
            character_id: 角色ID（可選）
            
        返回:
            包含成功狀態和回應內容的字典
        """
        pass
    
    @abstractmethod
    def create_prompt(self, character: Dict[str, Any], chat_history: List[Dict[str, str]], 
                     user_message: str, memory_text: str = "") -> str:
        """
        創建提示詞的抽象方法
        
        參數:
            character: 角色設定
            chat_history: 對話歷史
            user_message: 用戶消息
            memory_text: 記憶文本（可選）
            
        返回:
            構建好的提示詞
        """
        pass
    
    @abstractmethod
    def format_messages(self, character: Dict[str, Any], chat_history: List[Dict[str, str]], 
                       user_message: str, memory_text: str = "") -> List[Dict[str, str]]:
        """
        將對話歷史格式化為模型可接受的消息格式
        
        參數:
            character: 角色設定
            chat_history: 對話歷史
            user_message: 用戶消息
            memory_text: 記憶文本（可選）
            
        返回:
            格式化後的消息列表
        """
        pass
    
    @abstractmethod
    def post_process_response(self, response: str, character: Dict[str, Any]) -> str:
        """
        處理模型回應的抽象方法
        
        參數:
            response: 原始模型回應
            character: 角色設定
            
        返回:
            處理後的回應
        """
        pass 
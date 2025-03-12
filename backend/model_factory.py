from typing import Dict, Any
from model_interface import ModelHandler
from gemini_handler import GeminiHandler
from openai_handler import OpenAIHandler
from claude_handler import ClaudeHandler

class ModelFactory:
    """
    模型工廠類，用於創建適合的模型處理器
    """
    
    @staticmethod
    def get_model_handler(model_type: str) -> ModelHandler:
        """
        根據模型類型返回相應的處理器實例
        
        參數:
            model_type: 模型類型，可選 "gemini", "openai", "claude"
            
        返回:
            ModelHandler的實例
        """
        model_type = model_type.lower()
        
        if model_type == "gemini":
            return GeminiHandler()
        elif model_type == "openai":
            return OpenAIHandler()
        elif model_type == "claude":
            return ClaudeHandler()
        else:
            # 默認返回Gemini處理器
            return GeminiHandler()
    
    @staticmethod
    def get_supported_models() -> Dict[str, str]:
        """
        獲取支持的模型和它們的描述
        
        返回:
            包含模型類型及其描述的字典
        """
        return {
            "gemini": "Gemini 1.5 Flash - Google的大型語言模型",
            "openai": "GPT-3.5 Turbo - OpenAI的對話模型",
            "claude": "Claude 3 Sonnet - Anthropic的對話模型"
        } 
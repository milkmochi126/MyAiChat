import re
import requests
import json
from typing import Dict, Any

class AffinityEvaluator:
    """
    評估對話中的好感度變化
    """
    
    def __init__(self):
        """初始化好感度評估器"""
        self.gemini_api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    
    async def evaluate_affinity_change(self, api_key: str, character: Dict[str, Any], 
                                    user_message: str, ai_reply: str, current_affinity: int) -> int:
        """
        評估對話內容對好感度的影響
        
        參數:
            api_key: API密鑰
            character: 角色設定
            user_message: 用戶消息
            ai_reply: AI回覆
            current_affinity: 當前好感度
            
        返回:
            好感度變化值（-5到+5之間的整數）
        """
        # 設置評估提示詞
        eval_prompt = f"""作為 {character['name']} 這個角色，基於以下對話評估好感度變化：

用戶訊息: {user_message}

{character['name']} 的回應: {ai_reply}

當前好感度: {current_affinity}/100

請僅回覆一個介於 -5 到 +5 之間的整數，代表好感度的變化值。正數表示好感增加，負數表示好感下降。
請考慮:
1. 用戶的態度是否友善、尊重
2. 用戶的回應是否符合 {character['name']} 的喜好或特性
3. 對話是否融洽、有趣或深入

只需回覆一個數字，例如 "+2" 或 "-1"。不要提供任何解釋。"""

        # 構建請求
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": eval_prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,  # 低溫度，讓回答更確定
                "topP": 0.95,
                "topK": 40,
            }
        }
        
        headers = {"Content-Type": "application/json"}
        
        try:
            # 發送評估請求
            api_url = f"{self.gemini_api_url}?key={api_key}"
            response = requests.post(api_url, headers=headers, json=payload)
            
            if response.status_code != 200:
                print(f"好感度評估 API 錯誤: {response.text}")
                return 0  # 發生錯誤時不改變好感度
            
            # 解析回應
            result = response.json()
            change_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # 從回應中提取數字
            matches = re.findall(r'[+-]?\d+', change_text)
            if matches:
                change = int(matches[0])
                # 限制變化範圍在 -5 到 +5 之間
                change = max(-5, min(5, change))
                return change
            else:
                return 0  # 如果無法解析數字，不改變好感度
                
        except Exception as e:
            print(f"評估好感度時發生錯誤: {str(e)}")
            return 0  # 發生錯誤時不改變好感度

# 創建單例實例
affinity_evaluator = AffinityEvaluator() 
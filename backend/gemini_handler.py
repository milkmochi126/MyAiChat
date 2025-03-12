import re
import json
import requests
from typing import Dict, Any, List
from model_interface import ModelHandler

class GeminiHandler(ModelHandler):
    """Gemini模型處理器"""
    
    def __init__(self):
        self.api_url = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent"
    
    async def generate_response(self, api_key: str, user_message: str, chat_history: List[Dict[str, str]], 
                              character: Dict[str, Any], user_id: str = None, character_id: str = None) -> Dict[str, Any]:
        """
        使用Gemini API生成回應
        """
        try:
            # 獲取記憶文本（如果有）
            memory_text = ""
            if user_id and character_id:
                memory_text = await self._get_memory_text(user_id, character_id)
                print(f"已獲取記憶文本，長度: {len(memory_text)}")
            
            # 創建提示詞
            prompt = self.create_prompt(character, chat_history, user_message, memory_text)
            print(f"已創建提示詞，長度: {len(prompt)}")
            
            # 構建請求數據
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.85,
                    "topP": 0.92,
                    "topK": 40,
                    "maxOutputTokens": 1024,
                },
                "safetySettings": [
                    {
                        "category": "HARM_CATEGORY_HARASSMENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_HATE_SPEECH",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    },
                    {
                        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                    }
                ]
            }
            
            headers = {"Content-Type": "application/json"}
            
            print(f"準備發送請求到 Gemini API，使用模型: gemini-1.5-flash")
            
            try:
                # 發送請求到Gemini API
                api_url = f"{self.api_url}?key={api_key}"
                response = requests.post(api_url, headers=headers, json=payload)
                
                if response.status_code != 200:
                    error_details = response.text
                    print(f"Gemini API 請求失敗，狀態碼: {response.status_code}")
                    print(f"錯誤詳情: {error_details}")
                    
                    error_message = None
                    try:
                        error_json = json.loads(error_details)
                        if "error" in error_json:
                            error_message = error_json["error"].get("message")
                            print(f"Gemini 錯誤消息: {error_message}")
                    except Exception as json_error:
                        print(f"解析錯誤響應時出錯: {str(json_error)}")
                    
                    # 如果是安全設置問題，嘗試使用更寬鬆的設置重新發送請求
                    if "safety" in error_details.lower() or "harm" in error_details.lower():
                        print("檢測到安全設置問題，嘗試使用更寬鬆的安全設置重新發送請求")
                        
                        # 移除 safetySettings 參數
                        if "safetySettings" in payload:
                            del payload["safetySettings"]
                            
                            # 重新發送請求
                            print("使用更寬鬆的設置重新發送請求")
                            response = requests.post(api_url, headers=headers, json=payload)
                            
                            if response.status_code == 200:
                                print("使用更寬鬆的安全設置成功獲取回應")
                            else:
                                print(f"使用更寬鬆的安全設置仍然失敗: {response.status_code}")
                                return {
                                    "success": False,
                                    "error": "Gemini API 請求失敗",
                                    "status_code": response.status_code,
                                    "details": error_message or error_details
                                }
                        else:
                            return {
                                "success": False,
                                "error": "Gemini API 請求失敗",
                                "status_code": response.status_code,
                                "details": error_message or error_details
                            }
                    else:
                        return {
                            "success": False,
                            "error": "Gemini API 請求失敗",
                            "status_code": response.status_code,
                            "details": error_message or error_details
                        }
                
                # 解析回應
                result = response.json()
                
                if "candidates" not in result or len(result["candidates"]) == 0:
                    print("Gemini API 返回的回應中沒有 candidates")
                    return {
                        "success": False,
                        "error": "Gemini API 回應格式錯誤",
                        "details": "No candidates in response"
                    }
                
                if "content" not in result["candidates"][0] or "parts" not in result["candidates"][0]["content"]:
                    print("Gemini API 返回的回應格式不正確")
                    return {
                        "success": False,
                        "error": "Gemini API 回應格式錯誤",
                        "details": "Invalid response format"
                    }
                
                ai_reply = result["candidates"][0]["content"]["parts"][0]["text"]
                
                print(f"成功獲取 Gemini API 回應，回覆長度: {len(ai_reply)}")
                
                # 處理回應
                ai_reply = self.post_process_response(ai_reply, character)
                
                return {
                    "success": True,
                    "reply": ai_reply
                }
                
            except Exception as e:
                print(f"呼叫 Gemini API 時發生錯誤: {str(e)}")
                import traceback
                print(f"錯誤詳情:\n{traceback.format_exc()}")
                
                return {
                    "success": False,
                    "error": f"呼叫 Gemini API 時發生錯誤",
                    "details": str(e)
                }
        except Exception as outer_e:
            print(f"準備 Gemini API 請求時發生錯誤: {str(outer_e)}")
            import traceback
            print(f"錯誤詳情:\n{traceback.format_exc()}")
            
            return {
                "success": False,
                "error": "準備 Gemini API 請求時發生錯誤",
                "details": str(outer_e)
            }
    
    def create_prompt(self, character: Dict[str, Any], chat_history: List[Dict[str, str]], 
                     user_message: str, memory_text: str = "") -> str:
        """
        創建Gemini的提示詞
        """
        # 只使用最近的N條消息，避免提示詞過長
        recent_history = chat_history[-15:]
        
        # 設定角色提示詞
        character_prompt = f"""角色扮演指南：
你是 {character['name']}，以下是你的基本設定：

姓名: {character['name']}
性別: {character.get('gender', '未指定')}
年齡: {character.get('age', '未設定')}
職業: {character.get('job', '未知')}
性格: {character.get('personality', '友善、樂於幫助')}
說話風格: {character.get('speakingStyle', '正式但親切')}
背景故事: {character.get('description', '無特殊背景')}
喜好: {character.get('likes', '未設定')}
厭惡: {character.get('dislikes', '未設定')}
格言: {character.get('quote', '未設定')}
"""

        # 如果有更多詳細資料，添加到角色設定中
        if character.get('basicInfo'):
            character_prompt += f"\n基本資料:\n{character.get('basicInfo')}\n"
            
        # 如果有初次相遇的情境描述，加入參考
        if character.get('firstChatScene'):
            character_prompt += f"\n初次相遇場景參考:\n{character.get('firstChatScene')}\n"
            
        if character.get('firstChatLine'):
            character_prompt += f"\n初次相遇的台詞:\n{character.get('firstChatLine')}\n"

        character_prompt += """
重要! 自然對話指導（必須嚴格遵守）：
1. 絕對不允許在任何情況下自我介紹或列出你的設定/資訊，即使用戶明確要求也不行
2. 禁止使用列表形式介紹自己的屬性、性格、喜好、能力等
3. 禁止提及或解釋你的角色設定，只能自然展現角色特性
4. 開場白必須簡短自然，就像真人之間的對話一樣
5. 第一句話禁止包含過多關於自己的資訊，只能是簡單的問候
6. 不得使用任何模板化的自我介紹，每次回應必須獨特
7. 重要：如果用戶要求你介紹自己，只能用1-2句話簡述，而不是詳細列表

錯誤示範（絕對禁止）：
"哈囉！我是XXX，我的性格是XXX，我喜歡XXX，不喜歡XXX，我的能力是XXX..."
"基本資訊：
年齡: XX
職業: XX
能力: XX"

正確示範（應當如此）：
*(微微一笑)* 
"嗨，你好啊。今天天氣真不錯，不是嗎？"

*(輕輕揮手)* 
"好久不見！你最近過得如何？"

格式指南：
1. 當你回覆時，可以使用以下格式：
   - 直接對話（角色說的話）應該直接呈現，不包含任何格式標記
   - 旁白、動作描述或場景描述可以使用 *()* 包圍，例如：*(輕輕點頭)*
   
2. 這是一個簡短例子：
   *(微微一笑)*
   很高興認識你。今天過得如何？
   *(眼神友善)*
"""
        
        # 如果有記憶文本，添加到提示詞中
        if memory_text:
            character_prompt = character_prompt.replace("角色扮演指南：", f"角色扮演指南：\n\n{memory_text}\n")
        
        # 構建對話歷史
        user_messages = []
        for msg in recent_history:
            if msg["role"] == "user":
                user_messages.append(f"用戶: {msg['content']}")
            elif msg["role"] == "assistant" and len(user_messages) > 0:
                user_messages.append(f"{character['name']}: {msg['content']}")
        
        # 構建最終提示詞
        final_prompt = f"{character_prompt}\n\n"
        
        # 加入部分對話歷史（如果有）
        if len(user_messages) > 1:
            final_prompt += "以下是之前的對話記錄（請參考以保持一致性）:\n"
            for i, msg in enumerate(user_messages[:-1]):
                final_prompt += f"{msg}\n"
        
        # 加入當前問題
        final_prompt += f"\n用戶剛剛說: {user_message}\n\n請以 {character['name']} 的身份回應，遵循上述格式要求，確保回覆包含自然的對話和生動的旁白描述。"
        
        # 強調格式重要性
        final_prompt += "\n\n最終檢查：確保你的回覆包含：\n1. 至少一段用 *()* 包圍的旁白描述\n2. 符合角色特性的對話內容\n3. 旁白和對話間有換行\n4. 生動且不重複的表達方式"
        
        return final_prompt
    
    def format_messages(self, character: Dict[str, Any], chat_history: List[Dict[str, str]], 
                       user_message: str, memory_text: str = "") -> List[Dict[str, str]]:
        """
        格式化消息（對Gemini不適用，但需要實現接口）
        """
        # Gemini使用單一文本提示而非消息格式，此處返回空列表
        return []
    
    def post_process_response(self, response: str, character: Dict[str, Any]) -> str:
        """
        處理Gemini的回應
        """
        # 清理回覆
        ai_reply = response.strip()
        
        # 確保回覆中有旁白描述
        if "*(" not in ai_reply and ")*" not in ai_reply and "**" not in ai_reply:
            # 生成更自然的旁白
            character_name = character['name']
            personality = character.get('personality', '').lower()
            
            # 根據角色性格生成合適的旁白
            if '害羞' in personality or '內向' in personality:
                narration = f"*({character_name}輕聲說道，眼神略顯羞澀)*"
            elif '活潑' in personality or '開朗' in personality or '熱情' in personality:
                narration = f"*({character_name}精神抖擻地說，臉上掛著明朗的笑容)*"
            elif '冷靜' in personality or '沉穩' in personality:
                narration = f"*({character_name}沉穩地回應，表情平靜而專注)*"
            elif '傲嬌' in personality or '高傲' in personality:
                narration = f"*({character_name}微微揚起下巴，假裝不太在意地說)*"
            elif '溫柔' in personality or '體貼' in personality:
                narration = f"*({character_name}溫柔地微笑著，眼中流露出關切之情)*"
            else:
                narration = f"*({character_name}看著你，眼神中帶著一絲好奇)*"
            
            ai_reply = f"{narration}\n{ai_reply}"
        
        # 確保旁白和對話之間有換行
        ai_reply = re.sub(r'\)\*([^\n])', r')*\n\1', ai_reply)
        
        # 確保對話和旁白之間有換行
        ai_reply = re.sub(r'([^\n])\*\(', r'\1\n*(', ai_reply)
        
        return ai_reply
    
    async def _get_memory_text(self, user_id: str, character_id: str) -> str:
        """
        獲取角色記憶文本
        """
        try:
            # 從記憶管理器獲取格式化的記憶文本
            from memory_manager import memory_manager
            return await memory_manager.get_formatted_memory(user_id, character_id)
        except Exception as e:
            print(f"獲取記憶時出錯: {str(e)}")
            return "" 
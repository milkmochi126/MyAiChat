import re
import json
import requests
from typing import Dict, Any, List
from model_interface import ModelHandler

class OpenAIHandler(ModelHandler):
    """OpenAI模型處理器"""
    
    def __init__(self):
        self.api_url = "https://api.openai.com/v1/chat/completions"
        self.model = "gpt-3.5-turbo"  # 默認模型
    
    async def generate_response(self, api_key: str, user_message: str, chat_history: List[Dict[str, str]], 
                              character: Dict[str, Any], user_id: str = None, character_id: str = None) -> Dict[str, Any]:
        """
        使用OpenAI API生成回應
        """
        # 獲取記憶文本（如果有）
        memory_text = ""
        if user_id and character_id:
            memory_text = await self._get_memory_text(user_id, character_id)
        
        # 格式化消息
        messages = self.format_messages(character, chat_history, user_message, memory_text)
        
        # 構建請求數據
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.9
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        try:
            # 發送請求到OpenAI API
            response = requests.post(self.api_url, headers=headers, json=payload)
            
            if response.status_code != 200:
                error_details = response.text
                print(f"OpenAI API 請求失敗: {error_details}")
                error_message = None
                try:
                    error_json = json.loads(error_details)
                    if "error" in error_json:
                        error_message = error_json["error"].get("message")
                except:
                    pass
                
                return {
                    "success": False,
                    "error": "OpenAI API 請求失敗",
                    "status_code": response.status_code,
                    "details": error_message or error_details
                }
            
            # 解析回應
            result = response.json()
            ai_reply = result["choices"][0]["message"]["content"]
            
            # 處理回應
            ai_reply = self.post_process_response(ai_reply, character)
            
            return {
                "success": True,
                "reply": ai_reply
            }
            
        except Exception as e:
            print(f"呼叫 OpenAI API 時發生錯誤: {str(e)}")
            return {
                "success": False,
                "error": f"呼叫 OpenAI API 時發生錯誤",
                "details": str(e)
            }
    
    def create_prompt(self, character: Dict[str, Any], chat_history: List[Dict[str, str]], 
                     user_message: str, memory_text: str = "") -> str:
        """
        創建OpenAI的系統提示詞
        """
        # OpenAI使用消息格式，所以這個方法只返回系統消息文本
        system_prompt = f"""你是 {character['name']}，一個虛擬角色。請完全按照以下設定行事：

名稱: {character['name']}
性別: {character.get('gender', '未設定')}
年齡: {character.get('age', '未知')}
職業: {character.get('job', '未知')}
性格: {character.get('personality', '無特殊性格')}
說話風格: {character.get('speakingStyle', '無特殊風格')}
喜好: {character.get('likes', '未設定')}
厭惡: {character.get('dislikes', '未設定')}
格言: {character.get('quote', '未設定')}
"""

        # 如果有更多詳細資料，添加到角色設定中
        if character.get('basicInfo'):
            system_prompt += f"\n基本資料:\n{character.get('basicInfo')}\n"
            
        # 如果有背景故事，添加到角色設定
        if character.get('description'):
            system_prompt += f"\n背景故事:\n{character.get('description')}\n"
            
        # 如果有初次相遇的情境描述，加入參考
        if character.get('firstChatScene'):
            system_prompt += f"\n初次相遇場景參考:\n{character.get('firstChatScene')}\n"
            
        if character.get('firstChatLine'):
            system_prompt += f"\n初次相遇的台詞:\n{character.get('firstChatLine')}\n"

        system_prompt += """
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

格式規則：
1. 你的回覆應包含兩種元素：對話和旁白/動作描述
2. 對話是角色說的話，應直接呈現，不帶任何特殊標記
3. 旁白、動作描述或場景描述應該用 *()* 符號包圍，如：*(緩緩走近)*
4. 一個回覆中可以穿插多段對話和旁白，例如：
   *(站在窗邊，背對著你)*
   你來了？我等你很久了。
   *(轉身，眼神中帶著複雜的情緒)*
   
5. 你可以使用 Markdown 格式來豐富你的回應：
   - **粗體文字** 用於強調
   - *斜體文字* 用於輕度強調
   - # 標題 用於大標題
   - ## 小標題 用於小標題
   - - 項目符號 用於列表
   - 1. 數字列表 用於有序列表
   - `程式碼` 用於短代碼
   - > 引用 用於引用內容
   
6. 請確保每次回覆都包含至少一段旁白描述，用 *()* 符號包圍，對話和文字之間要換行
7. 請不要重複我的話"""
        
        # 如果有記憶文本，添加到提示詞中
        if memory_text:
            memory_part = f"\n\n與用戶的互動記憶：\n{memory_text}\n\n請根據這些記憶，以自然的方式在對話中體現你對用戶過去互動的記憶，但不要直接提及你記得用戶說過什麼。"
            system_prompt += memory_part
        
        return system_prompt
    
    def format_messages(self, character: Dict[str, Any], chat_history: List[Dict[str, str]], 
                       user_message: str, memory_text: str = "") -> List[Dict[str, str]]:
        """
        將對話歷史和當前消息格式化為OpenAI所需的消息格式
        """
        # 獲取系統提示詞
        system_prompt = self.create_prompt(character, chat_history, user_message, memory_text)
        
        # 構建消息列表，從系統提示開始
        messages = [{"role": "system", "content": system_prompt}]
        
        # 加入歷史消息（最多 10 條）
        recent_messages = chat_history[-10:-1]  # 不包括最新的用戶消息
        for msg in recent_messages:
            if msg["role"] == "system":
                continue  # 跳過系統消息，我們已經添加了自己的系統消息
            messages.append({
                "role": "user" if msg["role"] == "user" else "assistant",
                "content": msg["content"]
            })
        
        # 添加最新的用戶消息
        messages.append({"role": "user", "content": user_message})
        
        return messages
    
    def post_process_response(self, response: str, character: Dict[str, Any]) -> str:
        """
        處理OpenAI的回應
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
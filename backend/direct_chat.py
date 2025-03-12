import requests
import json
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# Gemini API 設定
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or input("請輸入你的 Gemini API 金鑰: ")

# 角色設定
CHARACTER = {
    "name": input("請輸入角色名稱 (預設為「助手」): ") or "助手",
    "description": input("請輸入角色描述 (預設為「友善的AI助手」): ") or "友善的AI助手",
    "gender": input("請輸入角色性別 (預設為「未指定」): ") or "未指定",
    "personality": input("請輸入角色性格 (預設為「友善、好奇」): ") or "友善、好奇",
    "speakingStyle": input("請輸入角色說話風格 (預設為「友善、自然」): ") or "友善、自然"
}

# 對話歷史
chat_history = []

def init_chat():
    """初始化聊天"""
    system_prompt = f"""你是 {CHARACTER['name']}，{CHARACTER['description']}。請完全按照以下設定行事：

名稱: {CHARACTER['name']}
性別: {CHARACTER.get('gender', '未知')}
職業: {CHARACTER.get('job', '未知')}
背景: {CHARACTER.get('description', '無特殊背景')}

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
7. 請不要重複我的話
"""
    chat_history.append({"role": "system", "content": system_prompt})

def chat_with_gemini(message):
    """與 Gemini API 聊天"""
    # 添加用戶訊息到歷史
    chat_history.append({"role": "user", "content": message})
    
    # 構建 Gemini API 請求
    contents = []
    for msg in chat_history:
        if msg["role"] == "system":
            # 系統提示作為獨立消息
            contents.append({
                "role": "user",
                "parts": [{"text": msg["content"]}]
            })
        elif msg["role"] == "user":
            contents.append({
                "role": "user", 
                "parts": [{"text": msg["content"]}]
            })
        elif msg["role"] == "assistant":
            contents.append({
                "role": "model",
                "parts": [{"text": msg["content"]}]
            })
    
    # 請求設置
    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.9,
            "topP": 0.95,
            "topK": 40,
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    # 發送請求
    print("\n發送請求到 Gemini API...")
    api_url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
    
    try:
        response = requests.post(api_url, headers=headers, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            ai_reply = result["candidates"][0]["content"]["parts"][0]["text"]
            
            # 確保回覆中有旁白描述
            if "*(" not in ai_reply and ")*" not in ai_reply and "**" not in ai_reply:
                ai_reply = f"*({CHARACTER['name']}看著你)*\n{ai_reply}"
            
            # 添加到聊天歷史
            chat_history.append({"role": "assistant", "content": ai_reply})
            
            # 管理聊天歷史長度，避免過長
            if len(chat_history) > 20:
                # 保留系統消息和最近的19條消息
                system_msg = chat_history[0]
                chat_history = [system_msg] + chat_history[-19:]
            
            return ai_reply
        else:
            print(f"❌ Gemini API 請求失敗: {response.status_code}")
            print(f"錯誤詳情: {response.text}")
            return f"發生錯誤，無法獲取回應。錯誤碼: {response.status_code}"
    
    except Exception as e:
        print(f"❌ 請求過程中發生錯誤: {e}")
        return f"發生錯誤: {str(e)}"

def main():
    """主函數"""
    print(f"\n====== 與 {CHARACTER['name']} 聊天 ======")
    print(f"角色描述: {CHARACTER['description']}")
    print("輸入 'exit' 或 'quit' 結束聊天")
    print("輸入 'clear' 清除聊天歷史")
    
    init_chat()
    
    # 初始問候語
    greeting = f"*({CHARACTER['name']}微笑著向你問好)*\n你好！我是{CHARACTER['name']}，很高興認識你。有什麼我能幫你的嗎？"
    print(f"\n{CHARACTER['name']}:")
    print(greeting)
    chat_history.append({"role": "assistant", "content": greeting})
    
    while True:
        user_input = input("\n你: ")
        
        if user_input.lower() in ['exit', 'quit']:
            print(f"\n{CHARACTER['name']}: 再見！希望我們能再次聊天。")
            break
        
        if user_input.lower() == 'clear':
            chat_history.clear()
            init_chat()
            print("\n聊天歷史已清除")
            continue
        
        if not user_input.strip():
            print("請輸入有效的訊息")
            continue
        
        # 獲取回應
        response = chat_with_gemini(user_input)
        
        print(f"\n{CHARACTER['name']}:")
        print(response)

if __name__ == "__main__":
    main() 
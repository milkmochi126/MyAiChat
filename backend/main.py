from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import requests
import json
import os
import re

# 初始化 FastAPI 應用程式
app = FastAPI()

# 加入 CORS 中間件，允許前端的跨域請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 設定 Google Gemini API
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

# 角色設定（從 JSON 載入）
CHARACTER_DIR = "characters"

# 對話歷史記錄
CHAT_HISTORY = {}  # 使用者 ID -> 角色 ID -> 對話歷史

# 好感度資料結構
AFFINITY_DATA = {}  # 使用者 ID -> 角色 ID -> 好感度值

# 默認起始好感度
DEFAULT_AFFINITY = 0  # 範圍為 0-100

def load_character_settings():
    settings = {}
    try:
        # 檢查資料夾是否存在
        if not os.path.exists(CHARACTER_DIR):
            os.makedirs(CHARACTER_DIR)
            print(f"創建角色資料夾: {CHARACTER_DIR}")
            return settings
            
        for filename in os.listdir(CHARACTER_DIR):
            if filename.endswith(".json"):
                try:
                    file_path = os.path.join(CHARACTER_DIR, filename)
                    print(f"嘗試載入角色檔案: {file_path}")
                    
                    with open(file_path, "r", encoding="utf-8") as file:
                        data = json.load(file)
                        if "name" in data and "description" in data:  # 確保必要欄位
                            settings[data["name"]] = data
                            print(f"✅ 成功載入角色: {data['name']}")
                        else:
                            print(f"⚠️ 角色卡 {filename} 缺少必要欄位，未載入")
                except Exception as e:
                    print(f"❌ 載入角色 {filename} 時發生錯誤: {str(e)}")
    except Exception as e:
        print(f"❌ 載入角色時發生錯誤: {str(e)}")
    return settings

CHARACTER_SETTINGS = load_character_settings()
print("已加載的角色設定:", CHARACTER_SETTINGS.keys())

# 請求資料格式
class ChatRequest(BaseModel):
    api_key: str
    character_id: str
    message: str
    user_id: str = "default_user"
    reset_context: bool = False
    preserve_markdown: bool = True  # 是否保留 Markdown 格式

# 創建或獲取用戶的對話歷史
def get_chat_history(user_id, character_id):
    if user_id not in CHAT_HISTORY:
        CHAT_HISTORY[user_id] = {}
    
    if character_id not in CHAT_HISTORY[user_id] or len(CHAT_HISTORY[user_id][character_id]) == 0:
        # 初始化一個新的對話
        character = CHARACTER_SETTINGS[character_id]
        first_message = {
            "role": "system",
            "content": f"""你是 {character['name']}，{character.get('description', '')}。
            
記住你的角色設定，但不要在每次回應都重複你的背景故事，只有在被明確問到時才提及。專注於當前的對話內容。

特別提示：
1. 當你回覆時，可以使用以下格式：
   - 直接對話（角色說的話）應該直接呈現，不包含任何格式標記
   - 旁白、動作描述或場景描述可以使用 *()* 包圍，例如：*(XXX輕輕撫摸著你的臉頰)*
   
2. 這是一個例子：
   你好，很高興認識你。*(他向你微微點頭，眼神中帶著一絲好奇)*
   我等你很久了。
   
3. 記住：使用 *()* 或 ** 包圍的文字是旁白或動作描述，而不帶標記的文字是你角色直接說出的對話。

4. 除非是角色設定，否則不用特別重複我說的話
"""
        }
        CHAT_HISTORY[user_id][character_id] = [first_message]
        
        # 添加角色的第一句話（如果有）
        if character.get('firstChatLine'):
            first_line = character.get('firstChatLine')
            CHAT_HISTORY[user_id][character_id].append({
                "role": "assistant",
                "content": first_line
            })
    
    return CHAT_HISTORY[user_id][character_id]

# 獲取用戶對角色的好感度
def get_affinity(user_id, character_id):
    if user_id not in AFFINITY_DATA:
        AFFINITY_DATA[user_id] = {}
    
    if character_id not in AFFINITY_DATA[user_id]:
        AFFINITY_DATA[user_id][character_id] = DEFAULT_AFFINITY
    
    return AFFINITY_DATA[user_id][character_id]

# 更新用戶對角色的好感度
def update_affinity(user_id, character_id, change):
    current = get_affinity(user_id, character_id)
    new_value = max(0, min(100, current + change))  # 確保在 0-100 範圍內
    AFFINITY_DATA[user_id][character_id] = new_value
    return new_value

# 評估對話內容對好感度的影響
async def evaluate_affinity_change(api_key, character, user_message, ai_reply, current_affinity):
    """使用 AI 評估本次對話對好感度的影響"""
    
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
        api_url = f"{GEMINI_API_URL}?key={api_key}"
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

@app.post("/chat")
async def chat(request: ChatRequest):
    print(f"收到聊天請求: user_id={request.user_id}, character_id={request.character_id}")
    
    # 確保角色存在
    if request.character_id not in CHARACTER_SETTINGS:
        available_chars = ", ".join(CHARACTER_SETTINGS.keys())
        error_msg = f"角色 ID '{request.character_id}' 不存在。可用角色: {available_chars}"
        print(f"錯誤: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)

    # 取得角色設定
    character = CHARACTER_SETTINGS[request.character_id]
    print(f"使用角色: {character['name']}")
    
    # 確保 API Key 存在
    if not request.api_key:
        raise HTTPException(status_code=400, detail="缺少 API 金鑰")
    
    # 重置或獲取對話歷史
    if request.reset_context:
        if request.user_id in CHAT_HISTORY and request.character_id in CHAT_HISTORY[request.user_id]:
            del CHAT_HISTORY[request.user_id][request.character_id]
    
    chat_history = get_chat_history(request.user_id, request.character_id)
    
    # 添加用戶訊息到歷史記錄
    chat_history.append({
        "role": "user",
        "content": request.message
    })
    
    # 構建 Gemini API 提示詞
    # 只使用最近的 N 條訊息，避免提示詞過長
    recent_history = chat_history[-10:]  # 最多取最近 10 條消息
    
    # 設定角色提示詞
    character_prompt = f"""你是 {character['name']}，一個虛擬角色。請完全按照以下設定行事：

名稱: {character['name']}
性別: {character.get('gender', '未設定')}
年齡: {character.get('age', '未知')}
職業: {character.get('job', '未知')}
性格: {character.get('personality', '無特殊性格')}
說話風格: {character.get('speakingStyle', '無特殊風格')}

重要格式規則：
1. 你的回覆應包含兩種元素：對話和旁白/動作描述
2. 對話是角色說的話，應直接呈現，不帶任何特殊標記
3. 旁白、動作描述或場景描述應該用 *()* 符號包圍，如：*(XXX緩緩地走近)*
4. 一個回覆中可以穿插多段對話和旁白，例如：
   *(XXX站在窗邊，背對著你)*
   你來了？我等你很久了。
   *(他慢慢轉身，眼神中帶著複雜的情緒)*
   
5. 請確保每次回覆都包含至少一段旁白描述，用 *()* 符號包圍，對話和文字之間要換行
6.請不要重複我的話

"""
    
    # 構建請求內容
    user_messages = []
    for msg in recent_history:
        if msg["role"] == "user":
            user_messages.append(msg["content"])
        elif msg["role"] == "assistant" and len(user_messages) > 0:
            user_messages.append(f"[{character['name']}的回覆]: {msg['content']}")
    
    # 最新的一條訊息單獨處理
    latest_message = request.message
    
    # 構建最終提示詞
    final_prompt = f"{character_prompt}\n\n"
    
    # 加入部分對話歷史（如果有）
    if len(user_messages) > 1:
        final_prompt += "之前的對話:\n"
        for i, msg in enumerate(user_messages[:-1]):
            final_prompt += f"{msg}\n"
    
    # 加入當前問題
    final_prompt += f"\n當前問題: {latest_message}"
    
    # 強調格式重要性
    final_prompt += "\n\n請記住：直接對話不帶格式，旁白/動作描述用 *()* 符號包圍。確保你的回覆同時包含對話和旁白描述，這很重要。"
    
    # 構建簡化的請求
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": final_prompt
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.9,
            "topP": 0.95,
            "topK": 40,
        }
    }
    
    headers = {"Content-Type": "application/json"}
    
    # 發送請求到 Gemini API
    print("發送請求到 Gemini API...")
    api_url = f"{GEMINI_API_URL}?key={request.api_key}"
    try:
        response = requests.post(api_url, headers=headers, json=payload)
        print(f"收到 Gemini API 回應: 狀態碼={response.status_code}")
        
        # 處理 API 回應
        if response.status_code != 200:
            error_details = response.text
            print(f"API 請求失敗: {error_details}")
            return {
                "error": "Gemini API 請求失敗",
                "status_code": response.status_code,
                "details": error_details
            }
        
        # 解析 Gemini API 回應
        response_json = response.json()
        try:
            ai_reply = response_json["candidates"][0]["content"]["parts"][0]["text"]
            print(f"AI 原始回覆 (前100字): {ai_reply[:100]}...")
            
            # 確保回覆中有旁白描述（用 *()* 包圍）
            if "*(" not in ai_reply and ")*" not in ai_reply and "**" not in ai_reply:
                # 如果回覆沒有旁白，添加一個簡單的旁白
                first_line = ai_reply.split('\n')[0] if '\n' in ai_reply else ai_reply
                ai_reply = f"*({character['name']}看著你)*\n{ai_reply}"
            
            # 將 AI 回覆添加到對話歷史
            chat_history.append({
                "role": "assistant",
                "content": ai_reply
            })
            
            # 管理對話歷史長度，避免無限增長
            if len(chat_history) > 50:  # 保留最多 50 條消息
                chat_history = chat_history[-50:]
                CHAT_HISTORY[request.user_id][request.character_id] = chat_history
            
            # 評估並更新好感度（在後台進行，不影響對話體驗）
            current_affinity = get_affinity(request.user_id, request.character_id)
            
            # 啟動後台任務來評估好感度變化
            affinity_change = await evaluate_affinity_change(
                request.api_key, 
                character, 
                request.message, 
                ai_reply, 
                current_affinity
            )
            
            # 更新好感度
            new_affinity = update_affinity(request.user_id, request.character_id, affinity_change)
            print(f"好感度變化: {affinity_change}, 新好感度: {new_affinity}")
            
            return {
                "reply": ai_reply, 
                "history_length": len(chat_history),
                "affinity": new_affinity,
                "affinity_change": affinity_change
            }
            
        except (KeyError, IndexError) as e:
            print(f"解析 API 回應時出錯: {str(e)}")
            return {
                "error": "無法解析 Gemini 回應",
                "response": response_json
            }
    except Exception as e:
        print(f"請求過程中發生錯誤: {str(e)}")
        return {"error": f"請求過程中發生錯誤: {str(e)}"}
    
@app.get("/characters/list")
async def get_character_list():
    """獲取所有角色的詳細信息"""
    characters_details = []
    
    for char_name, char_data in CHARACTER_SETTINGS.items():
        # 提取角色的基本資訊以顯示在選擇列表中
        character_info = {
            "id": char_name,
            "name": char_data.get("name", ""),
            "avatar": char_data.get("avatar", ""),
            "job": char_data.get("job", ""),
            "gender": char_data.get("gender", "未設定"),
            "quote": char_data.get("quote", ""),
            "description": char_data.get("description", "")
        }
        characters_details.append(character_info)
    
    return {"characters": characters_details}

@app.get("/affinity/{user_id}/{character_id}")
async def get_character_affinity(user_id: str, character_id: str):
    """獲取用戶對特定角色的好感度"""
    if character_id not in CHARACTER_SETTINGS:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    affinity = get_affinity(user_id, character_id)
    return {"affinity": affinity}

@app.post("/affinity/{user_id}/{character_id}")
async def set_character_affinity(user_id: str, character_id: str, value: int):
    """手動設置用戶對特定角色的好感度（用於測試）"""
    if character_id not in CHARACTER_SETTINGS:
        raise HTTPException(status_code=404, detail="角色不存在")
    
    if value < 0 or value > 100:
        raise HTTPException(status_code=400, detail="好感度必須在 0-100 範圍內")
    
    if user_id not in AFFINITY_DATA:
        AFFINITY_DATA[user_id] = {}
    
    AFFINITY_DATA[user_id][character_id] = value
    return {"affinity": value}

@app.get("/characters")
async def get_characters():
    characters = list(CHARACTER_SETTINGS.keys())
    print(f"返回角色列表: {characters}")
    return {"characters": characters}

@app.post("/reset_chat")
async def reset_chat(user_id: str, character_id: str):
    if user_id in CHAT_HISTORY and character_id in CHAT_HISTORY[user_id]:
        del CHAT_HISTORY[user_id][character_id]
        return {"message": "對話已重置"}
    return {"message": "無對話可重置"}
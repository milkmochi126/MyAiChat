from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from typing import Optional, List, Dict, Any
import os
from dotenv import load_dotenv
import uuid
from fastapi.responses import JSONResponse
import atexit

# 導入新的模組
from db import get_all_characters, get_character_by_id
from chat_manager import chat_manager
from model_factory import ModelFactory
from memory_manager import memory_manager

# 載入環境變數
load_dotenv()

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

# 設定 API URL（僅作為參考，實際使用從各處理器獲取）
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"

# 加載角色設定
def load_character_settings():
    """從前端 API 載入角色設定"""
    settings = {}
    try:
        characters = get_all_characters()
        for character in characters:
            if 'id' not in character:
                continue
            settings[character["id"]] = character
            print(f"✅ 成功載入角色: {character['name']} (ID: {character['id']})")
        return settings
    except Exception as e:
        print(f"載入角色設定時出錯: {str(e)}")
        return {}

# 載入角色設定
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
    model_type: str = "gemini"  # 模型類型，可選 "gemini", "openai", "claude"

@app.post("/chat")
async def chat(request: ChatRequest):
    """處理聊天請求"""
    print(f"收到聊天請求: character_id={request.character_id}, user_id={request.user_id}, model_type={request.model_type}")
    
    try:
        # 獲取角色設定
        character = None
        if request.character_id in CHARACTER_SETTINGS:
            character = CHARACTER_SETTINGS[request.character_id]
            print(f"使用緩存的角色: {character['name']}")
        else:
            # 嘗試從API獲取
            try:
                character = get_character_by_id(request.character_id)
                if character:
                    CHARACTER_SETTINGS[request.character_id] = character
                    print(f"從API動態載入角色: {character['name']} (ID: {request.character_id})")
            except Exception as e:
                print(f"從API載入角色時出錯: {str(e)}")
        
        # 如果找不到角色設定，創建默認設定
        if not character:
            character = {
                "name": f"Character {request.character_id}",
                "gender": "未指定",
                "job": "虛擬助手",
                "personality": "友善、樂於幫助",
                "speakingStyle": "正式但親切"
            }
            CHARACTER_SETTINGS[request.character_id] = character
            print(f"建立臨時默認角色: {character['name']}")
        
        # 確保不使用來自角色數據的系統提示詞
        if "system" in character:
            # 移除系統提示詞，防止覆蓋後端的標準提示詞
            character_copy = character.copy()
            character_copy.pop("system", None)
            character = character_copy
            print(f"已移除角色的自定義系統提示詞")
        
        # 使用聊天管理器處理請求
        result = await chat_manager.process_chat(
            api_key=request.api_key,
            character_id=request.character_id,
            message=request.message,
            user_id=request.user_id,
            reset_context=request.reset_context,
            model_type=request.model_type,
            character=character
        )
        
        if "success" in result and not result["success"]:
            error_status = result.get("status_code", 500)
            error_msg = result.get("error", "處理聊天請求時出錯")
            error_details = result.get("details", "未提供詳細錯誤信息")
            
            print(f"處理聊天請求失敗: {error_msg}, 詳情: {error_details}")
            
            # 將完整的錯誤信息返回給客戶端
            return JSONResponse(
                status_code=error_status,
                content=result
            )
            
        return result
    
    except Exception as e:
        error_msg = f"處理聊天請求時發生未預期錯誤: {str(e)}"
        print(error_msg)
        # 打印詳細的錯誤堆疊
        import traceback
        traceback_str = traceback.format_exc()
        print("錯誤詳情:\n", traceback_str)
        
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "內部伺服器錯誤",
                "details": str(e),
                "traceback": traceback_str if os.environ.get("DEBUG", "false").lower() == "true" else "在生產環境中不顯示詳細錯誤"
            }
        )

@app.get("/supported_models")
async def get_supported_models():
    """獲取支持的模型列表"""
    return {
        "models": ModelFactory.get_supported_models()
    }

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
    """獲取角色好感度"""
    affinity = chat_manager.get_affinity(user_id, character_id)
    return {"affinity": affinity}

@app.post("/affinity/{user_id}/{character_id}")
async def set_character_affinity(user_id: str, character_id: str, value: int):
    """設置角色好感度"""
    new_affinity = chat_manager.set_affinity(user_id, character_id, value)
    return {"affinity": new_affinity}

@app.get("/characters")
async def get_characters():
    """獲取所有角色ID列表"""
    characters = list(CHARACTER_SETTINGS.keys())
    print(f"返回角色列表: {characters}")
    return {"characters": characters}

@app.post("/reset_chat")
async def reset_chat(user_id: str, character_id: str):
    """重置特定角色的聊天歷史"""
    chat_manager.reset_chat(user_id, character_id)
    return {"status": "success", "message": f"已重置 {user_id} 與 {character_id} 的對話"}

@app.post("/reset_all_chats")
async def reset_all_chats(user_id: str = None):
    """重置所有聊天歷史"""
    chat_manager.reset_all_chats(user_id)
    if user_id:
        return {"status": "success", "message": f"已重置用戶 {user_id} 的所有對話"}
    else:
        return {"status": "success", "message": "已重置所有對話"}

@app.get("/memory/{user_id}/{character_id}")
async def get_memory(user_id: str, character_id: str):
    """獲取角色記憶"""
    memory = await memory_manager.get_memory(user_id, character_id)
    return memory

@app.delete("/memory/{user_id}/{character_id}")
async def clear_memory(user_id: str, character_id: str):
    """清除角色記憶"""
    await memory_manager.clear_memory(user_id, character_id)
    return {"status": "success", "message": f"已清除 {user_id} 與 {character_id} 的記憶"}

@app.get("/memory/formatted/{user_id}/{character_id}")
async def get_formatted_memory(user_id: str, character_id: str):
    """獲取格式化的角色記憶文本"""
    memory_text = await memory_manager.get_formatted_memory(user_id, character_id)
    return {"memory_text": memory_text}

# 在程序退出時關閉記憶資料庫連接
@atexit.register
def shutdown_db():
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(memory_manager.disconnect())
        else:
            loop.run_until_complete(memory_manager.disconnect())
    except Exception as e:
        print(f"關閉資料庫連接時出錯: {str(e)}")

# 添加根路由
@app.get("/")
async def root():
    """根路由，返回API狀態信息"""
    frontend_url = os.environ.get("FRONTEND_API_URL", "未設置")
    api_key_status = "已設置" if os.environ.get("BACKEND_API_KEY") else "未設置"
    model_handlers = ModelFactory.get_supported_models()
    
    return {
        "status": "在線",
        "api_version": "1.0",
        "frontend_url": frontend_url,
        "backend_api_key": api_key_status,
        "loaded_characters": len(CHARACTER_SETTINGS),
        "supported_models": list(model_handlers.keys()),
        "endpoints": [
            "/chat", 
            "/memory", 
            "/models",
            "/characters"
        ]
    }
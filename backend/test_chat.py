import requests
import json
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 設置 API 端點
BACKEND_URL = "http://localhost:8000"

# 手動輸入你的 Gemini API 金鑰
GEMINI_API_KEY = input("請輸入你的 Gemini API 金鑰: ")

def test_chat_with_character():
    """測試與角色的對話"""
    
    # 首先獲取所有角色
    try:
        character_response = requests.get(f"{BACKEND_URL}/characters")
        if character_response.status_code != 200:
            print(f"無法獲取角色列表: {character_response.status_code}")
            return
        
        characters = character_response.json().get("characters", [])
        if not characters:
            print("沒有可用的角色")
            return
        
        print("可用角色:")
        for i, character_id in enumerate(characters):
            print(f"{i+1}. {character_id}")
        
        # 選擇角色
        choice = int(input(f"請選擇一個角色 (1-{len(characters)}): "))
        if choice < 1 or choice > len(characters):
            print("無效的選擇")
            return
        
        selected_character = characters[choice-1]
        print(f"選擇了角色: {selected_character}")
        
        # 開始與角色對話
        user_id = "test_user"
        message = input("請輸入你的訊息: ")
        
        # 發送聊天請求
        chat_response = requests.post(
            f"{BACKEND_URL}/chat",
            json={
                "api_key": GEMINI_API_KEY,
                "character_id": selected_character,
                "message": message,
                "user_id": user_id,
                "reset_context": False
            }
        )
        
        if chat_response.status_code == 200:
            result = chat_response.json()
            print("\n角色回應:")
            print(result.get("reply", "無回應"))
            print(f"\n好感度: {result.get('affinity', 'N/A')}")
            print(f"好感度變化: {result.get('affinity_change', 'N/A')}")
        else:
            print(f"聊天請求失敗: {chat_response.status_code}")
            print(chat_response.text)
    
    except Exception as e:
        print(f"測試過程中發生錯誤: {e}")

if __name__ == "__main__":
    test_chat_with_character() 
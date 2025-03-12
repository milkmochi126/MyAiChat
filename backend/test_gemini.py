import requests
import json
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 設置 API 端點
BACKEND_URL = "http://localhost:8000"

# 手動輸入你的 Gemini API 金鑰，或是從環境變數獲取
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or input("請輸入你的 Gemini API 金鑰: ")

def test_gemini_chat():
    """測試 Gemini API 聊天功能"""
    
    # 使用簡單的測試角色ID
    character_id = "test_character"
    user_id = "test_user"
    
    # 輸入訊息
    message = input("請輸入你的訊息給AI: ")
    
    # 構建請求數據
    request_data = {
        "api_key": GEMINI_API_KEY,
        "character_id": character_id,
        "message": message,
        "user_id": user_id,
        "reset_context": False
    }
    
    print(f"\n===== 請求數據 =====")
    print(f"API 金鑰: {GEMINI_API_KEY[:5]}..." if GEMINI_API_KEY else "未提供 API 金鑰")
    print(f"角色 ID: {character_id}")
    print(f"用戶訊息: {message}")
    
    # 發送聊天請求
    try:
        print("\n正在發送請求到後端...")
        chat_response = requests.post(
            f"{BACKEND_URL}/chat",
            json=request_data
        )
        
        print(f"收到回應，狀態碼: {chat_response.status_code}")
        
        # 嘗試解析為JSON，即使不是200也嘗試
        try:
            response_data = chat_response.json()
            print("\n===== 回應數據 =====")
            print(json.dumps(response_data, indent=2, ensure_ascii=False))
        except:
            print("無法解析回應為JSON格式")
            print(f"原始回應: {chat_response.text}")
        
        if chat_response.status_code == 200:
            result = chat_response.json()
            if "error" in result:
                print(f"\n⚠️ API 返回錯誤: {result.get('error')}")
                if "details" in result:
                    print(f"錯誤詳情: {result.get('details')}")
            else:
                print("\n====== AI 角色回應 ======")
                print(result.get("reply", "無回應"))
                print("\n===== 其他資訊 =====")
                print(f"好感度: {result.get('affinity', 'N/A')}")
                print(f"好感度變化: {result.get('affinity_change', 'N/A')}")
        else:
            print(f"\n❌ 請求失敗: {chat_response.status_code}")
            print(f"錯誤詳情: {chat_response.text}")
    
    except Exception as e:
        print(f"\n❌ 測試過程中發生錯誤: {e}")

def test_check_gemini_api():
    """直接測試 Gemini API 是否正常工作（不經過後端）"""
    print("\n===== 直接測試 Gemini API =====")
    if not GEMINI_API_KEY:
        print("未提供 API 金鑰，無法測試")
        return
    
    try:
        # Gemini API URL
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        # 簡單的請求數據
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": "Hello, who are you?"
                        }
                    ]
                }
            ]
        }
        
        headers = {"Content-Type": "application/json"}
        
        print("正在直接發送請求到 Gemini API...")
        response = requests.post(api_url, headers=headers, json=payload)
        
        print(f"收到 Gemini API 回應，狀態碼: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            try:
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                print("\n====== Gemini API 回應 ======")
                print(text[:500] + "..." if len(text) > 500 else text)
                print("\n✅ Gemini API 正常工作!")
            except Exception as e:
                print(f"解析回應時出錯: {e}")
                print(f"回應數據: {json.dumps(result, indent=2)}")
        else:
            print(f"❌ Gemini API 請求失敗: {response.status_code}")
            print(f"錯誤詳情: {response.text}")
    
    except Exception as e:
        print(f"❌ 測試 Gemini API 時發生錯誤: {e}")

if __name__ == "__main__":
    print("====== Gemini API 聊天測試 ======")
    print("先測試 Gemini API 是否正常工作...")
    test_check_gemini_api()
    
    print("\n現在測試後端 API...")
    test_gemini_chat()
    
    print("\n測試完成，您可以按Enter繼續測試，或按Ctrl+C退出")
    while True:
        try:
            input("\n按Enter繼續測試，或按Ctrl+C退出...")
            test_gemini_chat()
        except KeyboardInterrupt:
            print("\n測試結束，再見！")
            break 
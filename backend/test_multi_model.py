import requests
import json
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 設置 API 端點
BACKEND_URL = "http://localhost:8000"

# 獲取 API 金鑰
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or input("請輸入 Gemini API 金鑰 (或直接按 Enter 略過): ")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") or input("請輸入 OpenAI API 金鑰 (或直接按 Enter 略過): ")

def test_chat(model_type="gemini"):
    """測試與不同模型的聊天功能"""
    # 選擇要使用的 API 金鑰
    if model_type.lower() == "gemini":
        if not GEMINI_API_KEY:
            print("⚠️ 未提供 Gemini API 金鑰，無法使用 gemini 模型")
            return
        api_key = GEMINI_API_KEY
    elif model_type.lower() == "openai":
        if not OPENAI_API_KEY:
            print("⚠️ 未提供 OpenAI API 金鑰，無法使用 openai 模型")
            return
        api_key = OPENAI_API_KEY
    else:
        print(f"⚠️ 不支援的模型類型: {model_type}")
        return
    
    # 使用簡單的測試角色ID
    character_id = input("請輸入角色 ID (預設: test_character): ") or "test_character"
    user_id = "test_user"
    
    # 輸入訊息
    message = input(f"請輸入您要發送給 {model_type} 模型的訊息: ")
    
    # 構建請求數據
    request_data = {
        "api_key": api_key,
        "character_id": character_id,
        "message": message,
        "user_id": user_id,
        "model_type": model_type,
        "reset_context": False
    }
    
    print(f"\n===== 請求資訊 =====")
    print(f"模型類型: {model_type}")
    print(f"API 金鑰: {api_key[:5]}..." if api_key else "未提供 API 金鑰")
    print(f"角色 ID: {character_id}")
    
    # 發送聊天請求
    try:
        print("\n正在發送請求到後端...")
        chat_response = requests.post(
            f"{BACKEND_URL}/chat",
            json=request_data
        )
        
        print(f"收到回應，狀態碼: {chat_response.status_code}")
        
        # 嘗試解析為JSON
        try:
            response_data = chat_response.json()
            
            if "error" in response_data:
                print(f"\n❌ API 返回錯誤: {response_data.get('error')}")
                if "details" in response_data:
                    print(f"錯誤詳情: {response_data.get('details')}")
            else:
                print("\n====== AI 角色回應 ======")
                print(response_data.get("reply", "無回應"))
                print("\n===== 其他資訊 =====")
                print(f"好感度: {response_data.get('affinity', 'N/A')}")
                print(f"好感度變化: {response_data.get('affinity_change', 'N/A')}")
        except:
            print("無法解析回應為JSON格式")
            print(f"原始回應: {chat_response.text}")
    
    except Exception as e:
        print(f"\n❌ 測試過程中發生錯誤: {e}")
    
    print("\n" + "=" * 50)

def main():
    """主函數"""
    print("====== 多模型聊天測試工具 ======")
    print("這個工具可以測試不同模型的聊天功能")
    print("\n可用模型:")
    print("1. Gemini (Google)")
    print("2. OpenAI (GPT-3.5)")
    
    while True:
        print("\n" + "=" * 50)
        choice = input("\n請選擇要測試的模型 (1=Gemini, 2=OpenAI, q=退出): ")
        
        if choice.lower() in ["q", "quit", "exit"]:
            print("謝謝使用，再見！")
            break
        
        if choice == "1":
            test_chat("gemini")
        elif choice == "2":
            test_chat("openai")
        else:
            print("無效的選擇，請重新輸入")

if __name__ == "__main__":
    main() 
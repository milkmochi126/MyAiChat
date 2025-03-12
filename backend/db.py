import os
import json
import requests
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 前端 API URL (通常是 Next.js 的 API 路由)
API_BASE_URL = os.environ.get("FRONTEND_API_URL", "http://localhost:3000/api")
# 後端API密鑰
API_KEY = os.environ.get("BACKEND_API_KEY", "")

def get_all_characters():
    """從前端 API 獲取所有角色"""
    try:
        # 如果沒有API密鑰，嘗試使用公共角色API
        if not API_KEY:
            print(f"警告: 未設置API密鑰，使用公共角色API，URL: {API_BASE_URL}/public-characters")
            response = requests.get(f"{API_BASE_URL}/public-characters")
        else:
            # 使用 api_key 查詢參數進行授權
            print(f"使用API密鑰訪問: {API_BASE_URL}/characters，密鑰ID：{API_KEY[:4]}***")
            response = requests.get(f"{API_BASE_URL}/characters?includeAll=true&api_key={API_KEY}")
        
        if response.status_code == 200:
            characters = response.json()
            # 處理格式，確保與原程式碼兼容
            for character in characters:
                if 'id' not in character:
                    continue
                # 確保有必要欄位
                character.setdefault('name', f"角色 {character['id']}")
                character.setdefault('description', "無描述")
                character.setdefault('gender', "未指定")
                character.setdefault('job', "未知")
                # 處理 extraInfo
                if 'extraInfo' in character and isinstance(character['extraInfo'], str):
                    try:
                        extra_info = json.loads(character['extraInfo'])
                        character.update(extra_info)
                    except:
                        pass
            print(f"從 API 獲取到 {len(characters)} 個角色")
            return characters
        else:
            print(f"API 請求失敗: {response.status_code}, 響應內容: {response.text[:100]}")
            return []
    except Exception as e:
        print(f"獲取角色時出錯: {e}")
        # 返回空列表
        return []

def get_character_by_id(character_id):
    """從前端 API 獲取特定角色"""
    try:
        print(f"嘗試從API獲取角色: {character_id}")
        
        # 如果沒有API密鑰，嘗試使用公共角色API
        if not API_KEY:
            print("警告: 未設置API密鑰，使用公共角色API")
            response = requests.get(f"{API_BASE_URL}/public-characters/{character_id}")
        else:
            # 使用 api_key 查詢參數進行授權
            response = requests.get(f"{API_BASE_URL}/characters/{character_id}?api_key={API_KEY}")
        
        if response.status_code == 200:
            character = response.json()
            print(f"成功從API獲取角色: {character.get('name', '未知')}")
            
            # 確保有必要欄位
            character.setdefault('name', f"角色 {character_id}")
            character.setdefault('description', "無描述")
            character.setdefault('gender', "未指定")
            character.setdefault('job', "未知")
            
            # 新增處理所有角色欄位
            character.setdefault('age', "未設定")
            character.setdefault('personality', "未設定")
            character.setdefault('speakingStyle', "未設定")
            character.setdefault('basicInfo', "未設定")
            character.setdefault('likes', "未設定")
            character.setdefault('dislikes', "未設定")
            character.setdefault('quote', "未設定")
            character.setdefault('firstChatScene', "未設定")
            character.setdefault('firstChatLine', "未設定")
            
            # 記錄角色關鍵屬性
            print(f"角色資料: 名稱={character['name']}, 性別={character['gender']}, 年齡={character.get('age', '未設定')}")
            print(f"角色性格: {character.get('personality', '未設定')}")
            print(f"角色說話方式: {character.get('speakingStyle', '未設定')}")
            
            # 處理 extraInfo
            if 'extraInfo' in character:
                try:
                    if isinstance(character['extraInfo'], str):
                        extra_info = json.loads(character['extraInfo'])
                        print(f"處理 extraInfo JSON 字串")
                    else:
                        extra_info = character['extraInfo']
                        print(f"處理 extraInfo 物件")
                    
                    # 只有當 extraInfo 是有效的數組或對象時才更新
                    if extra_info and (isinstance(extra_info, dict) or isinstance(extra_info, list)):
                        if isinstance(extra_info, dict):
                            character.update(extra_info)
                            print(f"從 extraInfo 中更新了 {len(extra_info)} 個屬性")
                except Exception as e:
                    print(f"解析 extraInfo 時出錯: {str(e)}")
            
            print(f"完成處理角色資料，返回資料長度: {len(str(character))} 字節")
            return character
        else:
            print(f"API 請求失敗: 狀態碼 {response.status_code}")
            print(f"響應內容: {response.text[:200]}...")
            return None
    except Exception as e:
        print(f"獲取角色時出錯: {str(e)}")
        import traceback
        print(f"詳細錯誤: {traceback.format_exc()}")
        return None 
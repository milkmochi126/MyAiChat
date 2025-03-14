import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import AvatarEditor from "react-avatar-editor";
import { getSafeUserId, getUserData, setUserData } from "../utils/userStorage";
import axios from "axios";
import toast from "react-hot-toast";

export default function Settings() {
  const { data: session } = useSession();
  const router = useRouter();
  const { tab } = router.query;
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [myProfile, setMyProfile] = useState({
    name: "",
    email: "",
    avatar: "",
    apiKeys: {
      gpt: "",
      claude: "",
      gemini: ""
    },
    defaultModel: "gemini"  // 預設使用的模型
  });
  const [myCharacters, setMyCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  // 添加角色編輯加載狀態
  const [loadingCharacter, setLoadingCharacter] = useState(false);
  
  // 防抖處理，避免頻繁保存
  const saveTimeout = useRef(null);
  
  // 新增角色表單
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    age: "",
    job: "",
    quote: "",
    description: "",
    gender: "男性",  // 改為性別字段
    tags: [],       // 改為數組，支持多個標籤
    basicInfo: "",
    personality: "",
    speakingStyle: "",
    firstChatScene: "",
    firstChatLine: "",
    likes: "",
    dislikes: "",
    isPublic: false,
    extraInfo: []
  });

  // 是否有暫存的角色
  const [hasTempSave, setHasTempSave] = useState(false);

  // Avatar editor state
  const [avatarFile, setAvatarFile] = useState(null);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarZoom, setAvatarZoom] = useState(1.2);
  const [avatarPosition, setAvatarPosition] = useState({ x: 0.5, y: 0.5 });
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState("");
  const avatarEditorRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 定義獲取我的角色的函數 - 將該函數移到這裡，在所有useEffect之前
  const fetchMyCharacters = useCallback(async () => {
    if (!session?.user?.id || window.isLoggingOut) return;
    
    try {
      setLoading(true);
      console.log('開始獲取我的角色列表');
      
      // 獲取用戶ID
      const userId = getSafeUserId(session);
      console.log('獲取我的角色列表，用戶ID:', userId);
      
      try {
        // 從API獲取角色列表
        console.log('從API獲取角色數據');
        const response = await axios.get('/api/characters');
        const fetchedCharacters = response.data || [];
        console.log('API返回角色數據:', fetchedCharacters.length, '個角色');
        
        // 處理角色數據，確保tags是數組
        const processedCharacters = fetchedCharacters.map(character => {
          if (!character.tags) {
            character.tags = [];
          } else if (!Array.isArray(character.tags)) {
            character.tags = [];
          }
          
          return character;
        });
        
        // 設置角色列表
        setMyCharacters(processedCharacters);
        console.log('設置角色列表:', processedCharacters.length, '個角色');
        
        // 同時更新本地存儲
        setUserData(userId, 'myCharacters', processedCharacters);
        console.log('更新本地存儲的角色列表');
        
        return processedCharacters;
      } catch (apiError) {
        console.error('API請求失敗:', apiError);
        
        // 如果是未授權錯誤且正在登出，則忽略
        if (apiError.response?.status === 401 && window.isLoggingOut) {
          console.log('正在登出，忽略未授權錯誤');
          return [];
        }
        
        // 從本地存儲加載
        console.log('嘗試從本地存儲加載角色列表');
        const localCharacters = getUserData(userId, 'myCharacters', []);
        console.log('本地存儲中的角色:', localCharacters.length, '個角色');
        setMyCharacters(localCharacters);
        
        return localCharacters;
      }
    } catch (error) {
      console.error("載入我的角色失敗:", error);
      setMyCharacters([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [session]);

  // 添加單獨處理角色數據載入的函數
  const loadCharacterData = useCallback(async (characterId) => {
    if (!characterId) return;
    
    console.log('載入角色數據，ID:', characterId);
    setLoadingCharacter(true);
    
    try {
      // 直接從API獲取最新的角色詳細信息
      console.log(`從API獲取角色(${characterId})數據...`);
      const response = await axios.get(`/api/characters/${characterId}`);
      console.log('API回應數據:', response.data);
      console.log('API回應中的年齡值:', response.data.age, '類型:', typeof response.data.age);
      
      // 準備表單數據
      const characterData = response.data;
      
      // 基本欄位 (確保至少包含這些欄位)
      const formData = {
        id: characterData.id,
        name: characterData.name || "",
        age: characterData.age || "",  // 特別關注年齡欄位
        job: characterData.job || "",
        gender: characterData.gender || "男性",
        description: characterData.description || "", 
        isPublic: Boolean(characterData.isPublic),
        avatar: characterData.avatar || "",
        // 新增所有必要欄位的處理
        quote: characterData.quote || "",
        basicInfo: characterData.basicInfo || "",
        personality: characterData.personality || "",
        speakingStyle: characterData.speakingStyle || "",
        likes: characterData.likes || "",
        dislikes: characterData.dislikes || "",
        firstChatScene: characterData.firstChatScene || "",
        firstChatLine: characterData.firstChatLine || "",
        tags: [],
        extraInfo: []
      };
      
      // 處理標籤
      if (characterData.tags && Array.isArray(characterData.tags)) {
        formData.tags = characterData.tags.map(tag => 
          typeof tag === 'string' ? tag : (tag && tag.name ? tag.name : '')
        ).filter(tag => tag);
      }
      
      // 處理extraInfo (可能包含其他詳細欄位)
      if (characterData.extraInfo) {
        try {
          if (typeof characterData.extraInfo === 'string') {
            formData.extraInfo = JSON.parse(characterData.extraInfo);
          } else if (Array.isArray(characterData.extraInfo)) {
            formData.extraInfo = characterData.extraInfo;
          } else if (typeof characterData.extraInfo === 'object') {
            formData.extraInfo = Object.entries(characterData.extraInfo).map(([title, content]) => ({
              title,
              content: typeof content === 'string' ? content : JSON.stringify(content)
            }));
          }
        } catch (error) {
          console.error('處理extraInfo時出錯:', error);
          formData.extraInfo = [];
        }
      }
      
      console.log('設置表單數據:', formData);
      console.log('包含所有欄位的詳細資訊:', JSON.stringify({
        quote: formData.quote,
        basicInfo: formData.basicInfo,
        personality: formData.personality,
        speakingStyle: formData.speakingStyle,
        likes: formData.likes,
        dislikes: formData.dislikes,
        firstChatScene: formData.firstChatScene,
        firstChatLine: formData.firstChatLine
      }, null, 2));
      
      // 設置表單數據
      setNewCharacter(formData);
      
      // 設置頭像預覽
      if (characterData.avatar) {
        setAvatarPreview(characterData.avatar);
      }
      
      setLoadingCharacter(false);
      console.log('角色資料載入完成');
      return formData;
    } catch (error) {
      console.error('獲取角色數據失敗:', error);
      setLoadingCharacter(false);
      alert('無法載入角色資料，請稍後再試');
      return null;
    }
  }, []);

  // 載入用戶資料
  useEffect(() => {
    if (session) {
      const userId = getSafeUserId(session);
      const storedProfile = getUserData(userId, 'userProfile', null);
      
      if (storedProfile) {
        // 使用存儲的個人資料
        setMyProfile(storedProfile);
      } else {
        // 如果沒有存儲的個人資料，則使用會話中的資料
        const defaultProfile = {
          name: session.user.name || '',
          email: session.user.email || '',
          avatar: session.user.image || '',
          apiKeys: {
            gpt: "",
            claude: "",
            gemini: ""
          },
          defaultModel: "gemini"
        };
        
        // 確保頭像 URL 是有效的
        if (defaultProfile.avatar) {
          console.log('初始化用戶頭像:', defaultProfile.avatar);
        }
        
        setMyProfile(defaultProfile);
        
        // 保存到本地存儲
        setUserData(userId, 'userProfile', defaultProfile);
      }
      
      // 載入暫存的角色
      const tempCharacter = getUserData(userId, 'tempCharacter', null);
      if (tempCharacter) {
        setNewCharacter(tempCharacter);
        setHasTempSave(true);
      }
    }
  }, [session]);

  // 根據 URL 參數設置 activeTab
  useEffect(() => {
    if (tab) {
      console.log('URL變更，tab參數為:', tab);
      setActiveTab(tab);
      
      // 如果切換到我的角色標籤時，重新加載角色列表
      if (tab === "myCharacters" && session?.user?.id) {
        console.log('切換到我的角色標籤，加載角色列表');
        fetchMyCharacters();
      }
      
      // 如果切換到編輯角色標籤，且有角色ID，加載角色數據
      if (tab === "editCharacter" && router.query.id && session?.user?.id) {
        console.log('URL切換到編輯角色標籤，角色ID:', router.query.id);
        // 重置表單狀態，避免顯示舊數據
        setNewCharacter({
          name: "",
          age: "",
          job: "",
          quote: "",
          description: "",
          gender: "男性",
          tags: [],
          basicInfo: "",
          personality: "",
          speakingStyle: "",
          firstChatScene: "",
          firstChatLine: "",
          likes: "",
          dislikes: "",
          isPublic: false,
          extraInfo: []
        });
        // 載入最新角色數據
        loadCharacterData(router.query.id);
      }
    }
  }, [tab, router.query.id, fetchMyCharacters, loadCharacterData, session]);

  // 處理個人資料變更
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setMyProfile(prev => {
      const updated = { ...prev, [name]: value };
      
      // 保存到本地存儲
      if (session) {
        const userId = getSafeUserId(session);
        setUserData(userId, 'userProfile', updated);
      }
      
      return updated;
    });
  };

  // 處理 API 金鑰變更
  const handleApiKeyChange = (e) => {
    const { name, value } = e.target;
    setMyProfile(prev => {
      const updated = {
        ...prev,
        apiKeys: {
          ...prev.apiKeys,
          [name]: value
        }
      };
      
      // 保存到本地存儲
      if (session) {
        const userId = getSafeUserId(session);
        setUserData(userId, 'userProfile', updated);
      }
      
      // 同時保存到數據庫
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        saveApiKeysToDatabase(updated);
      }, 1000);
      
      return updated;
    });
  };

  // 保存 API 金鑰到數據庫
  const saveApiKeysToDatabase = async (profile) => {
    if (!session) {
      console.log("未登入，無法保存設定");
      return;
    }
    
    try {
      // 確保 profile 和 apiKeys 存在且有效
      if (!profile || !profile.apiKeys) {
        console.error("缺少有效的配置檔案或 API 金鑰");
        toast.error('保存 API 金鑰失敗：無效的數據');
        return;
      }
      
      // 確保 apiKeys 是一個有效的對象而不是 null 或其他類型
      const apiKeys = profile.apiKeys || { gpt: "", claude: "", gemini: "" };
      const defaultModel = profile.defaultModel || "gemini";
      
      const response = await axios.post('/api/user/update-profile', {
        apiKeys,
        defaultModel
      });
      
      if (response.data.success) {
        // 成功保存，但不顯示通知以避免干擾用戶
        console.log('API 金鑰保存成功');
      } else {
        throw new Error(response.data.error || '未知錯誤');
      }
    } catch (error) {
      console.error('保存 API 金鑰失敗:', error);
      // 只在遇到真正錯誤時顯示提示
      if (error.response?.status >= 400) {
        toast.error(`保存 API 金鑰失敗: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  // 處理默認模型變更
  const handleDefaultModelChange = (e) => {
    const { value } = e.target;
    setMyProfile(prev => {
      const updated = { ...prev, defaultModel: value };
      
      // 保存到本地存儲
      if (session) {
        const userId = getSafeUserId(session);
        setUserData(userId, 'userProfile', updated);
      }
      
      // 同時保存到數據庫
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        saveApiKeysToDatabase(updated);
      }, 500);
      
      return updated;
    });
  };

  // 處理個人頭像文件選擇
  const handleProfileAvatarFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setShowAvatarEditor(true);
    }
  };

  // 處理個人頭像確認
  const handleProfileAvatarConfirm = async () => {
    if (avatarEditorRef.current) {
      try {
        // 顯示處理中的提示
        setIsProcessing(true);
        
        const canvas = avatarEditorRef.current.getImageScaledToCanvas();
        const dataUrl = canvas.toDataURL('image/png');
        
        // 更新個人資料中的頭像（臨時顯示）
        const updatedProfile = {
          ...myProfile,
          avatar: dataUrl
        };
        
        // 更新狀態
        setMyProfile(updatedProfile);
        
        // 關閉編輯器
        setShowAvatarEditor(false);
        setAvatarFile(null);
        
        // 自動保存到本地存儲和資料庫
        if (session) {
          const userId = getSafeUserId(session);
          
          try {
            // 保存到本地存儲
            setUserData(userId, 'userProfile', updatedProfile);
            console.log("頭像已自動保存到本地存儲");
            
            // 保存到資料庫（使用新的 API 端點）
            const response = await axios.post('/api/user/avatar', {
              imageData: dataUrl
            });
            
            if (response.status === 200) {
              console.log("頭像已成功上傳到服務器");
              
              // 更新個人資料中的頭像（使用服務器返回的 URL）
              const serverImageUrl = response.data.image;
              const finalProfile = {
                ...myProfile,
                avatar: serverImageUrl
              };
              
              // 更新狀態
              setMyProfile(finalProfile);
              
              // 更新本地存儲
              setUserData(userId, 'userProfile', finalProfile);
              
              // 更新會話中的用戶資料
              if (session.user) {
                session.user.image = serverImageUrl;
              }
              
              // 顯示成功提示
              alert("頭像已成功上傳並保存！");
            }
          } catch (error) {
            console.error("上傳頭像失敗:", error);
            
            // 顯示錯誤提示
            if (error.response && error.response.data && error.response.data.error) {
              alert(`上傳頭像失敗: ${error.response.data.error}`);
            } else {
              alert("上傳頭像失敗，請稍後再試");
            }
          } finally {
            // 無論成功或失敗，都結束處理中狀態
            setIsProcessing(false);
          }
        } else {
          setIsProcessing(false);
          alert("頭像已上傳，請點擊保存按鈕以保存更改");
        }
      } catch (error) {
        console.error("處理頭像失敗:", error);
        setIsProcessing(false);
        alert("處理頭像失敗，請稍後再試");
      }
    }
  };

  // 處理個人頭像編輯取消
  const handleProfileAvatarCancel = () => {
    setShowAvatarEditor(false);
    setAvatarFile(null);
  };

  // 處理個人資料提交
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    console.log("提交個人資料表單...");
    
    try {
      // 檢查會話狀態
      if (!session) {
        console.error("保存失敗：沒有有效的會話");
        alert("請先登入！");
        return;
      }
      
      // 獲取用戶ID
      const userId = getSafeUserId(session);
      if (!userId) {
        console.error("保存失敗：無法獲取用戶ID");
        alert("無法獲取用戶ID，請重新登入");
        return;
      }
      
      console.log("正在保存個人資料...", myProfile);
      
      // 嘗試保存到本地存儲
      let saveSuccess = false;
      try {
        const saveResult = setUserData(userId, 'userProfile', myProfile);
        if (saveResult) {
          console.log("個人資料保存到本地存儲成功");
          saveSuccess = true;
        } else {
          console.warn("保存到本地存儲失敗，將嘗試使用API保存");
        }
      } catch (storageError) {
        console.error("本地存儲出錯:", storageError);
      }
      
      // 嘗試使用API保存到資料庫
      try {
        console.log("嘗試使用API保存個人資料到資料庫...");
        const apiResponse = await axios.patch('/api/user/profile', {
          name: myProfile.name,
          image: myProfile.avatar
        });
        
        if (apiResponse.status === 200) {
          console.log("個人資料通過API保存成功");
          saveSuccess = true;
          
          // 更新會話中的用戶資料
          if (session.user) {
            session.user.name = myProfile.name;
            if (myProfile.avatar) {
              session.user.image = myProfile.avatar;
            }
          }
        }
      } catch (apiError) {
        console.error("API保存失敗:", apiError);
        // 即使API保存失敗，如果本地存儲成功，我們仍然認為保存成功
      }
      
      if (saveSuccess) {
        // 顯示成功消息
        alert("個人資料已更新！");
        // 退出編輯模式
        setIsEditing(false);
      } else {
        console.error("所有保存方法都失敗了");
        alert("保存個人資料失敗：請檢查您的網絡連接或瀏覽器設置");
      }
    } catch (error) {
      console.error("保存個人資料失敗:", error);
      alert("保存個人資料失敗: " + (error.message || "未知錯誤"));
    }
  };

  // 處理新增角色表單變更
  const handleNewCharacterChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // 特殊處理年齡欄位，確保它以正確的格式存儲
    if (name === 'age') {
      console.log(`表單變更 - 年齡欄位: "${value}", 類型: ${typeof value}`);
      
      // 如果輸入非空，則保留原始值；如果為空，則設為空字符串
      const processedValue = value.trim() === '' ? '' : value;
      
      setNewCharacter(prev => ({
        ...prev,
        [name]: processedValue
      }));
      return;
    }
    
    // 處理其他欄位
    setNewCharacter(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // 處理頭像文件選擇
  const handleAvatarFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
      setShowAvatarEditor(true);
    }
  };

  // 儲存編輯後的頭像
  const handleSaveAvatar = () => {
    if (avatarEditorRef.current) {
      const canvas = avatarEditorRef.current.getImageScaledToCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      setAvatarPreview(dataUrl);
      setNewCharacter(prev => ({
        ...prev,
        avatar: dataUrl
      }));
      setShowAvatarEditor(false);
    }
  };

  // 取消頭像編輯
  const handleCancelAvatarEdit = () => {
    setShowAvatarEditor(false);
    setAvatarFile(null);
  };

  // 處理標籤變更
  const handleTagChange = (tag) => {
    // 確保newCharacter.tags是數組
    const currentTags = Array.isArray(newCharacter.tags) ? [...newCharacter.tags] : [];
    
    // 檢查標籤是否已存在
    const tagExists = currentTags.some(t => 
      typeof t === 'string' ? t === tag : (t && t.name === tag)
    );
    
    let newTags;
    if (tagExists) {
      // 移除標籤 - 不管是字符串還是對象格式
      newTags = currentTags.filter(t => 
        typeof t === 'string' ? t !== tag : (t && t.name !== tag)
      );
    } else {
      // 添加標籤 - 使用字符串格式保持一致
      newTags = [...currentTags, tag];
    }
    
    console.log('標籤已更新:', newTags);
    setNewCharacter({...newCharacter, tags: newTags});
  };

  // 處理額外資訊變更
  const handleExtraInfoChange = (index, field, value) => {
    const newExtraInfo = [...newCharacter.extraInfo];
    newExtraInfo[index][field] = value;
    setNewCharacter({ ...newCharacter, extraInfo: newExtraInfo });
  };

  // 添加額外資訊欄位
  const addExtraInfo = () => {
    setNewCharacter({
      ...newCharacter,
      extraInfo: [...newCharacter.extraInfo, { title: "", content: "" }]
    });
  };

  // 移除額外資訊欄位
  const removeExtraInfo = (index) => {
    const newExtraInfo = newCharacter.extraInfo.filter((_, i) => i !== index);
    setNewCharacter({ ...newCharacter, extraInfo: newExtraInfo });
  };

  // 暫存角色資料
  const handleTempSave = () => {
    try {
      if (session) {
        const userId = getSafeUserId(session);
        setUserData(userId, 'tempCharacter', newCharacter);
        setHasTempSave(true);
        alert("角色資料已暫存！");
      } else {
        alert("請先登入！");
      }
    } catch (error) {
      console.error("暫存角色資料失敗:", error);
      alert("暫存失敗: " + error.message);
    }
  };

  // 清除暫存資料
  const clearTempSave = () => {
    try {
      if (session) {
        const userId = getSafeUserId(session);
        setUserData(userId, 'tempCharacter', null);
      }
      
      // 重置表單數據
      setNewCharacter({
        name: "",
        age: "",
        job: "",
        quote: "",
        description: "",
        gender: "男性",
        tags: [],
        basicInfo: "",
        personality: "",
        speakingStyle: "",
        firstChatScene: "",
        firstChatLine: "",
        likes: "",
        dislikes: "",
        isPublic: false,
        extraInfo: []
      });
      
      setAvatarPreview("");
      setHasTempSave(false);
      
      alert("已清除暫存資料！");
    } catch (error) {
      console.error("清除暫存資料失敗:", error);
      alert("清除失敗: " + error.message);
    }
  };

  // 處理新增角色提交
  const handleNewCharacterSubmit = async (e) => {
    e.preventDefault(); // 阻止表單預設提交行為
    
    try {
      if (!session?.user?.id) {
        alert("請先登入再操作！");
        return;
      }
      
      if (router.query.id) {
        // 編輯現有角色
        console.log(`嘗試更新角色 ID: ${router.query.id}`, newCharacter);
        console.log(`年齡欄位檢查: ${newCharacter.age}, 類型: ${typeof newCharacter.age}`);
        
        // 準備要發送到API的數據
        const characterData = {
          ...newCharacter,
          userId: session.user.id,
        };
        
        // 特別處理年齡欄位 - 如果是空字符串，設置為null
        if (characterData.age === "") {
          characterData.age = null;
        }
        
        console.log('準備提交至API的資料:', characterData);
        
        // 發送PATCH請求更新角色
        const result = await axios.patch(`/api/characters/${router.query.id}`, characterData);
        console.log('API更新回應:', result.data);
        
        // 檢查年齡欄位是否已正確更新
        if (newCharacter.age !== undefined && 
            result.data.age !== newCharacter.age && 
            !(newCharacter.age === "" && result.data.age === null)) {
          console.warn('警告: API回應中的年齡與提交的年齡不符', {
            submitted: newCharacter.age,
            returned: result.data.age
          });
        }
        
        // 重新獲取角色列表
        await fetchMyCharacters();
        
        // 提示用戶更新成功
        alert("角色已更新!");
        
        // 返回到角色列表頁面
        router.push('/settings?tab=myCharacters');
      } else {
        // 創建新角色
        try {
          // 嘗試從API創建角色
          console.log('嘗試從API創建角色');
          console.log('提交數據詳情:', JSON.stringify(newCharacter, null, 2));
          
          // 檢查所有欄位是否正確設置
          const fieldsToCheck = ['name', 'age', 'job', 'quote', 'description', 'gender', 'tags', 
                              'basicInfo', 'personality', 'speakingStyle', 'firstChatScene', 
                              'firstChatLine', 'likes', 'dislikes', 'extraInfo'];
          
          fieldsToCheck.forEach(field => {
            console.log(`欄位 ${field} 的值:`, newCharacter[field]);
          });
          
          // 處理欄位，確保與簡介(description)處理方式相同
          const characterData = {
            ...newCharacter,
            quote: newCharacter.quote || "",
            basicInfo: newCharacter.basicInfo || "",
            personality: newCharacter.personality || "",
            speakingStyle: newCharacter.speakingStyle || "",
            likes: newCharacter.likes || "",
            dislikes: newCharacter.dislikes || "",
            firstChatScene: newCharacter.firstChatScene || "",
            firstChatLine: newCharacter.firstChatLine || ""
          };
          
          // 特別處理年齡欄位
          if (characterData.age === "") {
            characterData.age = null;
          }
          
          console.log('處理後準備提交的數據:', JSON.stringify(characterData, null, 2));
          
          const response = await axios.post('/api/characters', characterData);
          const createdCharacter = response.data;
          console.log('角色已從API創建:', createdCharacter.id);
          console.log('API返回的完整數據:', JSON.stringify(createdCharacter, null, 2));
          
          // 重新獲取角色列表
          await fetchMyCharacters();
          
          // 清除暫存資料
          setUserData(session.user.id, 'tempCharacter', null);
          setHasTempSave(false);
          
          alert("角色已創建!");
          
          // 返回到角色列表頁面
          router.push('/settings?tab=myCharacters');
        } catch (apiError) {
          console.error('API創建角色失敗:', apiError);
          
          // 即使API失敗，也更新本地存儲
          const newCharacterData = {
            ...newCharacter,
            id: "local_" + Date.now(), // 使用時間戳作為ID
            creator: session?.user?.name || "我",
            createdAt: new Date().toISOString(),
          };
          
          // 更新狀態
          const updatedCharacters = [...myCharacters, newCharacterData];
          setMyCharacters(updatedCharacters);
          
          // 保存到本地存儲
          setUserData(session.user.id, 'myCharacters', updatedCharacters);
          console.log('更新本地存儲的角色列表');
          
          // 清除暫存資料
          setUserData(session.user.id, 'tempCharacter', null);
          setHasTempSave(false);
          
          alert("角色已創建! (僅本地存儲)");
        }
      }
    } catch (error) {
      console.error("創建/更新角色失敗:", error);
      alert(`操作失敗: ${error.response?.data?.error || error.message}`);
    }
  };

  // 處理角色刪除
  const handleDeleteCharacter = async (characterId) => {
    if (!confirm("確定要刪除這個角色嗎？此操作不可逆。")) {
      return;
    }
    
    try {
      if (!session) {
        alert("請先登入！");
        return;
      }
      
      // 獲取用戶ID
      const userId = getSafeUserId(session);
      
      try {
        // 嘗試從API刪除角色
        console.log('嘗試從API刪除角色:', characterId);
        await axios.delete(`/api/characters/${characterId}`);
        console.log('角色已從API刪除');
      } catch (apiError) {
        console.error('API刪除角色失敗:', apiError);
        // 即使API失敗，我們仍然從本地存儲中刪除
      }
      
      // 從狀態中移除角色
      const updatedCharacters = myCharacters.filter(character => character.id !== characterId);
      setMyCharacters(updatedCharacters);
      
      // 更新本地存儲
      setUserData(userId, 'myCharacters', updatedCharacters);
      console.log('更新本地存儲的角色列表');
      
      alert("角色已刪除!");
    } catch (error) {
      console.error("刪除角色失敗:", error);
      alert("刪除角色失敗，請稍後再試");
    }
  };

  // 處理角色公開狀態切換
  const toggleCharacterPublic = async (characterId) => {
    try {
      if (!session) {
        alert("請先登入！");
        return;
      }
      
      // 獲取用戶ID
      const userId = getSafeUserId(session);
      
      // 找到要更新的角色
      const character = myCharacters.find(char => char.id === characterId);
      if (!character) {
        console.error('未找到要更新的角色:', characterId);
        return;
      }
      
      // 更新角色的公開狀態
      const newPublicState = !character.isPublic;
      
      try {
        // 嘗試從API更新角色
        console.log('嘗試從API更新角色公開狀態:', characterId, newPublicState);
        await axios.patch(`/api/characters/${characterId}`, {
          isPublic: newPublicState
        });
        console.log('角色公開狀態已從API更新');
      } catch (apiError) {
        console.error('API更新角色失敗:', apiError);
        // 即使API失敗，我們仍然更新本地存儲
      }
      
      // 更新角色的公開狀態
      const updatedCharacters = myCharacters.map(character => 
        character.id === characterId 
          ? { ...character, isPublic: newPublicState } 
          : character
      );
      
      // 更新狀態
      setMyCharacters(updatedCharacters);
      
      // 更新本地存儲
      setUserData(userId, 'myCharacters', updatedCharacters);
      console.log('更新本地存儲的角色列表');
    } catch (error) {
      console.error("更改角色公開狀態失敗:", error);
      alert("更改角色公開狀態失敗，請稍後再試");
    }
  };

  // 格式化創建時間
  const formatCreatedTime = (dateString) => {
    return new Date(dateString).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  // 渲染個人資料頁籤
  const renderProfileTab = () => (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl font-bold mb-4">個人資料</h2>
      
      <form onSubmit={handleProfileSubmit}>
        <div className="mb-4 flex flex-col md:flex-row items-start md:items-center">
          <div className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden mb-4 md:mb-0 md:mr-6">
            {myProfile.avatar ? (
              <img 
                src={myProfile.avatar} 
                alt={myProfile.name || "用戶頭像"} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error(`用戶頭像加載失敗: ${myProfile.avatar}`);
                  e.target.onerror = null;
                  e.target.src = '/img/default-avatar.svg';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                {myProfile.name ? myProfile.name.charAt(0).toUpperCase() : "U"}
              </div>
            )}
          </div>
          
          <div className="flex-grow">
            {isEditing ? (
              <div className="mb-4">
                <label className="block text-gray-400 mb-1">頭像</label>
                <div className="flex flex-wrap gap-2">
                  <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition cursor-pointer inline-block">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleProfileAvatarFileChange}
                      className="hidden" 
                    />
                    <span className="text-sm">上傳頭像</span>
                  </label>
                  
                  {myProfile.avatar && (
                    <button 
                      type="button"
                      onClick={() => setMyProfile(prev => ({ ...prev, avatar: "" }))}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition text-sm"
                    >
                      移除頭像
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">或輸入圖片URL</p>
                <input 
                  type="text" 
                  name="avatar" 
                  value={myProfile.avatar} 
                  onChange={handleProfileChange} 
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white mt-1"
                  placeholder="輸入頭像圖片的URL"
                />
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm mb-4"
              >
                編輯個人資料
              </button>
            )}
          </div>
        </div>
        
        {/* 頭像編輯器模態框 */}
        {showAvatarEditor && avatarFile && (
          <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">編輯頭像</h3>
              
              <div className="flex justify-center mb-4">
                <AvatarEditor
                  ref={avatarEditorRef}
                  image={avatarFile}
                  width={250}
                  height={250}
                  border={50}
                  borderRadius={125}
                  color={[0, 0, 0, 0.6]}
                  scale={avatarZoom}
                  rotate={avatarRotation}
                  position={avatarPosition}
                  onPositionChange={setAvatarPosition}
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">縮放</label>
                <input
                  type="range"
                  min="1"
                  max="2"
                  step="0.01"
                  value={avatarZoom}
                  onChange={(e) => setAvatarZoom(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">旋轉</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={avatarRotation}
                  onChange={(e) => setAvatarRotation(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <p className="text-sm text-gray-400 mb-2">提示：直接用滑鼠拖曳或觸控移動來調整頭像位置</p>
              
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={handleCancelAvatarEdit}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleProfileAvatarConfirm}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2 inline-block"></div>
                      處理中...
                    </>
                  ) : (
                    "確認"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {isEditing ? (
          <>
            <div className="mb-4">
              <label className="block text-gray-400 mb-1">姓名</label>
              <input 
                type="text" 
                name="name" 
                value={myProfile.name} 
                onChange={handleProfileChange} 
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="輸入你的姓名"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 mb-1">電子郵件</label>
              <input 
                type="email" 
                name="email" 
                value={myProfile.email} 
                onChange={handleProfileChange} 
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="輸入你的電子郵件" 
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">電子郵件無法修改</p>
            </div>
            
            {/* API 金鑰設定區 */}
            <div className="border-t border-gray-700 pt-4 mb-4">
              <h3 className="text-lg font-semibold mb-3">API 金鑰設定</h3>
              
              <div className="mb-4">
                <label className="block text-gray-400 mb-1">
                  GPT API 金鑰 
                  <span className="text-xs ml-2 text-gray-500">(OpenAI API key)</span>
                </label>
                <input 
                  type="password" 
                  name="gpt" 
                  value={myProfile.apiKeys?.gpt || ""}
                  onChange={handleApiKeyChange} 
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="sk-..." 
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-400 mb-1">
                  Claude API 金鑰
                  <span className="text-xs ml-2 text-gray-500">(Anthropic API key)</span>
                </label>
                <input 
                  type="password" 
                  name="claude" 
                  value={myProfile.apiKeys?.claude || ""}
                  onChange={handleApiKeyChange} 
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="sk-ant-..." 
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-400 mb-1">
                  Gemini API 金鑰
                  <span className="text-xs ml-2 text-gray-500">(Google AI API key)</span>
                </label>
                <input 
                  type="password" 
                  name="gemini" 
                  value={myProfile.apiKeys?.gemini || ""}
                  onChange={handleApiKeyChange} 
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="AIza..." 
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-400 mb-1">預設使用模型</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button 
                    type="button"
                    onClick={() => setMyProfile({...myProfile, defaultModel: 'gpt'})}
                    className={`py-2 px-4 rounded-md text-center transition ${
                      myProfile.defaultModel === 'gpt' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    GPT
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMyProfile({...myProfile, defaultModel: 'claude'})}
                    className={`py-2 px-4 rounded-md text-center transition ${
                      myProfile.defaultModel === 'claude' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Claude
                  </button>
                  <button 
                    type="button"
                    onClick={() => setMyProfile({...myProfile, defaultModel: 'gemini'})}
                    className={`py-2 px-4 rounded-md text-center transition ${
                      myProfile.defaultModel === 'gemini' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Gemini
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition"
              >
                取消
              </button>
              <button 
                type="submit"
                onClick={handleProfileSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                保存
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="mb-2">
              <span className="text-gray-400 mr-2">姓名:</span>
              <span>{myProfile.name}</span>
            </div>
            <div className="mb-2">
              <span className="text-gray-400 mr-2">電子郵件:</span>
              <span>{myProfile.email}</span>
            </div>
            
            {/* 顯示API金鑰狀態 */}
            <div className="mt-6 border-t border-gray-700 pt-4">
              <h3 className="text-lg font-semibold mb-2">API 金鑰狀態</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${myProfile.apiKeys?.gpt ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-gray-300">GPT API 金鑰</span>
                  <span className="ml-2 text-xs text-gray-500">{myProfile.apiKeys?.gpt ? '已設定' : '未設定'}</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${myProfile.apiKeys?.claude ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-gray-300">Claude API 金鑰</span>
                  <span className="ml-2 text-xs text-gray-500">{myProfile.apiKeys?.claude ? '已設定' : '未設定'}</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${myProfile.apiKeys?.gemini ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-gray-300">Gemini API 金鑰</span>
                  <span className="ml-2 text-xs text-gray-500">{myProfile.apiKeys?.gemini ? '已設定' : '未設定'}</span>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-2">預設使用模型: <span className="font-semibold text-blue-400">
                {myProfile.defaultModel ? 
                  myProfile.defaultModel.charAt(0).toUpperCase() + myProfile.defaultModel.slice(1) : 
                  'Gemini'}
              </span></p>
            </div>
          </div>
        )}
      </form>
    </div>
  );

  // 渲染我的角色頁籤
  const renderMyCharactersTab = () => (
    <div>
      <h2 className="text-xl font-bold mb-4">我的角色</h2>
      
      {myCharacters.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-400 mb-4">你還沒有創建角色</p>
          <button 
            onClick={() => setActiveTab("newCharacter")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            創建角色
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myCharacters.map(character => (
            <div 
              key={character.id} 
              className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-700 transition"
              onClick={() => router.push(`/character/${character.id}`)}
            >
              <div className="p-4">
                <div className="flex items-start mb-4">
                  <div 
                    className="w-16 h-16 bg-gray-700 rounded-full overflow-hidden mr-4 flex-shrink-0 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/character/${character.id}`);
                    }}
                  >
                    {character.avatar ? (
                      <img 
                        src={character.avatar.startsWith('data:') ? character.avatar : `/img/${character.avatar}`} 
                        alt={character.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <span className="text-2xl">{character.name?.[0] || "?"}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 
                        className="text-xl font-medium hover:text-blue-400 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/character/${character.id}`);
                        }}
                      >{character.name}</h3>
                      <div className="flex space-x-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/chat/${character.id}`);
                          }}
                          className="p-1 text-blue-400 hover:text-blue-300"
                          title="開始聊天"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/settings?tab=editCharacter&id=${character.id}`);
                          }}
                          className="p-1 text-yellow-400 hover:text-yellow-300"
                          title="編輯角色"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCharacter(character.id);
                          }}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="刪除角色"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-300 mb-2">{character.job}</p>
                    
                    <div className="mb-2">
                      <p className="text-gray-400 text-sm whitespace-pre-wrap line-clamp-2">{character.description}</p>
                    </div>
                    
                    {character.tags && character.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {character.tags.map((tag, index) => (
                          <span 
                            key={index} 
                            className="text-xs bg-gray-700 px-2 py-1 rounded-md text-gray-300"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>創建於: {formatCreatedTime(character.createdAt)}</span>
                  
                  <label 
                    className="flex items-center cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input 
                      type="checkbox" 
                      checked={character.isPublic} 
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleCharacterPublic(character.id);
                      }} 
                      className="sr-only"
                    />
                    <div className={`w-9 h-5 rounded-full transition ${character.isPublic ? 'bg-blue-600' : 'bg-gray-600'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full transition transform ${character.isPublic ? 'translate-x-5' : 'translate-x-1'} my-1`}></div>
                    </div>
                    <span className="ml-2">公開</span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // 渲染新增角色頁籤
  const renderNewCharacterTab = () => (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {activeTab === "editCharacter" ? "編輯角色" : "創建新角色"}
      </h2>
      
      {/* 調試信息 */}
      {process.env.NODE_ENV !== "production" && (
        <div className="mb-4 p-3 bg-gray-900 rounded-lg text-xs overflow-auto max-h-80">
          <p>當前標籤: {activeTab}</p>
          <p>角色ID: {router.query.id || "無"}</p>
          <p>載入狀態: {loadingCharacter ? "加載中" : "已完成"}</p>
          <p>表單數據摘要: {newCharacter.name ? `${newCharacter.name} (${newCharacter.job})` : "無數據"}</p>
          
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="font-bold">詳細表單數據:</p>
            <p>姓名: {newCharacter.name || "未設置"}</p>
            <p>職業: {newCharacter.job || "未設置"}</p>
            <p>年齡: {newCharacter.age || "未設置"}</p>
            <p>性別: {newCharacter.gender || "未設置"}</p>
            <p>格言: {newCharacter.quote || "未設置"}</p>
            <p>標籤: {newCharacter.tags && newCharacter.tags.length > 0 ? 
              (Array.isArray(newCharacter.tags) ? 
                newCharacter.tags.map(tag => typeof tag === 'string' ? tag : (tag.name || 'unknown')).join(", ") 
                : "標籤格式錯誤") 
              : "無標籤"}</p>
            <p>基本資料: {newCharacter.basicInfo ? "已設置" : "未設置"}</p>
            <p>性格特點: {newCharacter.personality ? "已設置" : "未設置"}</p>
            <p>說話方式: {newCharacter.speakingStyle ? "已設置" : "未設置"}</p>
            <p>首次對話場景: {newCharacter.firstChatScene ? "已設置" : "未設置"}</p>
            <p>首次對話台詞: {newCharacter.firstChatLine ? "已設置" : "未設置"}</p>
            <p>喜好: {newCharacter.likes ? "已設置" : "未設置"}</p>
            <p>討厭: {newCharacter.dislikes ? "已設置" : "未設置"}</p>
          </div>
          
          {/* API 資料重新載入按鈕 */}
          {activeTab === "editCharacter" && router.query.id && (
            <div className="mt-3 pt-2 border-t border-gray-700">
              <button
                type="button"
                onClick={() => loadCharacterData(router.query.id)}
                className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-xs"
                disabled={loadingCharacter}
              >
                {loadingCharacter ? "載入中..." : "重新載入角色資料"}
              </button>
              <p className="mt-1 text-gray-400">如果資料看起來不完整，請點擊按鈕重新從API載入</p>
            </div>
          )}
        </div>
      )}
      
      {/* 可見的重新載入按鈕 - 生產環境也顯示 */}
      {activeTab === "editCharacter" && router.query.id && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => loadCharacterData(router.query.id)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition flex items-center"
            disabled={loadingCharacter}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            {loadingCharacter ? "載入中..." : "重新載入角色資料"}
          </button>
          <p className="mt-1 text-sm text-gray-400">如果編輯表單中資料不完整，請點擊此按鈕</p>
        </div>
      )}
      
      <form
        onSubmit={handleNewCharacterSubmit}
        className="space-y-5"
      >
        {/* 頭像上傳區域 */}
        <div className="mb-6">
          <label className="block text-gray-400 mb-2">角色頭像</label>
          <div className="flex items-start space-x-4">
            <div className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden mb-4 md:mb-0 flex-shrink-0 relative">
              {avatarPreview || newCharacter.avatar ? (
                <img 
                  src={avatarPreview || newCharacter.avatar} 
                  alt={newCharacter.name || "角色頭像"} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                  {newCharacter.name ? newCharacter.name.charAt(0).toUpperCase() : "?"}
                </div>
              )}
            </div>
            
            <div className="flex-grow">
              <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition cursor-pointer inline-block">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarFileChange}
                  className="hidden" 
                />
                <span className="text-sm">選擇圖片</span>
              </label>
              
              {(avatarPreview || newCharacter.avatar) && (
                <button 
                  type="button"
                  onClick={() => {
                    setAvatarPreview("");
                    setNewCharacter(prev => ({ ...prev, avatar: "" }));
                  }}
                  className="ml-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition text-sm"
                >
                  移除頭像
                </button>
              )}
              <p className="text-xs text-gray-500 mt-2">建議上傳正方形圖片，最佳尺寸為 200x200 像素</p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-gray-400 mb-1">角色名稱 *</label>
          <input 
            type="text" 
            name="name" 
            value={newCharacter.name} 
            onChange={handleNewCharacterChange} 
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="輸入角色名稱" 
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-400 mb-1">年齡</label>
            <input 
              type="text" 
              name="age" 
              value={newCharacter.age || ""} 
              onChange={handleNewCharacterChange} 
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="輸入角色年齡"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 mb-1">職業 *</label>
            <input 
              type="text" 
              name="job" 
              value={newCharacter.job} 
              onChange={handleNewCharacterChange} 
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="輸入角色職業"
              required
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">
            性別
          </label>
          <select
            name="gender"
            value={newCharacter.gender}
            onChange={handleNewCharacterChange}
            className="w-full p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="男性">男性</option>
            <option value="女性">女性</option>
            <option value="其他">其他</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-1">標籤 (可多選)</label>
          <div className="flex flex-wrap gap-2 mt-2">
            {["劇情", "系統", "歷史", "科幻", "奇幻", "現代", "冒險", "戀愛", "懸疑", "恐怖"].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagChange(tag)}
                className={`px-3 py-2 rounded-md text-sm ${
                  Array.isArray(newCharacter.tags) && newCharacter.tags.some(t => 
                    typeof t === 'string' ? t === tag : (t && t.name === tag)
                  )
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          {(!newCharacter.tags || newCharacter.tags.length === 0) && (
            <p className="text-xs text-gray-500 mt-1">請至少選擇一個標籤</p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-1">代表性格言</label>
          <input 
            type="text" 
            name="quote" 
            value={newCharacter.quote} 
            onChange={handleNewCharacterChange} 
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            placeholder="輸入一句能代表角色性格的話"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-1">角色簡介 *</label>
          <textarea 
            name="description" 
            value={newCharacter.description} 
            onChange={handleNewCharacterChange} 
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none h-24"
            placeholder="簡單介紹角色的背景和性格"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-1">基本資料</label>
          <textarea 
            name="basicInfo" 
            value={newCharacter.basicInfo} 
            onChange={handleNewCharacterChange} 
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none h-24"
            placeholder="角色的出生地、家庭背景、學歷等基本資料"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-1">性格特點</label>
          <textarea 
            name="personality" 
            value={newCharacter.personality} 
            onChange={handleNewCharacterChange} 
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none h-24"
            placeholder="詳細描述角色的性格特點和行為模式"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-1">說話方式</label>
          <textarea 
            name="speakingStyle" 
            value={newCharacter.speakingStyle} 
            onChange={handleNewCharacterChange} 
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none h-24"
            placeholder="角色的說話風格、特殊用語、口頭禪等"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-1">首次對話場景</label>
          <textarea 
            name="firstChatScene" 
            value={newCharacter.firstChatScene} 
            onChange={handleNewCharacterChange} 
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none h-24"
            placeholder="描述與角色首次見面的場景和情境"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-400 mb-1">首次對話台詞</label>
          <textarea 
            name="firstChatLine" 
            value={newCharacter.firstChatLine} 
            onChange={handleNewCharacterChange} 
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none h-24"
            placeholder="角色首次見面時會說的話"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-400 mb-1">喜好</label>
            <textarea 
              name="likes" 
              value={newCharacter.likes} 
              onChange={handleNewCharacterChange} 
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none h-24"
              placeholder="角色喜歡的事物或活動"
            />
          </div>
          
          <div>
            <label className="block text-gray-400 mb-1">厭惡</label>
            <textarea 
              name="dislikes" 
              value={newCharacter.dislikes} 
              onChange={handleNewCharacterChange} 
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none h-24"
              placeholder="角色討厭的事物或活動"
            />
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">額外資訊</h3>
          
          {newCharacter.extraInfo.map((info, index) => (
            <div key={index} className="mb-4 p-3 bg-gray-700 rounded-lg">
              <div className="flex justify-between mb-2">
                <h4 className="text-md font-medium">額外資訊 #{index + 1}</h4>
                
                {index > 0 && (
                  <button 
                    type="button"
                    onClick={() => removeExtraInfo(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="mb-2">
                <input 
                  type="text" 
                  value={info.title} 
                  onChange={(e) => handleExtraInfoChange(index, "title", e.target.value)} 
                  className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
                  placeholder="標題（例如：特殊能力、重要經歷等）"
                />
              </div>
              
              <div>
                <textarea 
                  value={info.content} 
                  onChange={(e) => handleExtraInfoChange(index, "content", e.target.value)} 
                  className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg text-white resize-none h-24"
                  placeholder="詳細內容"
                />
              </div>
            </div>
          ))}
          
          <button 
            type="button"
            onClick={addExtraInfo}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            添加額外資訊
          </button>
        </div>
        
        <div className="mb-6">
          <label className="flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              name="isPublic" 
              checked={newCharacter.isPublic} 
              onChange={handleNewCharacterChange} 
              className="sr-only"
            />
            <div className={`w-9 h-5 rounded-full transition ${newCharacter.isPublic ? 'bg-blue-600' : 'bg-gray-600'}`}>
              <div className={`w-3 h-3 bg-white rounded-full transition transform ${newCharacter.isPublic ? 'translate-x-5' : 'translate-x-1'} my-1`}></div>
            </div>
            <span className="ml-2 text-gray-300">公開角色（其他用戶可以查看和互動）</span>
          </label>
        </div>
        
        <div className="flex justify-end space-x-3">
          {activeTab === "editCharacter" && (
            <button
              type="button" 
              onClick={() => router.push('/settings?tab=myCharacters')}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition"
              disabled={loadingCharacter}
            >
              取消編輯
            </button>
          )}
          {activeTab === "newCharacter" && (
            <button
              type="button"
              onClick={handleTempSave}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition"
            >
              暫時存檔
            </button>
          )}
          <button
            type="submit"
            className={`px-6 py-2 ${loadingCharacter ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} rounded-md transition`}
            disabled={loadingCharacter}
          >
            {activeTab === "editCharacter" ? (loadingCharacter ? "載入中..." : "更新角色") : "創建角色"}
          </button>
        </div>
      </form>

      {/* 頭像編輯模態窗 */}
      {showAvatarEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 w-11/12 md:w-2/3 max-w-xl">
            <h3 className="text-lg font-medium mb-3">調整頭像</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 左側：編輯器 */}
              <div className="md:col-span-2 flex flex-col items-center">
                <AvatarEditor
                  ref={avatarEditorRef}
                  image={avatarFile}
                  width={200}
                  height={200}
                  border={25}
                  borderRadius={100}
                  color={[0, 0, 0, 0.6]} // 編輯區域外的顏色
                  scale={avatarZoom}
                  rotate={avatarRotation}
                  position={avatarPosition}
                  onPositionChange={setAvatarPosition}
                  className="mx-auto"
                />
                
                <div className="mt-3 w-full">
                  <label className="block text-sm font-medium text-gray-400 mb-1">縮放</label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={avatarZoom}
                    onChange={(e) => setAvatarZoom(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
              
              {/* 右側：控制項 */}
              <div className="flex flex-col">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-400 mb-1">旋轉</label>
                  <div className="flex space-x-1 mb-3">
                    <button
                      type="button"
                      onClick={() => setAvatarRotation(avatarRotation - 90)}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded flex-1 text-sm"
                    >
                      ↺ 向左
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarRotation(avatarRotation + 90)}
                      className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded flex-1 text-sm"
                    >
                      ↻ 向右
                    </button>
                  </div>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm text-gray-400 mb-2">提示：直接用滑鼠拖曳或觸控移動來調整頭像位置</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={handleCancelAvatarEdit}
                className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveAvatar}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 當進入編輯模式時載入角色數據 - 修改為專注於監聽activeTab的變化
  useEffect(() => {
    if (activeTab === "editCharacter" && router.query.id) {
      console.log('監測到編輯模式狀態變化，ID:', router.query.id);
      // 已移至URL參數變化的useEffect中處理
    }
  }, [activeTab]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">設定</h1>
      
      <div className="flex border-b border-gray-700">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'profile' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400 hover:text-white'}`}
          onClick={() => {
            setActiveTab("profile");
            router.push("/settings?tab=profile", undefined, { shallow: true });
          }}
        >
          個人資料
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'myCharacters' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400 hover:text-white'}`}
          onClick={() => {
            setActiveTab("myCharacters");
            router.push("/settings?tab=myCharacters", undefined, { shallow: true });
          }}
        >
          我的角色
        </button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'newCharacter' || activeTab === 'editCharacter' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400 hover:text-white'}`}
          onClick={() => {
            setActiveTab("newCharacter");
            router.push("/settings?tab=newCharacter", undefined, { shallow: true });
          }}
        >
          {activeTab === "editCharacter" ? "編輯角色" : "創建角色"}
        </button>
      </div>
      
      <div className="mt-6">
        {activeTab === "profile" && renderProfileTab()}
        {activeTab === "myCharacters" && renderMyCharactersTab()}
        {(activeTab === "newCharacter" || activeTab === "editCharacter") && renderNewCharacterTab()}
      </div>
    </div>
  );
} 
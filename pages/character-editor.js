import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import axios from "axios";

export default function CharacterEditor() {
  const { data: session } = useSession();
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  const [character, setCharacter] = useState({
    avatar: "", // 頭貼 URL
    language: "繁體中文", // 可選 英文、繁體中文
    name: "",
    age: "",
    job: "",
    quote: "", // 來自角色的一句話
    description: "", // 角色介紹
    gender: "未設定", // 男/女/未設定
    basicInfo: "", // 基本資訊
    personality: "", // 性格
    speakingStyle: "", // 說話習慣與風格
    firstChatScene: "", // 第一次聊天 場景描述
    firstChatLine: "", // 角色第一句話
    likes: "", // 喜歡
    dislikes: "", // 不喜歡
    extraInfo: [{ title: "", content: "" }], // 其他附加資訊
    isPublic: false, // 是否公開
    tags: [], // 標籤
    system: "", // 系統提示詞
  });

  // 如果有ID，則獲取角色數據
  useEffect(() => {
    if (id) {
      const fetchCharacter = async () => {
        try {
          setLoading(true);
          const response = await axios.get(`/api/characters/${id}`);
          
          // 將API返回的數據格式轉換為編輯器使用的格式
          const apiCharacter = response.data;
          const formattedCharacter = {
            ...apiCharacter,
            tags: apiCharacter.tags.map(tag => tag.name),
            extraInfo: apiCharacter.extraInfo ? JSON.parse(apiCharacter.extraInfo) : [{ title: "", content: "" }]
          };
          
          setCharacter(formattedCharacter);
        } catch (error) {
          console.error("獲取角色失敗:", error);
          setMessage("獲取角色失敗，請稍後再試");
        } finally {
          setLoading(false);
        }
      };
      
      fetchCharacter();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCharacter((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleExtraInfoChange = (index, field, value) => {
    const newExtraInfo = [...character.extraInfo];
    newExtraInfo[index][field] = value;
    setCharacter({ ...character, extraInfo: newExtraInfo });
  };

  const addExtraInfo = () => {
    setCharacter({
      ...character,
      extraInfo: [...character.extraInfo, { title: "", content: "" }],
    });
  };

  const removeExtraInfo = (index) => {
    const newExtraInfo = character.extraInfo.filter((_, i) => i !== index);
    setCharacter({ ...character, extraInfo: newExtraInfo });
  };

  const saveCharacter = async () => {
    if (!session) {
      setMessage("請先登入");
      return;
    }
    
    if (!character.name || !character.description) {
      setMessage("角色名稱和描述為必填項");
      return;
    }
    
    try {
      setLoading(true);
      setMessage("");
      
      // 準備要發送的數據
      const characterData = {
        ...character,
        extraInfo: JSON.stringify(character.extraInfo)
      };
      
      let response;
      
      if (id) {
        // 更新現有角色
        response = await axios.put(`/api/characters/${id}`, characterData);
        setMessage("角色更新成功");
      } else {
        // 創建新角色
        response = await axios.post('/api/characters', characterData);
        setMessage("角色創建成功");
      }
      
      // 延遲後跳轉到角色列表頁面
      setTimeout(() => {
        router.push('/characters');
      }, 1500);
      
    } catch (error) {
      console.error("保存角色失敗:", error);
      setMessage("保存角色失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const downloadJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(character, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `${character.name || "character"}.json`;
    link.click();
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-800 shadow-lg rounded-lg text-white">
      <h1 className="text-2xl font-bold mb-4">{id ? "編輯角色" : "創建新角色"}</h1>
      
      {message && (
        <div className={`p-3 mb-4 rounded ${message.includes('失敗') ? 'bg-red-600' : 'bg-green-600'}`}>
          {message}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block mb-1">頭像</label>
          <input 
            type="text" 
            name="avatar" 
            value={character.avatar}
            placeholder="頭像URL" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">語言</label>
          <select 
            name="language" 
            value={character.language}
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange}
          >
            <option value="繁體中文">繁體中文</option>
            <option value="English">English</option>
          </select>
        </div>
        
        <div>
          <label className="block mb-1">角色名稱 *</label>
          <input 
            type="text" 
            name="name" 
            value={character.name}
            placeholder="角色名稱" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">年齡</label>
          <input 
            type="text" 
            name="age" 
            value={character.age}
            placeholder="年齡" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">職業</label>
          <input 
            type="text" 
            name="job" 
            value={character.job}
            placeholder="職業" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">來自角色的一句話</label>
          <textarea 
            name="quote" 
            value={character.quote}
            placeholder="來自角色的一句話" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">角色介紹 *</label>
          <textarea 
            name="description" 
            value={character.description}
            placeholder="角色介紹" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            rows="4"
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">標籤（用逗號分隔）</label>
          <input 
            type="text" 
            name="tags" 
            value={Array.isArray(character.tags) ? character.tags.join(', ') : ''}
            placeholder="標籤，例如：友善, 幽默, 知識豐富" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={(e) => {
              const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
              setCharacter({...character, tags: tagsArray});
            }} 
          />
        </div>
        
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="isPublic" 
            name="isPublic" 
            checked={character.isPublic}
            className="mr-2" 
            onChange={(e) => setCharacter({...character, isPublic: e.target.checked})} 
          />
          <label htmlFor="isPublic">公開角色（其他用戶可見）</label>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold mt-6">角色基本設定</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1">性別</label>
          <select 
            name="gender" 
            value={character.gender}
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange}
          >
            <option value="未設定">未設定</option>
            <option value="男性">男性</option>
            <option value="女性">女性</option>
            <option value="其他">其他</option>
          </select>
        </div>
        
        <div>
          <label className="block mb-1">基本資訊</label>
          <textarea 
            name="basicInfo" 
            value={character.basicInfo}
            placeholder="基本資訊" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">性格</label>
          <textarea 
            name="personality" 
            value={character.personality}
            placeholder="性格" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">說話習慣與風格</label>
          <textarea 
            name="speakingStyle" 
            value={character.speakingStyle}
            placeholder="說話習慣與風格" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
      </div>
      
      <h2 className="text-xl font-semibold mt-6">第一次聊天</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1">場景描述</label>
          <textarea 
            name="firstChatScene" 
            value={character.firstChatScene}
            placeholder="場景描述" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">角色第一句話</label>
          <textarea 
            name="firstChatLine" 
            value={character.firstChatLine}
            placeholder="角色第一句話" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
      </div>
      
      <h2 className="text-xl font-semibold mt-6">角色詳細設定</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1">喜歡</label>
          <input 
            type="text" 
            name="likes" 
            value={character.likes}
            placeholder="喜歡" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">不喜歡</label>
          <input 
            type="text" 
            name="dislikes" 
            value={character.dislikes}
            placeholder="不喜歡" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            onChange={handleChange} 
          />
        </div>
        
        <div>
          <label className="block mb-1">系統提示詞</label>
          <textarea 
            name="system" 
            value={character.system}
            placeholder="系統提示詞（用於控制AI行為）" 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
            rows="4"
            onChange={handleChange} 
          />
        </div>
      </div>
      
      <h2 className="text-xl font-semibold mt-6">其他附加資訊</h2>
      {character.extraInfo.map((info, index) => (
        <div key={index} className="space-y-2 mt-3">
          <input 
            placeholder="標題" 
            value={info.title} 
            onChange={(e) => handleExtraInfoChange(index, "title", e.target.value)} 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
          />
          <textarea 
            placeholder="內容" 
            value={info.content} 
            onChange={(e) => handleExtraInfoChange(index, "content", e.target.value)} 
            className="w-full p-2 border rounded bg-gray-700 text-white" 
          />
          <button 
            className="text-red-400 hover:text-red-300" 
            onClick={() => removeExtraInfo(index)}
          >
            移除
          </button>
        </div>
      ))}
      <button 
        onClick={addExtraInfo} 
        className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
      >
        新增附加資訊
      </button>
      
      <div className="mt-6 flex space-x-4">
        <button 
          onClick={saveCharacter} 
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "處理中..." : (id ? "更新角色" : "創建角色")}
        </button>
        
        <button 
          onClick={downloadJSON} 
          className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg"
        >
          下載JSON
        </button>
        
        <button 
          onClick={() => router.push('/characters')} 
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          返回
        </button>
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import prisma from "../../lib/prisma";

// 從環境變量中獲取API密鑰
const BACKEND_API_KEY = process.env.BACKEND_API_KEY || "";

export default async function handler(req, res) {
  console.log("API: 角色請求開始處理");
  
  try {
    // 檢查是否使用API密鑰訪問
    const apiKey = req.query.api_key || "";
    const isValidApiKey = BACKEND_API_KEY && apiKey === BACKEND_API_KEY;
    
    // 外層定義session變數，默認為null
    let session = null;
    
    if (isValidApiKey) {
      console.log("API: 使用API密鑰授權訪問");
    } else {
      // 如果沒有有效的API密鑰，則需要有效的會話
      session = await getServerSession(req, res, authOptions);
      if (!session) {
        console.log("API: 未授權訪問，沒有有效會話或API密鑰");
        return res.status(401).json({ error: "未授權" });
      }
      console.log(`API: 已授權用戶 ID: ${session.user.id}, 名稱: ${session.user.name}`);
    }

    const { method } = req;
    console.log(`API: 請求方法: ${method}`);

    switch (method) {
      case "GET":
        console.log("API: 獲取角色列表");
        
        // 檢查是否請求好友角色
        const isFriend = req.query.isFriend === 'true';
        console.log(`API: 是否請求好友角色: ${isFriend}`);
        
        try {
          // 如果使用API密鑰，獲取所有角色；否則只獲取用戶創建的角色
          const whereClause = isValidApiKey 
            ? {} 
            : { creatorId: session.user.id };
          
          // 獲取角色
          const characters = await prisma.character.findMany({
            where: whereClause,
            include: {
              tags: true,
              creator: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              updatedAt: 'desc'
            }
          });
          
          // 確保返回的是數組
          const safeCharacters = characters || [];
          
          // 獲取用戶的好友列表
          const userId = isValidApiKey ? null : session.user.id;
          let friendIds = new Set();
          
          if (userId) {
            const userFriends = await prisma.userFriend.findMany({
              where: {
                userId: userId
              }
            });
            friendIds = new Set(userFriends.map(uf => uf.characterId));
          }
          
          // 處理角色數據
          const processedCharacters = safeCharacters.map(character => {
            // 處理標籤
            const processedTags = character.tags.map(tag => ({
              id: tag.id,
              name: tag.name
            }));
            
            return {
              ...character,
              tags: processedTags,
              // 檢查角色是否是好友
              isFriend: friendIds.has(character.id)
            };
          });
          
          // 如果請求的是好友角色，則過濾出標記為好友的角色
          const resultCharacters = (isFriend && userId) 
            ? processedCharacters.filter(char => friendIds.has(char.id))
            : processedCharacters;
          
          console.log(`API: 找到 ${resultCharacters.length} 個角色`);
          
          return res.status(200).json(resultCharacters);
        } catch (queryError) {
          console.error("API: 查詢角色時出錯:", queryError);
          return res.status(500).json({ error: "查詢角色失敗", details: queryError.message });
        }
        
      case "POST":
        console.log("API: 創建新角色");
        // 創建新角色
        const { 
          name, description, job, gender, avatar, isPublic, tags, system,
          // 新增欄位
          age, quote, basicInfo, personality, speakingStyle, likes, dislikes, 
          firstChatScene, firstChatLine, extraInfo 
        } = req.body;
        
        console.log("API: 收到的完整請求數據:", JSON.stringify(req.body, null, 2));
        
        // 記錄所有欄位的值
        console.log("API: 欄位值檢查:");
        console.log(`name: ${name}, description: ${description}, job: ${job}`);
        console.log(`gender: ${gender}, age: ${age}, quote: ${quote}`);
        console.log(`basicInfo: ${basicInfo}, personality: ${personality}`);
        console.log(`speakingStyle: ${speakingStyle}, likes: ${likes}, dislikes: ${dislikes}`);
        console.log(`firstChatScene: ${firstChatScene}, firstChatLine: ${firstChatLine}`);
        console.log(`extraInfo: ${JSON.stringify(extraInfo)}`);
        
        if (!name) {
          return res.status(400).json({ error: "角色名稱不能為空" });
        }
        
        console.log(`API: 角色名稱: ${name}, 創建者: ${session.user.id}`);
        
        // 處理標籤數據
        let processedTags = [];
        if (tags && Array.isArray(tags)) {
          processedTags = tags.filter(tag => tag && typeof tag === 'string');
        }
        
        try {
          const newCharacter = await prisma.character.create({
            data: {
              name,
              description: description || "",
              job: job || "",
              gender: gender || "未指定",
              avatar: avatar || "",
              isPublic: isPublic || false,
              system: system || "",
              // 新增欄位 - 統一使用與description相同的處理方式: 使用空字符串代替null
              age: age === "" ? null : age,
              quote: quote || "",
              basicInfo: basicInfo || "",
              personality: personality || "",
              speakingStyle: speakingStyle || "",
              likes: likes || "",
              dislikes: dislikes || "",
              firstChatScene: firstChatScene || "",
              firstChatLine: firstChatLine || "",
              extraInfo: extraInfo || [],
              // 關聯
              creator: {
                connect: { id: session.user.id }
              },
              // 只有在有標籤時才添加標籤關聯
              ...(processedTags.length > 0 ? {
                tags: {
                  connectOrCreate: processedTags.map(tag => ({
                    where: { name: tag },
                    create: { name: tag }
                  }))
                }
              } : {})
            }
          });
          
          console.log(`API: 角色創建成功，ID: ${newCharacter.id}`);
          console.log("API: 創建的角色數據:", JSON.stringify(newCharacter, null, 2));
          console.log("API: 驗證欄位值:");
          console.log(`name: ${newCharacter.name}, description: ${newCharacter.description}`);
          console.log(`job: ${newCharacter.job}, gender: ${newCharacter.gender}`);
          console.log(`age: ${newCharacter.age}, quote: ${newCharacter.quote}`);
          console.log(`basicInfo: ${newCharacter.basicInfo}, personality: ${newCharacter.personality}`);
          
          return res.status(201).json(newCharacter);
        } catch (createError) {
          console.error("API: 創建角色時出錯:", createError);
          return res.status(500).json({ error: "創建角色失敗", details: createError.message });
        }
        
      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("API: 角色操作錯誤:", error);
    return res.status(500).json({ error: "內部伺服器錯誤", details: error.message });
  }
} 
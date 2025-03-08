import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import prisma from "../../lib/prisma";

export default async function handler(req, res) {
  console.log("API: 角色請求開始處理");
  
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      console.log("API: 未授權訪問，沒有有效會話");
      return res.status(401).json({ error: "未授權" });
    }
    
    console.log(`API: 已授權用戶 ID: ${session.user.id}, 名稱: ${session.user.name}`);

    const { method } = req;
    console.log(`API: 請求方法: ${method}`);

    switch (method) {
      case "GET":
        console.log("API: 獲取角色列表");
        
        // 檢查是否請求好友角色
        const isFriend = req.query.isFriend === 'true';
        console.log(`API: 是否請求好友角色: ${isFriend}`);
        
        try {
          // 獲取用戶的角色 - 只查詢用戶創建的角色
          const characters = await prisma.character.findMany({
            where: {
              creatorId: session.user.id
            },
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
          const userId = session.user.id;
          const userFriends = await prisma.userFriend.findMany({
            where: {
              userId: userId
            }
          });
          
          // 創建好友ID集合，方便查詢
          const friendIds = new Set(userFriends.map(uf => uf.characterId));
          
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
          const resultCharacters = isFriend 
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
        const { name, description, job, gender, avatar, isPublic, tags, system } = req.body;
        
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
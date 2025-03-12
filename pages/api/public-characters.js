import prisma from "../../lib/prisma";

export default async function handler(req, res) {
  console.log("API: 公共角色請求開始處理");
  
  try {
    const { method } = req;
    console.log(`API: 請求方法: ${method}`);

    if (method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }
    
    console.log("API: 獲取公共角色列表");
    
    try {
      // 只獲取公開的角色
      const characters = await prisma.character.findMany({
        where: {
          isPublic: true
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
      
      // 處理角色數據
      const processedCharacters = characters.map(character => {
        // 處理標籤
        const processedTags = character.tags.map(tag => ({
          id: tag.id,
          name: tag.name
        }));
        
        return {
          ...character,
          tags: processedTags,
          isFriend: false  // 公共API不需要好友狀態
        };
      });
      
      console.log(`API: 找到 ${processedCharacters.length} 個公共角色`);
      
      return res.status(200).json(processedCharacters);
    } catch (queryError) {
      console.error("API: 查詢公共角色時出錯:", queryError);
      return res.status(500).json({ error: "查詢公共角色失敗", details: queryError.message });
    }
  } catch (error) {
    console.error("API: 公共角色操作錯誤:", error);
    return res.status(500).json({ error: "內部伺服器錯誤", details: error.message });
  }
} 
import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  console.log("API: 公共單個角色請求開始處理");
  
  try {
    // 獲取角色ID
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "缺少角色ID" });
    }
    
    console.log(`API: 請求公共角色ID: ${id}`);

    const { method } = req;
    console.log(`API: 請求方法: ${method}`);

    if (method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }
    
    console.log("API: 獲取公共單個角色");
    
    try {
      // 獲取角色
      const character = await prisma.character.findUnique({
        where: {
          id: id
        },
        include: {
          tags: true,
          creator: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
      
      if (!character) {
        return res.status(404).json({ error: "角色不存在" });
      }
      
      // 只允許訪問公開角色
      if (!character.isPublic) {
        return res.status(403).json({ error: "此角色不是公開角色" });
      }
      
      // 處理標籤
      const processedTags = character.tags.map(tag => ({
        id: tag.id,
        name: tag.name
      }));
      
      const processedCharacter = {
        ...character,
        tags: processedTags,
        isFriend: false  // 公共API不需要好友狀態
      };
      
      console.log(`API: 找到公共角色: ${character.name}`);
      return res.status(200).json(processedCharacter);
    } catch (queryError) {
      console.error("API: 查詢公共角色時出錯:", queryError);
      return res.status(500).json({ error: "查詢公共角色失敗", details: queryError.message });
    }
  } catch (error) {
    console.error("API: 公共角色操作錯誤:", error);
    return res.status(500).json({ error: "內部伺服器錯誤", details: error.message });
  }
} 
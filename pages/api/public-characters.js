import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import prisma from "../../lib/prisma";

export default async function handler(req, res) {
  console.log("API: 公開角色請求開始處理");
  
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      console.log("API: 未授權訪問，沒有有效會話");
      return res.status(401).json({ error: "未授權" });
    }
    
    console.log(`API: 已授權用戶 ID: ${session.user.id}, 名稱: ${session.user.name}`);

    const { method } = req;
    console.log(`API: 請求方法: ${method}`);

    if (method !== "GET") {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }
    
    console.log("API: 獲取公開角色列表");
    
    try {
      // 獲取所有公開的角色，但不包括當前用戶創建的角色
      const publicCharacters = await prisma.character.findMany({
        where: {
          isPublic: true,
          creatorId: {
            not: session.user.id // 排除當前用戶創建的角色
          }
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
      const safeCharacters = publicCharacters || [];
      
      // 處理角色數據
      const processedCharacters = safeCharacters.map(character => {
        // 處理標籤
        const processedTags = character.tags.map(tag => ({
          id: tag.id,
          name: tag.name
        }));
        
        return {
          ...character,
          tags: processedTags
        };
      });
      
      console.log(`API: 找到 ${processedCharacters.length} 個公開角色`);
      
      return res.status(200).json(processedCharacters);
    } catch (queryError) {
      console.error("API: 查詢公開角色時出錯:", queryError);
      return res.status(500).json({ error: "查詢公開角色失敗", details: queryError.message });
    }
  } catch (error) {
    console.error("API: 公開角色操作錯誤:", error);
    return res.status(500).json({ error: "內部伺服器錯誤", details: error.message });
  }
} 
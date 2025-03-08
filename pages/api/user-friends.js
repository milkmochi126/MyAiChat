import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import prisma from "../../lib/prisma";

export default async function handler(req, res) {
  console.log("API: 用戶好友關係請求開始處理");
  
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
        console.log("API: 獲取用戶好友關係");
        
        try {
          // 獲取用戶的好友關係，並包含角色詳細信息
          const userFriends = await prisma.userFriend.findMany({
            where: {
              userId: session.user.id
            },
            include: {
              character: {
                include: {
                  tags: true,
                  creator: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          });
          
          console.log(`API: 找到 ${userFriends.length} 個好友關係`);
          
          // 格式化返回數據，將角色信息提取出來並添加isFriend標記
          const formattedFriends = userFriends.map(relation => {
            if (!relation.character) {
              console.warn(`API: 好友關係 ${relation.id} 沒有關聯的角色`);
              return null;
            }
            
            return {
              ...relation.character,
              isFriend: true,
              friendRelationId: relation.id,
              addedAt: relation.createdAt
            };
          }).filter(Boolean); // 過濾掉無效的好友
          
          console.log(`API: 返回 ${formattedFriends.length} 個好友角色`);
          
          return res.status(200).json(formattedFriends);
        } catch (queryError) {
          console.error("API: 查詢用戶好友關係時出錯:", queryError);
          return res.status(500).json({ error: "查詢用戶好友關係失敗", details: queryError.message });
        }
        
      case "POST":
        console.log("API: 添加好友關係");
        
        try {
          const { characterId } = req.body;
          
          if (!characterId) {
            console.error("API: 缺少角色ID");
            return res.status(400).json({ error: "缺少角色ID" });
          }
          
          console.log(`API: 嘗試添加角色 ${characterId} 為好友`);
          
          // 檢查角色是否存在
          const character = await prisma.character.findUnique({
            where: { id: characterId },
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
            console.error(`API: 角色 ${characterId} 不存在`);
            return res.status(404).json({ error: "角色不存在" });
          }
          
          console.log(`API: 找到角色: ${character.name}`);
          
          // 檢查是否已經是好友
          const existingFriend = await prisma.userFriend.findUnique({
            where: {
              userId_characterId: {
                userId: session.user.id,
                characterId: characterId
              }
            }
          });
          
          if (existingFriend) {
            console.log(`API: 角色 ${characterId} 已經是好友`);
            return res.status(200).json({
              ...character,
              isFriend: true,
              friendRelationId: existingFriend.id,
              addedAt: existingFriend.createdAt
            });
          }
          
          // 添加好友關係
          console.log(`API: 創建新的好友關係`);
          const newFriend = await prisma.userFriend.create({
            data: {
              userId: session.user.id,
              characterId: characterId
            }
          });
          
          console.log(`API: 已添加好友關係，ID: ${newFriend.id}`);
          
          // 返回完整的角色信息
          return res.status(201).json({
            ...character,
            isFriend: true,
            friendRelationId: newFriend.id,
            addedAt: newFriend.createdAt
          });
        } catch (createError) {
          console.error("API: 添加好友關係時出錯:", createError);
          return res.status(500).json({ error: "添加好友關係失敗", details: createError.message });
        }
        
      case "DELETE":
        console.log("API: 刪除好友關係");
        
        try {
          const { characterId } = req.query;
          
          if (!characterId) {
            console.error("API: 缺少角色ID");
            return res.status(400).json({ error: "缺少角色ID" });
          }
          
          console.log(`API: 嘗試刪除角色 ${characterId} 的好友關係`);
          
          // 檢查好友關係是否存在
          const existingFriend = await prisma.userFriend.findUnique({
            where: {
              userId_characterId: {
                userId: session.user.id,
                characterId: characterId
              }
            }
          });
          
          if (!existingFriend) {
            console.log(`API: 角色 ${characterId} 不是好友`);
            return res.status(404).json({ error: "好友關係不存在" });
          }
          
          // 刪除好友關係
          await prisma.userFriend.delete({
            where: {
              userId_characterId: {
                userId: session.user.id,
                characterId: characterId
              }
            }
          });
          
          console.log(`API: 已刪除好友關係，角色ID: ${characterId}`);
          
          return res.status(200).json({ message: "好友關係已刪除" });
        } catch (deleteError) {
          console.error("API: 刪除好友關係時出錯:", deleteError);
          return res.status(500).json({ error: "刪除好友關係失敗", details: deleteError.message });
        }
        
      default:
        res.setHeader("Allow", ["GET", "POST", "DELETE"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("API: 用戶好友關係操作錯誤:", error);
    return res.status(500).json({ error: "內部伺服器錯誤", details: error.message });
  }
} 
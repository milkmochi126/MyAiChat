import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  console.log("API: 單個角色請求開始處理");
  
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      console.log("API: 未授權訪問，沒有有效會話");
      return res.status(401).json({ error: "未授權" });
    }
    
    console.log(`API: 已授權用戶 ID: ${session.user.id}, 名稱: ${session.user.name}`);

    // 獲取角色ID
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "缺少角色ID" });
    }
    
    console.log(`API: 操作角色ID: ${id}`);

    const { method } = req;
    console.log(`API: 請求方法: ${method}`);

    switch (method) {
      case "GET":
        console.log("API: 獲取單個角色");
        
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
          
          // 檢查權限 - 只有創建者或公開角色可以被查看
          if (character.creatorId !== session.user.id && !character.isPublic) {
            return res.status(403).json({ error: "無權查看此角色" });
          }
          
          console.log(`API: 找到角色: ${character.name}`);
          
          // 檢查是否是好友
          const userFriend = await prisma.userFriend.findUnique({
            where: {
              userId_characterId: {
                userId: session.user.id,
                characterId: id
              }
            }
          });
          
          // 返回角色數據，包括好友狀態
          return res.status(200).json({
            ...character,
            isFriend: !!userFriend
          });
        } catch (queryError) {
          console.error("API: 查詢角色時出錯:", queryError);
          return res.status(500).json({ error: "查詢角色失敗", details: queryError.message });
        }
        
      case "DELETE":
        console.log("API: 刪除角色");
        
        try {
          // 檢查角色是否存在且屬於當前用戶
          const character = await prisma.character.findUnique({
            where: {
              id: id
            }
          });
          
          if (!character) {
            return res.status(404).json({ error: "角色不存在" });
          }
          
          if (character.creatorId !== session.user.id) {
            return res.status(403).json({ error: "無權刪除此角色" });
          }
          
          // 先更新所有相關聊天記錄，保存角色名稱
          await prisma.chat.updateMany({
            where: {
              characterId: id
            },
            data: {
              characterName: character.name,
              characterId: null // 移除角色ID關聯，但保留角色名稱
            }
          });
          
          console.log(`API: 已更新角色 ${id} 的所有聊天記錄，保存角色名稱: ${character.name}`);
          
          // 刪除角色
          await prisma.character.delete({
            where: {
              id: id
            }
          });
          
          console.log(`API: 角色刪除成功，ID: ${id}`);
          
          return res.status(200).json({ message: "角色已刪除" });
        } catch (deleteError) {
          console.error("API: 刪除角色時出錯:", deleteError);
          return res.status(500).json({ error: "刪除角色失敗", details: deleteError.message });
        }
        
      case "PATCH":
        console.log("API: 更新角色");
        
        try {
          // 檢查角色是否存在且屬於當前用戶
          const character = await prisma.character.findUnique({
            where: {
              id: id
            }
          });
          
          if (!character) {
            return res.status(404).json({ error: "角色不存在" });
          }
          
          // 只有創建者可以更新角色的公開狀態
          // 但任何用戶都可以更新角色的好友狀態
          if (req.body.isPublic !== undefined && character.creatorId !== session.user.id) {
            return res.status(403).json({ error: "無權更新此角色的公開狀態" });
          }
          
          // 構建更新數據
          const updateData = {};
          
          // 更新公開狀態
          if (req.body.isPublic !== undefined) {
            updateData.isPublic = req.body.isPublic;
          }
          
          // 更新好友狀態 - 這個不存儲在數據庫中，而是存儲在用戶的本地存儲中
          // 但我們仍然返回成功響應，以便前端可以更新本地存儲
          if (req.body.isFriend !== undefined) {
            console.log(`API: 更新角色好友狀態為 ${req.body.isFriend}`);
            
            let friendStatus = false;
            
            if (req.body.isFriend) {
              // 添加好友關係
              try {
                await prisma.userFriend.upsert({
                  where: {
                    userId_characterId: {
                      userId: session.user.id,
                      characterId: id
                    }
                  },
                  update: {},
                  create: {
                    userId: session.user.id,
                    characterId: id
                  }
                });
                console.log(`API: 已將角色 ${id} 添加為用戶 ${session.user.id} 的好友`);
                friendStatus = true;
              } catch (friendError) {
                console.error("API: 添加好友關係時出錯:", friendError);
                return res.status(500).json({ error: "添加好友關係失敗", details: friendError.message });
              }
            } else {
              // 移除好友關係
              try {
                await prisma.userFriend.deleteMany({
                  where: {
                    userId: session.user.id,
                    characterId: id
                  }
                });
                console.log(`API: 已將角色 ${id} 從用戶 ${session.user.id} 的好友中移除`);
                friendStatus = false;
              } catch (friendError) {
                console.error("API: 移除好友關係時出錯:", friendError);
                return res.status(500).json({ error: "移除好友關係失敗", details: friendError.message });
              }
            }
            
            // 如果有需要更新的數據，則更新數據庫
            if (Object.keys(updateData).length > 0) {
              const updatedCharacter = await prisma.character.update({
                where: {
                  id: id
                },
                data: updateData,
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
              
              console.log(`API: 角色更新成功，ID: ${id}`);
              return res.status(200).json({
                ...updatedCharacter,
                isFriend: friendStatus
              });
            } else {
              // 如果只是更新好友狀態，則直接返回成功
              console.log(`API: 角色好友狀態更新成功，ID: ${id}`);
              
              // 獲取完整的角色數據以返回
              const fullCharacter = await prisma.character.findUnique({
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
              
              // 檢查是否存在好友關係
              const friendRelation = await prisma.userFriend.findUnique({
                where: {
                  userId_characterId: {
                    userId: session.user.id,
                    characterId: id
                  }
                }
              });
              
              return res.status(200).json({
                ...fullCharacter,
                isFriend: !!friendRelation
              });
            }
          }
          
          // 如果有需要更新的數據，則更新數據庫
          if (Object.keys(updateData).length > 0) {
            const updatedCharacter = await prisma.character.update({
              where: {
                id: id
              },
              data: updateData
            });
            
            console.log(`API: 角色更新成功，ID: ${id}`);
            return res.status(200).json(updatedCharacter);
          } else {
            // 如果只是更新好友狀態，則直接返回成功
            console.log(`API: 角色好友狀態更新成功，ID: ${id}`);
            return res.status(200).json({ message: "角色好友狀態已更新" });
          }
        } catch (updateError) {
          console.error("API: 更新角色時出錯:", updateError);
          return res.status(500).json({ error: "更新角色失敗", details: updateError.message });
        }
        
      default:
        res.setHeader("Allow", ["GET", "DELETE", "PATCH"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("API: 角色操作錯誤:", error);
    return res.status(500).json({ error: "內部伺服器錯誤", details: error.message });
  }
} 
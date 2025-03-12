import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

// 從環境變量中獲取API密鑰
const BACKEND_API_KEY = process.env.BACKEND_API_KEY || "";

export default async function handler(req, res) {
  console.log("API: 單個角色請求開始處理");
  
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
          
          // 如果使用API密鑰，或者角色是公開的，或者由當前用戶創建，則允許訪問
          if (!isValidApiKey && character.creatorId !== (session?.user?.id) && !character.isPublic) {
            return res.status(403).json({ error: "沒有訪問權限" });
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
          
          // 打印收到的數據，特別關注年齡欄位
          console.log("API: 收到的角色更新數據:", req.body);
          console.log(`API: 年齡欄位檢查 - 原始值: ${character.age}, 新值: ${req.body.age}, 類型: ${typeof req.body.age}`);
          
          // 構建更新數據
          const updateData = {};
          
          // 更新公開狀態
          if (req.body.isPublic !== undefined) {
            updateData.isPublic = req.body.isPublic;
          }
          
          // 更新基本信息欄位
          ['name', 'description', 'job', 'gender', 'avatar', 'system'].forEach(field => {
            if (req.body[field] !== undefined) {
              updateData[field] = req.body[field];
            }
          });
          
          // 更新新增欄位
          ['quote', 'basicInfo', 'personality', 'speakingStyle', 'likes', 
           'dislikes', 'firstChatScene', 'firstChatLine', 'extraInfo'].forEach(field => {
            if (req.body[field] !== undefined) {
              // 使用空字符串代替null，與description處理方式一致
              updateData[field] = req.body[field] || "";
              
              // extraInfo特殊處理為空數組
              if (field === 'extraInfo' && !req.body[field]) {
                updateData[field] = [];
              }
            }
          });
          
          // 特殊處理年齡欄位
          if (req.body.age !== undefined) {
            console.log(`API: 準備更新年齡欄位，值為: ${req.body.age}`);
            // 確保年齡以合適的格式保存，如果是空字符串，轉換為null
            updateData.age = req.body.age === "" ? null : req.body.age;
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
              console.log(`API: 更新後的年齡欄位: ${updatedCharacter.age}, 類型: ${typeof updatedCharacter.age}`);
              
              // 檢查年齡欄位是否正確保存
              if (req.body.age !== undefined && updatedCharacter.age !== req.body.age && 
                  !(req.body.age === "" && updatedCharacter.age === null)) {
                console.warn(`API警告: 年齡欄位可能未正確保存! 請求值: ${req.body.age}, 保存後值: ${updatedCharacter.age}`);
              }
              
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
            console.log(`API: 更新後的年齡欄位: ${updatedCharacter.age}, 類型: ${typeof updatedCharacter.age}`);
            
            // 檢查年齡欄位是否正確保存
            if (req.body.age !== undefined && updatedCharacter.age !== req.body.age && 
                !(req.body.age === "" && updatedCharacter.age === null)) {
              console.warn(`API警告: 年齡欄位可能未正確保存! 請求值: ${req.body.age}, 保存後值: ${updatedCharacter.age}`);
            }
            
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
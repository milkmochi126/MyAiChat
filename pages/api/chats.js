import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import prisma from "../../lib/prisma";
import axios from "axios";

// 開發調試設置
const DEBUG_MODE = process.env.NODE_ENV === 'development';

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "未授權" });
  }

  const { method } = req;

  try {
    switch (method) {
      case "GET":
        // 獲取用戶的所有聊天
        const chats = await prisma.chat.findMany({
          where: {
            userId: session.user.id
          },
          include: {
            character: {
              select: {
                id: true,
                name: true,
                avatar: true,
                job: true
              }
            },
            messages: {
              orderBy: {
                createdAt: "desc"
              },
              take: 1
            }
          },
          orderBy: {
            updatedAt: "desc"
          }
        });

        // 格式化聊天記錄以符合前端需求
        const formattedChats = chats.map((chat) => ({
          id: chat.id,
          characterId: chat.character?.id || null,
          characterName: chat.character?.name || chat.characterName || "已刪除的角色",
          characterAvatar: chat.character?.avatar || null,
          characterJob: chat.character?.job || null,
          lastMessage: chat.messages[0]?.content || "",
          timestamp: chat.updatedAt.toISOString(),
          affinity: chat.affinity || 0,
          isDeleted: !chat.character // 標記角色是否已被刪除
        }));

        return res.status(200).json(formattedChats);

      case "POST":
        // 檢查是否是發送消息的請求
        if (req.body.message && req.body.chatId) {
          const { chatId, message, model, characterId } = req.body;

          // 檢查必要參數
          if (!chatId || !message) {
            return res.status(400).json({ error: "缺少必要參數" });
          }
          
          // 使用指定的模型或默認模型
          const modelName = model || "gemini";
          
          // 獲取API金鑰
          let apiKey = "";
          let reply, aiResponse; // 聲明變數用於存儲回應
          
          // 檢查聊天是否存在且屬於當前用戶
          const chatData = await prisma.chat.findUnique({
            where: { id: chatId },
            include: {
              character: true,
              messages: {
                orderBy: {
                  createdAt: "asc"
                }
              }
            }
          });
          
          if (!chatData) {
            return res.status(404).json({ error: "聊天不存在" });
          }
          
          // 只有聊天的擁有者可以訪問
          if (chatData.userId !== session.user.id) {
            return res.status(403).json({ error: "無權訪問此聊天" });
          }
          
          // 檢查角色是否存在
          if (!chatData.character && !characterId) {
            return res.status(404).json({ error: "角色不存在" });
          }
          
          // 獲取角色資訊，優先使用傳入的 characterId
          const character = chatData.character;
          // 要使用的角色ID，優先使用傳入的characterId參數
          const targetCharacterId = characterId || (chatData.character ? chatData.character.id : null);
          
          if (!targetCharacterId) {
            console.error("無法確定要使用的角色ID");
            return res.status(404).json({ error: "無法確定角色ID" });
          }
          
          console.log(`角色ID檢查: 聊天關聯的角色=${chatData.character?.id || '無'}, 傳入的角色ID=${characterId || '無'}, 使用=${targetCharacterId}`);
          
          // 獲取API金鑰
          try {
            // 獲取用戶 API 金鑰
            const userProfile = await prisma.userProfile.findUnique({
              where: { userId: session.user.id }
            });
            
            if (!userProfile || !userProfile.apiKeys) {
              return res.status(400).json({ 
                error: "API金鑰缺失", 
                message: `請在設定頁面設置 ${modelName.toUpperCase()} API 金鑰` 
              });
            }
            
            // 解析 API 金鑰
            let apiKeys = {};
            try {
              apiKeys = JSON.parse(userProfile.apiKeys);
            } catch (e) {
              return res.status(400).json({ error: "API金鑰格式無效" });
            }
            
            // 檢查對應模型的 API 金鑰是否存在
            apiKey = apiKeys[modelName];
            if (!apiKey) {
              return res.status(400).json({ 
                error: "API金鑰缺失", 
                message: `請在設定頁面設置 ${modelName.toUpperCase()} API 金鑰` 
              });
            }
            
            // 檢查API金鑰格式（基本格式驗證）
            let isValidKeyFormat = true;
            let keyError = "";
            
            switch(modelName) {
              case 'gpt':
                // OpenAI API 金鑰格式驗證：通常以 sk- 開頭
                if (!apiKey.startsWith('sk-')) {
                  isValidKeyFormat = false;
                  keyError = "OpenAI API 金鑰應該以 'sk-' 開頭";
                }
                break;
                
              case 'claude':
                // Claude API 金鑰格式驗證
                if (!apiKey.startsWith('sk-') && !apiKey.match(/^[a-zA-Z0-9]{1,}$/)) {
                  isValidKeyFormat = false;
                  keyError = "Claude API 金鑰格式不正確";
                }
                break;
                
              case 'gemini':
                // Google AI API 金鑰格式驗證：通常是一串字母和數字
                if (!apiKey.match(/^[a-zA-Z0-9_-]{1,}$/)) {
                  isValidKeyFormat = false;
                  keyError = "Google AI API 金鑰格式不正確";
                }
                break;
            }
            
            if (!isValidKeyFormat) {
              return res.status(400).json({
                error: "API金鑰格式無效",
                message: keyError
              });
            }
            
            // 調用後端 API
            console.log("發送請求到後端 API:", {
              api_key: '***' + apiKey.substring(apiKey.length - 4),
              character_id: targetCharacterId,
              message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
              user_id: session.user.id,
              model_type: modelName
            });
            
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chat`, {
              api_key: apiKey,
              character_id: targetCharacterId,
              message: message,
              user_id: session.user.id,
              model_type: modelName,
              reset_context: false
            }, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            console.log("後端 API 回應狀態:", response.status);
            console.log("後端 API 回應:", response.data ? 
              {
                success: !!response.data.reply,
                reply_length: response.data.reply ? response.data.reply.length : 0,
                affinity: response.data.affinity
              } : "無回應數據");
            
            // 處理回應
            if (response.data && response.data.reply) {
              reply = response.data.reply;
              
              // 更新好感度
              if (response.data.affinity !== undefined) {
                // 更新資料庫中的好感度
                await prisma.chat.update({
                  where: { id: chatId },
                  data: { affinity: response.data.affinity }
                });
              }
              
              return res.status(200).json({
                reply,
                model: modelName
              });
            } else {
              console.error("後端回應缺少 reply 欄位:", response.data);
              throw new Error("無效的API回應: 缺少回覆內容");
            }
          } catch (error) {
            console.error("呼叫後端API錯誤詳情:", error);
            
            if (error.response) {
              console.error("後端 API 回應錯誤狀態:", error.response.status);
              console.error("後端 API 回應錯誤詳情:", error.response.data);
              
              // 將後端錯誤原樣返回給前端
              return res.status(error.response.status).json({
                error: "後端 API 錯誤",
                details: error.response.data
              });
            } else if (error.request) {
              console.error("後端 API 沒有回應");
              return res.status(502).json({
                error: "後端服務無回應",
                details: "請確認後端服務是否正在運行"
              });
            } else {
              console.error("發送請求時出錯:", error.message);
              return res.status(500).json({
                error: "發送請求到後端服務時出錯",
                details: error.message
              });
            }
          }
        }
        
        // 如果不是發送消息的請求，則是創建新聊天的請求
        const { characterId } = req.body;

        // 檢查角色是否存在
        const character = await prisma.character.findUnique({
          where: { id: characterId }
        });

        if (!character) {
          return res.status(404).json({ error: "角色不存在" });
        }

        // 檢查是否已存在與該角色的聊天
        const existingChat = await prisma.chat.findFirst({
          where: {
            userId: session.user.id,
            characterId
          }
        });

        if (existingChat) {
          return res.status(200).json(existingChat);
        }

        // 創建新聊天
        const newChat = await prisma.chat.create({
          data: {
            user: {
              connect: { id: session.user.id }
            },
            character: {
              connect: { id: characterId }
            }
          }
        });

        return res.status(201).json(newChat);

      default:
        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("聊天操作錯誤:", error);
    // 提供更詳細的錯誤信息
    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
    res.status(500).json({ 
      error: "內部伺服器錯誤", 
      details: errorDetails 
    });
  }
} 
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import prisma from "../../lib/prisma";

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
          const { characterId, message, chatId, model } = req.body;
          
          // 檢查聊天是否存在且屬於當前用戶
          const chat = await prisma.chat.findUnique({
            where: { id: chatId },
            include: {
              character: true,
              messages: {
                orderBy: {
                  createdAt: "asc"
                },
                take: 10 // 只獲取最近的10條消息用於上下文
              }
            }
          });
          
          if (!chat) {
            return res.status(404).json({ error: "聊天不存在" });
          }
          
          // 只有聊天的擁有者可以訪問
          if (chat.userId !== session.user.id) {
            return res.status(403).json({ error: "無權訪問此聊天" });
          }
          
          // 檢查角色是否存在
          if (!chat.character) {
            return res.status(404).json({ error: "角色不存在" });
          }
          
          // 獲取角色資訊
          const character = chat.character;
          
          // 獲取聊天歷史
          const chatHistory = chat.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            model: msg.model
          }));
          
          // 使用 AI 模型生成回覆
          // 這裡使用簡單的回覆，實際應用中應該調用 AI API
          const modelName = model || 'gemini'; // 默認使用 Gemini
          const reply = `這是來自 ${character.name} 的回覆 (使用 ${modelName} 模型)：我收到了你的消息 "${message}"。`;
          
          // 更新好感度（示例）
          const newAffinity = Math.min(100, (chat.affinity || 0) + 1);
          
          // 更新聊天的好感度
          await prisma.chat.update({
            where: { id: chatId },
            data: { affinity: newAffinity }
          });
          
          return res.status(200).json({
            reply,
            affinity: newAffinity,
            model: modelName
          });
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
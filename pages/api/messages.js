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
      case "POST":
        // 創建新消息
        const { chatId, role, content, model } = req.body;

        // 檢查聊天是否存在且屬於當前用戶
        const chat = await prisma.chat.findUnique({
          where: { id: chatId }
        });

        if (!chat) {
          return res.status(404).json({ error: "聊天不存在" });
        }

        if (chat.userId !== session.user.id) {
          return res.status(403).json({ error: "無權在此聊天中發送消息" });
        }

        // 創建新消息
        const newMessage = await prisma.message.create({
          data: {
            chat: {
              connect: { id: chatId }
            },
            user: {
              connect: { id: session.user.id }
            },
            role,
            content,
            ...(model ? { model } : {}) // 只有當 model 有值時才添加此欄位
          }
        });

        // 更新聊天的最後更新時間
        await prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() }
        });

        return res.status(201).json(newMessage);

      default:
        res.setHeader("Allow", ["POST"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("消息操作錯誤:", error);
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
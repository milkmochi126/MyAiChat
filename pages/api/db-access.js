import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import prisma from "../../lib/prisma";

export default async function handler(req, res) {
  // 檢查用戶是否已認證
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "未授權" });
  }

  const { method } = req;

  try {
    switch (method) {
      // 獲取用戶所有聊天
      case "GET":
        const chats = await prisma.chat.findMany({
          where: {
            userId: session.user.id,
          },
          include: {
            character: {
              select: {
                id: true,
                name: true,
                avatar: true,
                job: true,
              },
            },
            messages: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        });

        // 格式化聊天記錄以符合前端需求
        const formattedChats = chats.map((chat) => ({
          id: chat.id,
          characterId: chat.character.id,
          characterName: chat.character.name,
          lastMessage: chat.messages[0]?.content || "",
          timestamp: chat.updatedAt.toISOString(),
          unread: 0, // 目前未實現未讀功能
        }));

        return res.status(200).json(formattedChats);

      // 添加支援其他數據庫操作的方法
      default:
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("資料庫操作錯誤:", error);
    res.status(500).json({ error: "內部伺服器錯誤", details: error.message });
  }
} 
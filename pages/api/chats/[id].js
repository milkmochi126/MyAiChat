import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "未授權" });
  }

  const { id } = req.query;
  const { method } = req;

  try {
    // 檢查聊天是否存在且屬於當前用戶
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        character: true,
        messages: {
          orderBy: {
            createdAt: "asc"
          }
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

    switch (method) {
      case "GET":
        // 如果角色已被刪除，但我們有保存的角色名稱，則添加到響應中
        if (!chat.character && chat.characterName) {
          chat.character = {
            id: null,
            name: chat.characterName,
            avatar: null,
            job: null,
            isDeleted: true
          };
        }
        return res.status(200).json(chat);
        
      case "DELETE":
        try {
          // 刪除聊天及其所有消息
          await prisma.chat.delete({
            where: { id }
          });
          
          return res.status(204).end();
        } catch (deleteError) {
          console.error("刪除聊天時出錯:", deleteError);
          
          // 如果是外鍵約束錯誤，嘗試直接使用SQL刪除
          if (deleteError.code === 'P2003' || deleteError.message.includes('Foreign key constraint failed')) {
            try {
              // 先刪除聊天的所有消息
              await prisma.$executeRaw`DELETE FROM "Message" WHERE "chatId" = ${id}`;
              
              // 然後刪除聊天本身
              await prisma.$executeRaw`DELETE FROM "Chat" WHERE "id" = ${id}`;
              
              console.log(`已通過直接SQL刪除聊天 ${id}`);
              return res.status(204).end();
            } catch (sqlError) {
              console.error("通過SQL刪除聊天時出錯:", sqlError);
              return res.status(500).json({ error: "刪除聊天失敗", details: sqlError.message });
            }
          }
          
          return res.status(500).json({ error: "刪除聊天失敗", details: deleteError.message });
        }
        
      default:
        res.setHeader("Allow", ["GET", "DELETE"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("聊天操作錯誤:", error);
    res.status(500).json({ error: "內部伺服器錯誤", details: error.message });
  }
} 
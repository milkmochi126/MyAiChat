import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "未授權" });
    }

    const { method } = req;

    if (method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }

    // 檢查 userId 是否存在
    if (!session.user?.id) {
      return res.status(400).json({ error: "無效的用戶 ID" });
    }

    // 安全地解構請求體
    const apiKeys = req.body?.apiKeys || null;
    const defaultModel = req.body?.defaultModel || "gemini";
    
    try {
      // 檢查用戶是否有現有的 profile
      let userProfile = await prisma.userProfile.findUnique({
        where: {
          userId: session.user.id
        }
      });
      
      // 安全處理 apiKeys，確保是可序列化的對象
      let apiKeysString = null;
      if (apiKeys) {
        try {
          // 確保 apiKeys 是有效的對象
          if (typeof apiKeys === 'object' && apiKeys !== null) {
            apiKeysString = JSON.stringify(apiKeys);
          } else if (typeof apiKeys === 'string') {
            // 如果已經是字符串，嘗試解析確認它是有效的 JSON，然後重新序列化
            const parsed = JSON.parse(apiKeys);
            apiKeysString = JSON.stringify(parsed);
          }
        } catch (e) {
          console.error("序列化 API 金鑰失敗:", e);
          return res.status(400).json({ error: "無效的 API 金鑰格式" });
        }
      }
      
      let result;
      
      if (userProfile) {
        // 更新現有資料
        const updateData = {};
        
        // 只有當 apiKeysString 有值時才更新
        if (apiKeysString !== null) {
          updateData.apiKeys = apiKeysString;
        }
        
        // 只有當 defaultModel 有值時才更新
        if (defaultModel) {
          updateData.defaultModel = defaultModel;
        }
        
        // 只有當有數據需要更新時才執行更新
        if (Object.keys(updateData).length > 0) {
          result = await prisma.userProfile.update({
            where: {
              userId: session.user.id
            },
            data: updateData
          });
        } else {
          // 沒有要更新的數據，但不視為錯誤
          result = userProfile;
        }
      } else {
        // 創建新資料
        result = await prisma.userProfile.create({
          data: {
            userId: session.user.id,
            apiKeys: apiKeysString,
            defaultModel: defaultModel
          }
        });
      }
      
      return res.status(200).json({
        message: "用戶資料更新成功",
        success: true
      });
    } catch (error) {
      console.error("更新用戶資料時出錯:", error);
      return res.status(500).json({ 
        error: "更新用戶資料失敗", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } catch (error) {
    console.error("用戶資料操作錯誤:", error);
    return res.status(500).json({ 
      error: "內部伺服器錯誤", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
} 
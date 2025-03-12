import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";

export default async function handler(req, res) {
  console.log("API: 用戶資料請求開始處理");
  
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
        console.log("API: 獲取用戶資料");
        
        try {
          // 獲取用戶資料
          const user = await prisma.user.findUnique({
            where: {
              id: session.user.id
            },
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              bio: true
            }
          });
          
          if (!user) {
            console.error(`API: 找不到用戶 ${session.user.id}`);
            return res.status(404).json({ error: "找不到用戶" });
          }
          
          // 獲取用戶配置檔案
          const userProfile = await prisma.userProfile.findUnique({
            where: {
              userId: session.user.id
            },
            select: {
              apiKeys: true,
              defaultModel: true
            }
          });
          
          // 合併數據
          let responseData = {
            ...user,
            apiKeys: { gpt: "", claude: "", gemini: "" },
            defaultModel: "gemini"
          };
          
          if (userProfile) {
            if (userProfile.apiKeys) {
              try {
                responseData.apiKeys = JSON.parse(userProfile.apiKeys);
              } catch (e) {
                console.error("API: 解析 API 金鑰失敗:", e);
              }
            }
            
            if (userProfile.defaultModel) {
              responseData.defaultModel = userProfile.defaultModel;
            }
          }
          
          console.log(`API: 找到用戶: ${user.name}`);
          
          return res.status(200).json(responseData);
        } catch (queryError) {
          console.error("API: 查詢用戶資料時出錯:", queryError);
          return res.status(500).json({ error: "查詢用戶資料失敗", details: queryError.message });
        }
        
      case "PATCH":
        console.log("API: 更新用戶資料");
        
        try {
          const { name, bio, image } = req.body;
          
          // 構建更新數據
          const updateData = {};
          
          if (name !== undefined) {
            updateData.name = name;
          }
          
          if (bio !== undefined) {
            updateData.bio = bio;
          }
          
          if (image !== undefined) {
            updateData.image = image;
          }
          
          // 如果沒有要更新的數據，返回錯誤
          if (Object.keys(updateData).length === 0) {
            console.error("API: 沒有提供要更新的數據");
            return res.status(400).json({ error: "沒有提供要更新的數據" });
          }
          
          // 更新用戶資料
          const updatedUser = await prisma.user.update({
            where: {
              id: session.user.id
            },
            data: updateData,
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              bio: true
            }
          });
          
          console.log(`API: 用戶資料更新成功，ID: ${session.user.id}`);
          
          // 更新會話中的用戶資料
          session.user.name = updatedUser.name;
          if (updatedUser.image) {
            session.user.image = updatedUser.image;
          }
          
          return res.status(200).json(updatedUser);
        } catch (updateError) {
          console.error("API: 更新用戶資料時出錯:", updateError);
          return res.status(500).json({ error: "更新用戶資料失敗", details: updateError.message });
        }
        
      default:
        res.setHeader("Allow", ["GET", "PATCH"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error("API: 用戶資料操作錯誤:", error);
    return res.status(500).json({ error: "內部伺服器錯誤", details: error.message });
  }
} 
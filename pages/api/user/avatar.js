import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import prisma from "../../../lib/prisma";
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  console.log("API: 用戶頭像上傳請求開始處理");
  
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      console.log("API: 未授權訪問，沒有有效會話");
      return res.status(401).json({ error: "未授權" });
    }
    
    console.log(`API: 已授權用戶 ID: ${session.user.id}, 名稱: ${session.user.name}`);

    const { method } = req;
    console.log(`API: 請求方法: ${method}`);

    if (method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }
    
    console.log("API: 處理頭像上傳");
    
    try {
      const { imageData } = req.body;
      
      if (!imageData) {
        console.error("API: 沒有提供圖片數據");
        return res.status(400).json({ error: "沒有提供圖片數據" });
      }
      
      // 檢查是否是有效的 Base64 數據 URL
      if (!imageData.startsWith('data:image/')) {
        console.error("API: 無效的圖片數據格式");
        return res.status(400).json({ error: "無效的圖片數據格式" });
      }
      
      // 從 Base64 數據 URL 中提取 MIME 類型和數據
      const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        console.error("API: 無效的 Base64 數據 URL 格式");
        return res.status(400).json({ error: "無效的 Base64 數據 URL 格式" });
      }
      
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // 確定文件擴展名
      let fileExtension = 'png';
      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        fileExtension = 'jpg';
      } else if (mimeType === 'image/gif') {
        fileExtension = 'gif';
      } else if (mimeType === 'image/webp') {
        fileExtension = 'webp';
      }
      
      // 生成唯一的文件名
      const fileName = `avatar_${session.user.id}_${Date.now()}.${fileExtension}`;
      const filePath = path.join(process.cwd(), 'public', 'img', 'avatars', fileName);
      const relativePath = `/img/avatars/${fileName}`;
      
      // 寫入文件
      fs.writeFileSync(filePath, buffer);
      console.log(`API: 頭像文件已保存到: ${filePath}`);
      
      // 更新用戶資料
      const updatedUser = await prisma.user.update({
        where: {
          id: session.user.id
        },
        data: {
          image: relativePath
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          bio: true
        }
      });
      
      console.log(`API: 用戶頭像更新成功，ID: ${session.user.id}`);
      
      // 更新會話中的用戶資料
      if (session.user) {
        session.user.image = relativePath;
      }
      
      return res.status(200).json({
        success: true,
        image: relativePath,
        user: updatedUser
      });
    } catch (uploadError) {
      console.error("API: 上傳頭像時出錯:", uploadError);
      return res.status(500).json({ error: "上傳頭像失敗", details: uploadError.message });
    }
  } catch (error) {
    console.error("API: 用戶頭像上傳操作錯誤:", error);
    return res.status(500).json({ error: "內部伺服器錯誤", details: error.message });
  }
} 
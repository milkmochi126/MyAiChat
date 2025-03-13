import { getSession } from 'next-auth/react';
import prisma from '../../lib/prisma';

// 更可靠的初始化觸發API - 直接處理初始化
export default async function handler(req, res) {
  try {
    // 檢查會話
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    // 只接受POST請求
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '僅允許POST請求' });
    }
    
    console.log('開始初始化數據庫，用戶:', session.user.name);
    
    // 嘗試最基本的表格創建 - 這裡我們直接運行而不是調用其他API
    const results = {
      message: '數據庫初始化完成',
      tables: {}
    };
    
    // 1. 檢查並創建 users 表
    let usersTableExists = false;
    try {
      await prisma.$executeRawUnsafe('SELECT 1 FROM "users" LIMIT 1');
      usersTableExists = true;
      console.log('users 表格已存在');
      results.tables.users = true;
    } catch (error) {
      console.log('users 表格不存在，將創建');
      
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "users" (
            "id" TEXT NOT NULL,
            "name" TEXT,
            "email" TEXT,
            "email_verified" TIMESTAMP(3),
            "image" TEXT,
            "bio" TEXT,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "users_pkey" PRIMARY KEY ("id")
          )
        `);
        
        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")
        `);
        
        console.log('users 表格創建成功');
        results.tables.users = false;
      } catch (createError) {
        console.error('創建 users 表格失敗:', createError);
        return res.status(500).json({ 
          success: false, 
          error: `創建 users 表格失敗: ${createError.message}`,
          detail: createError
        });
      }
    }
    
    // 2. 檢查並創建 characters 表 (這裡無需foreign key先測試)
    let charactersTableExists = false;
    try {
      await prisma.$executeRawUnsafe('SELECT 1 FROM "characters" LIMIT 1');
      charactersTableExists = true;
      console.log('characters 表格已存在');
      results.tables.characters = true;
    } catch (error) {
      console.log('characters 表格不存在，將創建');
      
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "characters" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "avatar" TEXT,
            "description" TEXT NOT NULL,
            "creator_id" TEXT NOT NULL,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
          )
        `);
        
        console.log('characters 表格創建成功');
        results.tables.characters = false;
      } catch (createError) {
        console.error('創建 characters 表格失敗:', createError);
        return res.status(500).json({ 
          success: false, 
          error: `創建 characters 表格失敗: ${createError.message}`,
          detail: createError
        });
      }
    }
    
    // 3. 檢查並創建 chats 表 (這裡無需foreign key先測試)
    let chatsTableExists = false;
    try {
      await prisma.$executeRawUnsafe('SELECT 1 FROM "chats" LIMIT 1');
      chatsTableExists = true;
      console.log('chats 表格已存在');
      results.tables.chats = true;
    } catch (error) {
      console.log('chats 表格不存在，將創建');
      
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "chats" (
            "id" TEXT NOT NULL,
            "user_id" TEXT NOT NULL,
            "character_id" TEXT,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
          )
        `);
        
        console.log('chats 表格創建成功');
        results.tables.chats = false;
      } catch (createError) {
        console.error('創建 chats 表格失敗:', createError);
        return res.status(500).json({ 
          success: false, 
          error: `創建 chats 表格失敗: ${createError.message}`,
          detail: createError
        });
      }
    }
    
    // 現在嘗試添加外鍵
    if (!charactersTableExists || !usersTableExists) {
      try {
        console.log('嘗試添加 characters 表格的外鍵...');
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "characters" 
          ADD CONSTRAINT IF NOT EXISTS "characters_creator_id_fkey" 
          FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        `);
        console.log('characters 表格外鍵添加成功');
      } catch (fkError) {
        console.error('添加 characters 表格外鍵失敗:', fkError);
        // 不中斷，繼續嘗試其他表格
      }
    }
    
    // 更詳細的執行結果
    console.log('初始化完成');
    return res.status(200).json({
      success: true,
      message: '基本表格初始化完成',
      tables: results.tables,
      nextSteps: '請刷新頁面並嘗試使用應用程序的功能'
    });
  } catch (error) {
    console.error('數據庫初始化觸發失敗:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : null
    });
  }
} 
import prisma from '../../lib/prisma';
import { Pool } from 'pg';

// 直接初始化數據庫API - 不依賴會話認證
export default async function handler(req, res) {
  try {
    // 只接受POST請求
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '僅允許POST請求' });
    }
    
    console.log('開始直接數據庫初始化...');
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      return res.status(500).json({ error: '數據庫連接字符串未設置' });
    }
    
    // 初始化結果
    const results = {
      success: true,
      message: '數據庫初始化完成',
      tables: {},
      timestamp: new Date().toISOString()
    };
    
    // 使用 pg 庫直接連接數據庫，繞過Prisma
    const pool = new Pool({ connectionString });
    console.log('已建立直接數據庫連接');
    
    // 創建必要的表格
    try {
      // 1. 首先創建 users 表格
      console.log('檢查並創建 users 表格...');
      let usersExists = false;
      try {
        const userCheck = await pool.query('SELECT 1 FROM users LIMIT 1');
        usersExists = true;
        console.log('users 表格已存在');
      } catch (error) {
        console.log('users 表格不存在，將創建');
      }
      
      if (!usersExists) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "users" (
            "id" TEXT NOT NULL,
            "name" TEXT,
            "email" TEXT,
            "email_verified" TIMESTAMP,
            "image" TEXT,
            "bio" TEXT,
            "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP NOT NULL,
            CONSTRAINT "users_pkey" PRIMARY KEY ("id")
          )
        `);
        
        await pool.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")
        `);
        
        console.log('users 表格創建成功');
        results.tables.users = '已創建';
      } else {
        results.tables.users = '已存在';
      }
      
      // 2. 創建 accounts 表格
      console.log('檢查並創建 accounts 表格...');
      let accountsExists = false;
      try {
        const accountsCheck = await pool.query('SELECT 1 FROM accounts LIMIT 1');
        accountsExists = true;
        console.log('accounts 表格已存在');
      } catch (error) {
        console.log('accounts 表格不存在，將創建');
      }
      
      if (!accountsExists) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "accounts" (
            "id" TEXT NOT NULL,
            "user_id" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "provider" TEXT NOT NULL,
            "provider_account_id" TEXT NOT NULL,
            "refresh_token" TEXT,
            "access_token" TEXT,
            "expires_at" INTEGER,
            "token_type" TEXT,
            "scope" TEXT,
            "id_token" TEXT,
            "session_state" TEXT,
            CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
          )
        `);
        
        await pool.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" 
          ON "accounts"("provider", "provider_account_id")
        `);
        
        if (usersExists) {
          try {
            await pool.query(`
              ALTER TABLE "accounts" 
              ADD CONSTRAINT IF NOT EXISTS "accounts_user_id_fkey" 
              FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `);
          } catch (fkError) {
            console.error('添加 accounts 外鍵失敗:', fkError.message);
          }
        }
        
        console.log('accounts 表格創建成功');
        results.tables.accounts = '已創建';
      } else {
        results.tables.accounts = '已存在';
      }
      
      // 3. 創建 sessions 表格
      console.log('檢查並創建 sessions 表格...');
      let sessionsExists = false;
      try {
        const sessionsCheck = await pool.query('SELECT 1 FROM sessions LIMIT 1');
        sessionsExists = true;
        console.log('sessions 表格已存在');
      } catch (error) {
        console.log('sessions 表格不存在，將創建');
      }
      
      if (!sessionsExists) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "sessions" (
            "id" TEXT NOT NULL,
            "session_token" TEXT NOT NULL,
            "user_id" TEXT NOT NULL,
            "expires" TIMESTAMP NOT NULL,
            CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
          )
        `);
        
        await pool.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" 
          ON "sessions"("session_token")
        `);
        
        if (usersExists) {
          try {
            await pool.query(`
              ALTER TABLE "sessions" 
              ADD CONSTRAINT IF NOT EXISTS "sessions_user_id_fkey" 
              FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `);
          } catch (fkError) {
            console.error('添加 sessions 外鍵失敗:', fkError.message);
          }
        }
        
        console.log('sessions 表格創建成功');
        results.tables.sessions = '已創建';
      } else {
        results.tables.sessions = '已存在';
      }
      
      // 4. 創建 characters 表格
      console.log('檢查並創建 characters 表格...');
      let charactersExists = false;
      try {
        const charactersCheck = await pool.query('SELECT 1 FROM characters LIMIT 1');
        charactersExists = true;
        console.log('characters 表格已存在');
      } catch (error) {
        console.log('characters 表格不存在，將創建');
      }
      
      if (!charactersExists) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "characters" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "job" TEXT,
            "avatar" TEXT,
            "description" TEXT NOT NULL,
            "creator_id" TEXT NOT NULL,
            "gender" TEXT NOT NULL DEFAULT '未指定',
            "is_public" BOOLEAN NOT NULL DEFAULT false,
            "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP NOT NULL,
            "extra_info" JSONB,
            "system" TEXT,
            "age" TEXT,
            "basic_info" TEXT,
            "dislikes" TEXT,
            "first_chat_line" TEXT,
            "first_chat_scene" TEXT,
            "likes" TEXT,
            "personality" TEXT,
            "quote" TEXT,
            "speaking_style" TEXT,
            CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
          )
        `);
        
        if (usersExists) {
          try {
            await pool.query(`
              ALTER TABLE "characters" 
              ADD CONSTRAINT IF NOT EXISTS "characters_creator_id_fkey" 
              FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
            `);
          } catch (fkError) {
            console.error('添加 characters 外鍵失敗:', fkError.message);
          }
        }
        
        console.log('characters 表格創建成功');
        results.tables.characters = '已創建';
      } else {
        results.tables.characters = '已存在';
      }
      
      // 5. 創建 chats 表格
      console.log('檢查並創建 chats 表格...');
      let chatsExists = false;
      try {
        const chatsCheck = await pool.query('SELECT 1 FROM chats LIMIT 1');
        chatsExists = true;
        console.log('chats 表格已存在');
      } catch (error) {
        console.log('chats 表格不存在，將創建');
      }
      
      if (!chatsExists) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "chats" (
            "id" TEXT NOT NULL,
            "user_id" TEXT NOT NULL,
            "character_id" TEXT,
            "affinity" INTEGER NOT NULL DEFAULT 0,
            "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP NOT NULL,
            "character_name" TEXT,
            CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
          )
        `);
        
        if (usersExists && charactersExists) {
          try {
            await pool.query(`
              ALTER TABLE "chats" 
              ADD CONSTRAINT IF NOT EXISTS "chats_user_id_fkey" 
              FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `);
            
            await pool.query(`
              ALTER TABLE "chats" 
              ADD CONSTRAINT IF NOT EXISTS "chats_character_id_fkey" 
              FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE
            `);
          } catch (fkError) {
            console.error('添加 chats 外鍵失敗:', fkError.message);
          }
        }
        
        console.log('chats 表格創建成功');
        results.tables.chats = '已創建';
      } else {
        results.tables.chats = '已存在';
      }
      
      // 6. 創建 messages 表格
      console.log('檢查並創建 messages 表格...');
      let messagesExists = false;
      try {
        const messagesCheck = await pool.query('SELECT 1 FROM messages LIMIT 1');
        messagesExists = true;
        console.log('messages 表格已存在');
      } catch (error) {
        console.log('messages 表格不存在，將創建');
      }
      
      if (!messagesExists) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "messages" (
            "id" TEXT NOT NULL,
            "chat_id" TEXT NOT NULL,
            "user_id" TEXT NOT NULL,
            "role" TEXT NOT NULL,
            "content" TEXT NOT NULL,
            "model" TEXT,
            "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
          )
        `);
        
        if (chatsExists && usersExists) {
          try {
            await pool.query(`
              ALTER TABLE "messages" 
              ADD CONSTRAINT IF NOT EXISTS "messages_chat_id_fkey" 
              FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `);
            
            await pool.query(`
              ALTER TABLE "messages" 
              ADD CONSTRAINT IF NOT EXISTS "messages_user_id_fkey" 
              FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `);
          } catch (fkError) {
            console.error('添加 messages 外鍵失敗:', fkError.message);
          }
        }
        
        console.log('messages 表格創建成功');
        results.tables.messages = '已創建';
      } else {
        results.tables.messages = '已存在';
      }
      
      // 7. 創建 user_friends 表格
      console.log('檢查並創建 user_friends 表格...');
      let userFriendsExists = false;
      try {
        const userFriendsCheck = await pool.query('SELECT 1 FROM user_friends LIMIT 1');
        userFriendsExists = true;
        console.log('user_friends 表格已存在');
      } catch (error) {
        console.log('user_friends 表格不存在，將創建');
      }
      
      if (!userFriendsExists) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS "user_friends" (
            "id" TEXT NOT NULL,
            "user_id" TEXT NOT NULL,
            "character_id" TEXT NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "user_friends_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "user_friends_user_id_character_id_key" UNIQUE ("user_id", "character_id")
          )
        `);
        
        if (usersExists && charactersExists) {
          try {
            await pool.query(`
              ALTER TABLE "user_friends" 
              ADD CONSTRAINT IF NOT EXISTS "user_friends_user_id_fkey" 
              FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `);
            
            await pool.query(`
              ALTER TABLE "user_friends" 
              ADD CONSTRAINT IF NOT EXISTS "user_friends_character_id_fkey" 
              FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `);
          } catch (fkError) {
            console.error('添加 user_friends 外鍵失敗:', fkError.message);
          }
        }
        
        console.log('user_friends 表格創建成功');
        results.tables.user_friends = '已創建';
      } else {
        results.tables.user_friends = '已存在';
      }
      
    } catch (error) {
      console.error('創建表格時發生錯誤:', error);
      await pool.end();
      return res.status(500).json({
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : null
      });
    } finally {
      // 關閉連接池
      await pool.end();
    }
    
    return res.status(200).json(results);
  } catch (error) {
    console.error('初始化過程中發生錯誤:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : null
    });
  }
} 
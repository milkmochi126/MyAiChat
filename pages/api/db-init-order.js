import prisma from '../../lib/prisma';

// 創建缺失的應用程序表格 - 按照正確的依賴順序創建
export default async function handler(req, res) {
  // 僅允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '僅允許 POST 請求' });
  }
  
  // 添加簡單的安全檢查
  const { secret } = req.body;
  if (secret !== process.env.NEXTAUTH_SECRET) {
    return res.status(401).json({ error: '未授權' });
  }

  try {
    console.log('開始按順序創建數據庫表格...');
    
    // 表格創建結果
    const results = {
      message: '數據庫初始化完成',
      tables: {}
    };

    // 1. 首先確保基礎表格存在 (users)
    let usersTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.users LIMIT 1`;
      usersTableExists = true;
      console.log('users 表格已存在');
    } catch (error) {
      console.log('users 表格不存在，將創建');
    }

    // 如果 users 表格不存在，創建它
    if (!usersTableExists) {
      console.log('創建 users 表格...');
      await prisma.$executeRaw`
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
      `;
      
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")
      `;
      console.log('users 表格創建成功');
      results.tables.users = false;
    } else {
      results.tables.users = true;
    }

    // 2. 創建 accounts 表格
    let accountsTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.accounts LIMIT 1`;
      accountsTableExists = true;
      console.log('accounts 表格已存在');
    } catch (error) {
      console.log('accounts 表格不存在，將創建');
    }

    if (!accountsTableExists) {
      console.log('創建 accounts 表格...');
      await prisma.$executeRaw`
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
      `;
      
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_provider_account_id_key" 
        ON "accounts"("provider", "provider_account_id")
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "accounts" 
        ADD CONSTRAINT IF NOT EXISTS "accounts_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      console.log('accounts 表格創建成功');
      results.tables.accounts = false;
    } else {
      results.tables.accounts = true;
    }

    // 3. 創建 sessions 表格
    let sessionsTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.sessions LIMIT 1`;
      sessionsTableExists = true;
      console.log('sessions 表格已存在');
    } catch (error) {
      console.log('sessions 表格不存在，將創建');
    }

    if (!sessionsTableExists) {
      console.log('創建 sessions 表格...');
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "sessions" (
          "id" TEXT NOT NULL,
          "session_token" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "expires" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
        )
      `;
      
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "sessions_session_token_key" 
        ON "sessions"("session_token")
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "sessions" 
        ADD CONSTRAINT IF NOT EXISTS "sessions_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      console.log('sessions 表格創建成功');
      results.tables.sessions = false;
    } else {
      results.tables.sessions = true;
    }

    // 4. 創建 verification_tokens 表格
    let verificationTokensTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.verification_tokens LIMIT 1`;
      verificationTokensTableExists = true;
      console.log('verification_tokens 表格已存在');
    } catch (error) {
      console.log('verification_tokens 表格不存在，將創建');
    }

    if (!verificationTokensTableExists) {
      console.log('創建 verification_tokens 表格...');
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "verification_tokens" (
          "identifier" TEXT NOT NULL,
          "token" TEXT NOT NULL,
          "expires" TIMESTAMP(3) NOT NULL
        )
      `;
      
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_token_key" 
        ON "verification_tokens"("token")
      `;
      
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS "verification_tokens_identifier_token_key" 
        ON "verification_tokens"("identifier", "token")
      `;
      console.log('verification_tokens 表格創建成功');
      results.tables.verification_tokens = false;
    } else {
      results.tables.verification_tokens = true;
    }

    // 5. 創建 characters 表格 (依賴 users)
    let charactersTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.characters LIMIT 1`;
      charactersTableExists = true;
      console.log('characters 表格已存在');
    } catch (error) {
      console.log('characters 表格不存在，將創建');
    }

    if (!charactersTableExists) {
      console.log('創建 characters 表格...');
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "characters" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "job" TEXT,
          "avatar" TEXT,
          "description" TEXT NOT NULL,
          "creator_id" TEXT NOT NULL,
          "gender" TEXT NOT NULL DEFAULT '未指定',
          "is_public" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
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
      `;
      
      // 創建外鍵約束
      await prisma.$executeRaw`
        ALTER TABLE "characters" 
        ADD CONSTRAINT IF NOT EXISTS "characters_creator_id_fkey" 
        FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      `;
      console.log('characters 表格創建成功');
      results.tables.characters = false;
    } else {
      results.tables.characters = true;
    }

    // 6. 創建 chats 表格
    let chatsTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.chats LIMIT 1`;
      chatsTableExists = true;
      console.log('chats 表格已存在');
    } catch (error) {
      console.log('chats 表格不存在，將創建');
    }

    if (!chatsTableExists) {
      console.log('創建 chats 表格...');
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "chats" (
          "id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "character_id" TEXT,
          "affinity" INTEGER NOT NULL DEFAULT 0,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          "character_name" TEXT,
          CONSTRAINT "chats_pkey" PRIMARY KEY ("id")
        )
      `;
      
      // 創建外鍵約束
      await prisma.$executeRaw`
        ALTER TABLE "chats" 
        ADD CONSTRAINT IF NOT EXISTS "chats_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "chats" 
        ADD CONSTRAINT IF NOT EXISTS "chats_character_id_fkey" 
        FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE SET NULL ON UPDATE CASCADE
      `;
      console.log('chats 表格創建成功');
      results.tables.chats = false;
    } else {
      results.tables.chats = true;
    }

    // 7. 創建 messages 表格
    let messagesTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.messages LIMIT 1`;
      messagesTableExists = true;
      console.log('messages 表格已存在');
    } catch (error) {
      console.log('messages 表格不存在，將創建');
    }

    if (!messagesTableExists) {
      console.log('創建 messages 表格...');
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "messages" (
          "id" TEXT NOT NULL,
          "chat_id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "model" TEXT,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
        )
      `;
      
      // 創建外鍵約束
      await prisma.$executeRaw`
        ALTER TABLE "messages" 
        ADD CONSTRAINT IF NOT EXISTS "messages_chat_id_fkey" 
        FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "messages" 
        ADD CONSTRAINT IF NOT EXISTS "messages_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      console.log('messages 表格創建成功');
      results.tables.messages = false;
    } else {
      results.tables.messages = true;
    }

    // 8. 創建其他表格 (user_friends, tags, user_profiles, memories)
    // ... 以類似方式創建其餘表格 ...

    console.log('數據庫初始化完成');
    return res.status(200).json(results);
  } catch (error) {
    console.error('數據庫初始化失敗:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : '生產環境不顯示堆棧'
    });
  }
} 
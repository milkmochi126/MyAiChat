import prisma from '../../lib/prisma';

// 創建缺失的應用程序表格
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
    console.log('開始數據庫初始化檢查...');
    
    // 檢查 chats 表格是否存在
    let chatTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.chats LIMIT 1`;
      chatTableExists = true;
      console.log('chats 表格已存在');
    } catch (error) {
      console.log('chats 表格不存在，將創建');
    }

    // 如果 chats 表格不存在，創建它
    if (!chatTableExists) {
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
      console.log('成功創建 chats 表格');
    }

    // 檢查 characters 表格是否存在
    let charactersTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.characters LIMIT 1`;
      charactersTableExists = true;
      console.log('characters 表格已存在');
    } catch (error) {
      console.log('characters 表格不存在，將創建');
    }

    // 如果 characters 表格不存在，創建它
    if (!charactersTableExists) {
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
      console.log('成功創建 characters 表格');
    }

    // 檢查 user_friends 表格是否存在
    let userFriendsTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.user_friends LIMIT 1`;
      userFriendsTableExists = true;
      console.log('user_friends 表格已存在');
    } catch (error) {
      console.log('user_friends 表格不存在，將創建');
    }

    // 如果 user_friends 表格不存在，創建它
    if (!userFriendsTableExists) {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "user_friends" (
          "id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "character_id" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "user_friends_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "user_friends_user_id_character_id_key" UNIQUE ("user_id", "character_id")
        )
      `;
      console.log('成功創建 user_friends 表格');
    }

    // 檢查 messages 表格是否存在
    let messagesTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.messages LIMIT 1`;
      messagesTableExists = true;
      console.log('messages 表格已存在');
    } catch (error) {
      console.log('messages 表格不存在，將創建');
    }

    // 如果 messages 表格不存在，創建它
    if (!messagesTableExists) {
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
      console.log('成功創建 messages 表格');
    }

    // 檢查 memories 表格是否存在
    let memoriesTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.memories LIMIT 1`;
      memoriesTableExists = true;
      console.log('memories 表格已存在');
    } catch (error) {
      console.log('memories 表格不存在，將創建');
    }

    // 如果 memories 表格不存在，創建它
    if (!memoriesTableExists) {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "memories" (
          "id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "character_id" TEXT NOT NULL,
          "memory_type" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
        )
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "memories_userId_characterId_memoryType_idx" 
        ON "memories" ("user_id", "character_id", "memory_type")
      `;
      console.log('成功創建 memories 表格');
    }

    // 檢查 tags 表格是否存在
    let tagsTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.tags LIMIT 1`;
      tagsTableExists = true;
      console.log('tags 表格已存在');
    } catch (error) {
      console.log('tags 表格不存在，將創建');
    }

    // 如果 tags 表格不存在，創建它
    if (!tagsTableExists) {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "tags" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          CONSTRAINT "tags_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "tags_name_key" UNIQUE ("name")
        )
      `;
      console.log('成功創建 tags 表格');
    }

    // 檢查 user_profiles 表格是否存在
    let userProfilesTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM public.user_profiles LIMIT 1`;
      userProfilesTableExists = true;
      console.log('user_profiles 表格已存在');
    } catch (error) {
      console.log('user_profiles 表格不存在，將創建');
    }

    // 如果 user_profiles 表格不存在，創建它
    if (!userProfilesTableExists) {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "user_profiles" (
          "id" TEXT NOT NULL,
          "user_id" TEXT NOT NULL,
          "api_keys" TEXT,
          "default_model" TEXT DEFAULT 'gemini',
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id"),
          CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `;
      console.log('成功創建 user_profiles 表格');
    }

    // 添加/確認外鍵約束
    try {
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
      
      await prisma.$executeRaw`
        ALTER TABLE "user_friends" 
        ADD CONSTRAINT IF NOT EXISTS "user_friends_character_id_fkey" 
        FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "user_friends" 
        ADD CONSTRAINT IF NOT EXISTS "user_friends_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "memories" 
        ADD CONSTRAINT IF NOT EXISTS "memories_character_id_fkey" 
        FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      
      await prisma.$executeRaw`
        ALTER TABLE "memories" 
        ADD CONSTRAINT IF NOT EXISTS "memories_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `;
      
      console.log('成功設置所有外鍵約束');
    } catch (error) {
      console.error('設置外鍵約束時出錯:', error);
    }

    return res.status(200).json({ 
      success: true, 
      message: '數據庫表格初始化完成',
      tables: {
        chats: chatTableExists,
        characters: charactersTableExists,
        userFriends: userFriendsTableExists,
        messages: messagesTableExists,
        memories: memoriesTableExists,
        tags: tagsTableExists,
        userProfiles: userProfilesTableExists
      }
    });
  } catch (error) {
    console.error('數據庫初始化失敗:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
} 
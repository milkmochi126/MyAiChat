const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('開始查詢資料庫...');
  try {
    const users = await prisma.user.count();
    console.log('使用者數:', users);

    const characters = await prisma.character.count();
    console.log('角色數:', characters);

    const chats = await prisma.chat.count();
    console.log('聊天數:', chats);

    const messages = await prisma.message.count();
    console.log('訊息數:', messages);

    const tags = await prisma.tag.count();
    console.log('標籤數:', tags);

    if (users > 0) {
      const firstUser = await prisma.user.findFirst();
      console.log('範例使用者:', { 
        id: firstUser.id, 
        email: firstUser.email,
        name: firstUser.name
      });
    }

    if (characters > 0) {
      const firstCharacter = await prisma.character.findFirst();
      console.log('範例角色:', { 
        id: firstCharacter.id, 
        name: firstCharacter.name,
        description: firstCharacter.description
      });
    }
  } catch (error) {
    console.error('查詢錯誤:', error);
  } finally {
    await prisma.$disconnect();
    console.log('已斷開與資料庫的連接');
  }
}

main(); 
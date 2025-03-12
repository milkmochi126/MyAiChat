const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('開始詳細查詢資料庫...');
  try {
    // 查詢使用者
    const users = await prisma.user.findMany();
    console.log('===== 使用者資料 =====');
    console.log(`總數: ${users.length}`);
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`- ID: ${user.id}`);
        console.log(`  名稱: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  創建時間: ${user.createdAt}`);
        console.log('  ---');
      });
    }

    // 查詢角色
    const characters = await prisma.character.findMany({
      include: { tags: true }
    });
    console.log('\n===== 角色資料 =====');
    console.log(`總數: ${characters.length}`);
    if (characters.length > 0) {
      characters.forEach(character => {
        console.log(`- ID: ${character.id}`);
        console.log(`  名稱: ${character.name}`);
        console.log(`  性別: ${character.gender}`);
        console.log(`  描述: ${character.description}`);
        console.log(`  創建者ID: ${character.creatorId}`);
        console.log(`  公開狀態: ${character.isPublic ? '公開' : '私人'}`);
        if (character.tags.length > 0) {
          console.log(`  標籤: ${character.tags.map(tag => tag.name).join(', ')}`);
        }
        console.log('  ---');
      });
    }

    // 查詢標籤
    const tags = await prisma.tag.findMany();
    console.log('\n===== 標籤資料 =====');
    console.log(`總數: ${tags.length}`);
    if (tags.length > 0) {
      tags.forEach(tag => {
        console.log(`- ID: ${tag.id}`);
        console.log(`  名稱: ${tag.name}`);
        console.log('  ---');
      });
    }

    // 查詢聊天
    const chats = await prisma.chat.findMany();
    console.log('\n===== 聊天資料 =====');
    console.log(`總數: ${chats.length}`);

    // 查詢訊息
    const messages = await prisma.message.findMany();
    console.log('\n===== 訊息資料 =====');
    console.log(`總數: ${messages.length}`);

  } catch (error) {
    console.error('查詢錯誤:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n已斷開與資料庫的連接');
  }
}

main(); 
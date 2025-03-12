// 資料庫內容查詢腳本
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 查詢用戶數量
    const userCount = await prisma.user.count();
    console.log(`用戶總數: ${userCount}`);
    
    // 查詢角色數量和基本信息
    const characters = await prisma.character.findMany({
      select: {
        id: true,
        name: true,
        job: true,
        age: true,
        gender: true,
        description: true,
        isPublic: true,
        createdAt: true,
        tags: {
          select: {
            name: true
          }
        }
      }
    });
    console.log(`角色總數: ${characters.length}`);
    console.log('角色列表:');
    characters.forEach((char, index) => {
      console.log(`\n角色 #${index + 1}:`);
      console.log(`  ID: ${char.id}`);
      console.log(`  名稱: ${char.name}`);
      console.log(`  職業: ${char.job || '未設置'}`);
      console.log(`  年齡: ${char.age || '未設置'}`);
      console.log(`  性別: ${char.gender}`);
      console.log(`  描述: ${char.description.slice(0, 50)}${char.description.length > 50 ? '...' : ''}`);
      console.log(`  公開狀態: ${char.isPublic ? '公開' : '私有'}`);
      console.log(`  創建時間: ${char.createdAt.toLocaleString()}`);
      console.log(`  標籤: ${char.tags.map(t => t.name).join(', ') || '無標籤'}`);
    });
    
    // 查詢標籤
    const tags = await prisma.tag.findMany();
    console.log(`\n標籤總數: ${tags.length}`);
    console.log('標籤列表:', tags.map(t => t.name).join(', '));
    
    // 查詢聊天記錄數量
    const chatCount = await prisma.chat.count();
    console.log(`\n聊天會話總數: ${chatCount}`);
    
    // 查詢消息數量
    const messageCount = await prisma.message.count();
    console.log(`消息總數: ${messageCount}`);
    
    // 查看用戶配置檔案
    const profileCount = await prisma.userProfile.count();
    console.log(`\n用戶配置檔案總數: ${profileCount}`);
    
  } catch (error) {
    console.error('查詢資料庫時出錯:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
// 檢查標籤數據的腳本
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 查詢所有標籤
    const tags = await prisma.tag.findMany();
    console.log(`資料庫中共有 ${tags.length} 個標籤`);
    
    if (tags.length > 0) {
      console.log('\n標籤列表:');
      tags.forEach((tag, index) => {
        console.log(`${index + 1}. ${tag.name} (ID: ${tag.id})`);
      });
      
      // 查詢每個標籤關聯的角色數
      console.log('\n標籤使用情況:');
      for (const tag of tags) {
        const characterCount = await prisma.character.count({
          where: {
            tags: {
              some: {
                id: tag.id
              }
            }
          }
        });
        console.log(`標籤 "${tag.name}" 被 ${characterCount} 個角色使用`);
      }
    } else {
      console.log('資料庫中還沒有標籤');
    }
    
    // 查詢角色的標籤關係
    const characters = await prisma.character.findMany({
      select: {
        id: true,
        name: true,
        tags: true
      }
    });
    
    console.log('\n角色標籤關係:');
    characters.forEach(char => {
      console.log(`角色 "${char.name}" (ID: ${char.id}) 的標籤: ${char.tags.map(t => t.name).join(', ') || '無標籤'}`);
    });
    
  } catch (error) {
    console.error('查詢標籤數據時出錯:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
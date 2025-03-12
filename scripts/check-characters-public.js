const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('檢查角色的公開狀態...');
  try {
    // 查詢所有角色
    const characters = await prisma.character.findMany({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    console.log(`總共有 ${characters.length} 個角色`);
    
    // 檢查每個角色的公開狀態
    characters.forEach(character => {
      console.log('------------------------------');
      console.log(`角色 ID: ${character.id}`);
      console.log(`角色名稱: ${character.name}`);
      console.log(`公開狀態: ${character.isPublic ? '公開' : '私人'}`);
      console.log(`創建者: ${character.creator.name} (${character.creator.email})`);
      console.log(`創建者 ID: ${character.creatorId}`);
    });
    
    // 檢查公開角色
    const publicCharacters = await prisma.character.findMany({
      where: {
        isPublic: true
      }
    });
    
    console.log('------------------------------');
    console.log(`公開角色總數: ${publicCharacters.length}`);
    
  } catch (error) {
    console.error('查詢錯誤:', error);
  } finally {
    await prisma.$disconnect();
    console.log('已斷開與資料庫的連接');
  }
}

main(); 
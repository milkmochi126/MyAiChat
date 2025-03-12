const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 獲取所有角色資料
    const characters = await prisma.character.findMany({
      include: {
        tags: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`資料庫中共有 ${characters.length} 個角色\n`);

    if (characters.length === 0) {
      console.log("資料庫中尚未建立任何角色");
    } else {
      // 顯示所有角色資料
      characters.forEach((char, index) => {
        console.log(`==== 角色 #${index + 1} 詳細信息 ====`);
        console.log(JSON.stringify(char, null, 2));
        console.log("\n欄位檢查:");
        console.log(`ID: ${char.id}`);
        console.log(`名稱: ${char.name}`);
        console.log(`職業: ${char.job || '未設置'}`);
        console.log(`年齡: ${char.age || '未設置'}`);
        console.log(`性別: ${char.gender || '未設置'}`);
        console.log(`描述: ${char.description}`);
        console.log(`格言: ${char.quote || '未設置'}`);
        console.log(`基本資料: ${char.basicInfo || '未設置'}`);
        console.log(`性格特點: ${char.personality || '未設置'}`);
        console.log(`說話方式: ${char.speakingStyle || '未設置'}`);
        console.log(`喜好: ${char.likes || '未設置'}`);
        console.log(`厭惡: ${char.dislikes || '未設置'}`);
        console.log(`首次對話場景: ${char.firstChatScene || '未設置'}`);
        console.log(`首次對話台詞: ${char.firstChatLine || '未設置'}`);
        console.log(`額外資訊: ${JSON.stringify(char.extraInfo) || '未設置'}`);
        console.log(`標籤: ${char.tags.map(tag => tag.name).join(', ') || '無標籤'}`);
        console.log(`創建者: ${char.creator ? char.creator.name : '未知'}`);
        console.log(`創建時間: ${new Date(char.createdAt).toLocaleString()}`);
        console.log(`最後更新: ${new Date(char.updatedAt).toLocaleString()}`);
        console.log("\n");
      });
    }

    // 檢查資料庫結構
    console.log("資料庫結構檢查:");
    const tableInfo = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'characters'
      ORDER BY ordinal_position;
    `;
    
    console.log("Character 表格結構:");
    tableInfo.forEach(column => {
      console.log(`- ${column.column_name} (${column.data_type})`);
    });

  } catch (error) {
    console.error("查詢資料庫時出錯:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
// 詳細資料庫內容查詢腳本
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 查詢角色的完整信息
    const characters = await prisma.character.findMany({
      include: {
        tags: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        chats: {
          select: {
            id: true,
            createdAt: true,
            _count: {
              select: {
                messages: true
              }
            }
          }
        }
      }
    });
    
    console.log(`資料庫中共有 ${characters.length} 個角色`);
    
    characters.forEach((char, index) => {
      console.log(`\n==== 角色 #${index + 1} 詳細信息 ====`);
      console.log(JSON.stringify(char, (key, value) => {
        // 處理日期格式
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }, 2));
      
      console.log('\n摘要信息:');
      console.log(`ID: ${char.id}`);
      console.log(`名稱: ${char.name}`);
      console.log(`職業: ${char.job || '未設置'}`);
      console.log(`年齡: ${char.age || '未設置'}`);
      console.log(`性別: ${char.gender}`);
      console.log(`描述: ${char.description}`);
      console.log(`創建者: ${char.creator.name} (${char.creator.email})`);
      console.log(`創建時間: ${new Date(char.createdAt).toLocaleString()}`);
      console.log(`標籤: ${char.tags.map(t => t.name).join(', ') || '無標籤'}`);
      
      // 顯示extraInfo內容
      if (char.extraInfo) {
        console.log('\nextraInfo內容:');
        console.log(JSON.stringify(char.extraInfo, null, 2));
      } else {
        console.log('\nextraInfo: 未設置');
      }
      
      console.log(`\n相關聊天會話: ${char.chats.length} 個`);
      char.chats.forEach((chat, chatIndex) => {
        console.log(`  ${chatIndex + 1}. 聊天ID: ${chat.id}, 消息數: ${chat._count.messages}, 創建時間: ${new Date(chat.createdAt).toLocaleString()}`);
      });
    });
    
    // 查詢用戶詳細信息
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: {
            characters: true,
            chats: true,
            messages: true
          }
        },
        profile: true
      }
    });
    
    console.log(`\n\n資料庫中共有 ${users.length} 個用戶`);
    users.forEach((user, index) => {
      console.log(`\n==== 用戶 #${index + 1} 詳細信息 ====`);
      console.log(`ID: ${user.id}`);
      console.log(`名稱: ${user.name || '未設置'}`);
      console.log(`電子郵件: ${user.email || '未設置'}`);
      console.log(`創建時間: ${new Date(user.createdAt).toLocaleString()}`);
      console.log(`創建的角色數: ${user._count.characters}`);
      console.log(`聊天會話數: ${user._count.chats}`);
      console.log(`消息數: ${user._count.messages}`);
      
      if (user.profile) {
        console.log('\n用戶配置檔案:');
        console.log(JSON.stringify(user.profile, null, 2));
      } else {
        console.log('\n用戶配置檔案: 未設置');
      }
    });
    
  } catch (error) {
    console.error('查詢資料庫時出錯:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
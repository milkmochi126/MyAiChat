// 資料庫重置腳本
// 注意：此腳本將刪除所有資料，請確保您了解其後果

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('開始重置資料庫...');
    
    // 記錄當前資料庫中的記錄數
    const userCount = await prisma.user.count();
    const characterCount = await prisma.character.count();
    const tagCount = await prisma.tag.count();
    const chatCount = await prisma.chat.count();
    const messageCount = await prisma.message.count();
    
    console.log('當前資料庫狀態:');
    console.log(`- 用戶數: ${userCount}`);
    console.log(`- 角色數: ${characterCount}`);
    console.log(`- 標籤數: ${tagCount}`);
    console.log(`- 聊天數: ${chatCount}`);
    console.log(`- 訊息數: ${messageCount}`);
    
    // 確認重置操作
    console.log('\n警告：此操作將刪除所有資料，且無法恢復！');
    console.log('準備重置資料庫...\n');
    
    // 安全機制已移除，將直接執行重置操作
    
    // 依序刪除資料，遵循外鍵約束
    console.log('開始刪除數據...');
    
    // 刪除消息
    await prisma.message.deleteMany();
    console.log('已刪除所有消息');
    
    // 刪除聊天會話
    await prisma.chat.deleteMany();
    console.log('已刪除所有聊天會話');
    
    // 刪除記憶
    await prisma.memory.deleteMany();
    console.log('已刪除所有記憶');
    
    // 刪除用戶好友關係
    await prisma.userFriend.deleteMany();
    console.log('已刪除所有用戶好友關係');
    
    // 解除角色與標籤的關聯
    const charactersWithTags = await prisma.character.findMany({
      where: {
        tags: {
          some: {}
        }
      },
      include: {
        tags: true
      }
    });
    
    for (const char of charactersWithTags) {
      await prisma.character.update({
        where: { id: char.id },
        data: {
          tags: {
            disconnect: char.tags.map(tag => ({ id: tag.id }))
          }
        }
      });
    }
    console.log('已解除所有角色與標籤的關聯');
    
    // 刪除標籤
    await prisma.tag.deleteMany();
    console.log('已刪除所有標籤');
    
    // 刪除角色
    await prisma.character.deleteMany();
    console.log('已刪除所有角色');
    
    // 刪除用戶配置檔案
    await prisma.userProfile.deleteMany();
    console.log('已刪除所有用戶配置檔案');
    
    // 刪除會話
    await prisma.session.deleteMany();
    console.log('已刪除所有會話');
    
    // 刪除驗證令牌
    await prisma.verificationToken.deleteMany();
    console.log('已刪除所有驗證令牌');
    
    // 刪除帳戶
    await prisma.account.deleteMany();
    console.log('已刪除所有帳戶');
    
    // 刪除用戶
    await prisma.user.deleteMany();
    console.log('已刪除所有用戶');
    
    console.log('\n資料庫重置完成！您現在可以重新初始化應用程序了。');
    console.log('建議執行下一步：npx prisma migrate reset');
  } catch (error) {
    console.error('重置資料庫時出錯:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase(); 
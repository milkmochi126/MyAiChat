const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:claire27764000@localhost:5432/MyAiChat"
    }
  }
});

async function main() {
  console.log('開始清空所有數據...');
  
  // 按照關聯順序刪除所有數據
  await prisma.message.deleteMany();
  console.log('- 已刪除所有消息數據');
  
  await prisma.chat.deleteMany();
  console.log('- 已刪除所有聊天數據');
  
  await prisma.userFriend.deleteMany();
  console.log('- 已刪除所有好友關係數據');
  
  // 刪除角色和標籤的關聯關係
  await prisma.$executeRaw`DELETE FROM "_CharacterToTag"`;
  console.log('- 已刪除角色與標籤的關聯');
  
  await prisma.character.deleteMany();
  console.log('- 已刪除所有角色數據');
  
  await prisma.tag.deleteMany();
  console.log('- 已刪除所有標籤數據');

  // 不刪除用戶數據，因為這可能與認證相關
  // 如果您真的要刪除用戶數據，請確保刪除所有關聯的 Account 和 Session 數據
  // await prisma.account.deleteMany();
  // await prisma.session.deleteMany();
  // await prisma.user.deleteMany();
  
  console.log('數據庫已清空。');
  console.log('您現在可以使用自己的帳號登入，並創建自己的角色和聊天。');
}

main()
  .catch((e) => {
    console.error('初始化錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
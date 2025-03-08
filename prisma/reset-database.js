const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('開始清空所有數據庫表...');

  // 按照依賴關係順序刪除數據
  console.log('刪除訊息數據...');
  await prisma.message.deleteMany({}).catch(e => console.log('刪除訊息錯誤:', e.message));
  
  console.log('刪除聊天數據...');
  await prisma.chat.deleteMany({}).catch(e => console.log('刪除聊天錯誤:', e.message));
  
  console.log('刪除角色數據...');
  await prisma.character.deleteMany({}).catch(e => console.log('刪除角色錯誤:', e.message));
  
  console.log('刪除標籤數據...');
  await prisma.tag.deleteMany({}).catch(e => console.log('刪除標籤錯誤:', e.message));
  
  console.log('刪除會話數據...');
  await prisma.session.deleteMany({}).catch(e => console.log('刪除會話錯誤:', e.message));
  
  console.log('刪除驗證令牌數據...');
  await prisma.verificationToken.deleteMany({}).catch(e => console.log('刪除驗證令牌錯誤:', e.message));
  
  console.log('刪除帳戶數據...');
  await prisma.account.deleteMany({}).catch(e => console.log('刪除帳戶錯誤:', e.message));
  
  console.log('刪除用戶數據...');
  await prisma.user.deleteMany({}).catch(e => console.log('刪除用戶錯誤:', e.message));

  console.log('數據庫已成功重置！請重新啟動應用並登入。');
}

main()
  .catch((e) => {
    console.error('執行重置時發生錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
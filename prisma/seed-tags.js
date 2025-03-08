const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('開始創建標籤...');

  // 創建標籤
  const tags = await Promise.all(
    ['男性', '女性', '系統', '劇情'].map(async (name) => {
      return prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    })
  );
  console.log('標籤創建完成');

  console.log('標籤初始化完成!');
}

main()
  .catch((e) => {
    console.error('初始化錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
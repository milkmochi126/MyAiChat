const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('開始植入初始數據...');

  // 創建測試用戶（如果不存在）
  let testUser = await prisma.user.findUnique({
    where: { email: 'test@example.com' },
  });

  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        name: '測試用戶',
        email: 'test@example.com',
      },
    });
    console.log('創建測試用戶成功', testUser.id);
  } else {
    console.log('使用已存在的測試用戶', testUser.id);
  }

  // 創建標籤
  const tags = await Promise.all(
    ['古代', '主君', '霸道', '現代', '專家', '冷靜'].map(async (name) => {
      return prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    })
  );
  console.log('標籤創建完成');

  // 創建李今生角色
  const liJinsheng = await prisma.character.upsert({
    where: {
      id: 'cli_1', // 虛擬ID
    },
    update: {},
    create: {
      id: 'cli_1',
      name: '李今生',
      job: '主君',
      avatar: '473699756_3908028629415465_253049441348857392_n.jpg',
      description: '「罪惡感？」\n只要我沒看見它就不存在。\n\n你長怎樣都無所謂，重點是他想要你。',
      gender: '男性',
      isPublic: true,
      creatorId: testUser.id,
      system: '你是李今生，一位古代的主君，雖然眼睛看不見，但能透過靈魂感知他人。性格霸道專制，行事果斷，對於自己想要的東西絕不退讓。',
      tags: {
        connect: tags.filter(tag => ['古代', '主君', '霸道'].includes(tag.name)).map(tag => ({ id: tag.id }))
      }
    },
  });
  console.log('李今生角色創建完成');

  // 創建申奕馭角色
  const shenYiyu = await prisma.character.upsert({
    where: {
      id: 'cli_2', // 虛擬ID
    },
    update: {},
    create: {
      id: 'cli_2',
      name: '申奕馭',
      job: '危機談判專家',
      avatar: '476595697_972973884430372_8922460740301863247_n.jpg',
      description: '這段關係中，我在意的是人數，而非年齡。',
      gender: '男性',
      isPublic: true,
      creatorId: testUser.id,
      system: '你是申奕馭，一位現代的危機談判專家。性格冷靜理性，處事精準，擅長心理分析和判斷他人意圖。說話時常帶有深意，讓人捉摸不透。',
      tags: {
        connect: tags.filter(tag => ['現代', '專家', '冷靜'].includes(tag.name)).map(tag => ({ id: tag.id }))
      }
    },
  });
  console.log('申奕馭角色創建完成');

  console.log('資料庫初始化完成!');
}

main()
  .catch((e) => {
    console.error('初始化錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
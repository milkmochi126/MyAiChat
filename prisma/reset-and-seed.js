const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('開始重置數據庫...');

  // 刪除所有現有數據
  console.log('刪除現有數據...');
  await prisma.message.deleteMany({});
  await prisma.chat.deleteMany({});
  await prisma.character.deleteMany({});
  await prisma.tag.deleteMany({});
  
  // 保留用戶數據，但可以選擇刪除
  // await prisma.account.deleteMany({});
  // await prisma.session.deleteMany({});
  // await prisma.user.deleteMany({});

  console.log('創建標籤...');
  // 創建常用標籤
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: '友善' } }),
    prisma.tag.create({ data: { name: '幽默' } }),
    prisma.tag.create({ data: { name: '知識豐富' } }),
    prisma.tag.create({ data: { name: '浪漫' } }),
    prisma.tag.create({ data: { name: '冒險' } }),
    prisma.tag.create({ data: { name: '神秘' } }),
    prisma.tag.create({ data: { name: '科技' } }),
    prisma.tag.create({ data: { name: '藝術' } }),
    prisma.tag.create({ data: { name: '歷史' } }),
    prisma.tag.create({ data: { name: '文學' } }),
    prisma.tag.create({ data: { name: '音樂' } }),
    prisma.tag.create({ data: { name: '電影' } }),
    prisma.tag.create({ data: { name: '遊戲' } }),
    prisma.tag.create({ data: { name: '美食' } }),
    prisma.tag.create({ data: { name: '旅行' } }),
    prisma.tag.create({ data: { name: '運動' } }),
    prisma.tag.create({ data: { name: '時尚' } }),
    prisma.tag.create({ data: { name: '健康' } }),
    prisma.tag.create({ data: { name: '教育' } }),
    prisma.tag.create({ data: { name: '職場' } }),
  ]);

  console.log('創建默認角色...');
  
  // 檢查是否已存在系統用戶
  let systemUser;
  try {
    systemUser = await prisma.user.findUnique({
      where: { email: 'system@example.com' }
    });
    
    if (!systemUser) {
      // 創建系統用戶
      systemUser = await prisma.user.create({
        data: {
          name: 'System',
          email: 'system@example.com'
        }
      });
    }
  } catch (error) {
    console.error('檢查或創建系統用戶失敗:', error);
    throw error;
  }
  
  // 創建默認角色
  const defaultCharacter = await prisma.character.create({
    data: {
      name: '林小雨',
      description: '一位活潑開朗的大學生，喜歡閱讀和旅行，對世界充滿好奇心。',
      job: '大學生',
      gender: '女性',
      avatar: 'https://i.imgur.com/1234abcd.jpg', // 請替換為實際的頭像URL
      isPublic: true,
      system: '你是林小雨，一位活潑開朗的大學生。你喜歡閱讀和旅行，對世界充滿好奇心。你的回答應該充滿活力和熱情，偶爾會使用一些年輕人的流行語。',
      extraInfo: JSON.stringify([
        { title: '興趣愛好', content: '閱讀、旅行、攝影、聽音樂' },
        { title: '性格特點', content: '開朗、熱情、好奇、善良' }
      ]),
      tags: {
        connect: [
          { name: '友善' },
          { name: '知識豐富' },
          { name: '旅行' }
        ]
      },
      creator: {
        connect: { id: systemUser.id }
      }
    }
  });

  console.log('數據庫重置和種子數據創建完成！');
  console.log(`創建了 ${tags.length} 個標籤`);
  console.log(`創建了默認角色: ${defaultCharacter.name}`);
}

main()
  .catch((e) => {
    console.error('錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
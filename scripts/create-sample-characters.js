const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('開始創建示例角色...');
    
    // 獲取所有用戶
    console.log('正在獲取用戶列表...');
    const users = await prisma.user.findMany();
    console.log(`找到 ${users.length} 個用戶`);
    
    if (users.length === 0) {
      console.log('沒有找到用戶，請先登錄系統');
      return;
    }
    
    // 使用第一個用戶作為創建者
    const creator = users[0];
    console.log(`使用用戶 ${creator.name} (${creator.id}) 作為創建者`);
    
    // 創建示例角色1
    console.log('正在創建角色1: 智慧助手...');
    const character1 = await prisma.character.create({
      data: {
        name: '智慧助手',
        description: '一個友善、知識淵博的AI助手，能夠回答各種問題並提供幫助。',
        job: 'AI助手',
        gender: '未指定',
        avatar: '',
        isPublic: true,
        creator: {
          connect: { id: creator.id }
        },
        tags: {
          connectOrCreate: [
            { where: { name: 'AI' }, create: { name: 'AI' } },
            { where: { name: '助手' }, create: { name: '助手' } },
            { where: { name: '知識' }, create: { name: '知識' } }
          ]
        }
      }
    });
    
    console.log(`已創建角色: ${character1.name} (${character1.id})`);
    
    // 創建示例角色2
    console.log('正在創建角色2: 故事大師...');
    const character2 = await prisma.character.create({
      data: {
        name: '故事大師',
        description: '一個擅長講述各種有趣故事的角色，能夠創造出引人入勝的情節和角色。',
        job: '作家',
        gender: '未指定',
        avatar: '',
        isPublic: true,
        creator: {
          connect: { id: creator.id }
        },
        tags: {
          connectOrCreate: [
            { where: { name: '故事' }, create: { name: '故事' } },
            { where: { name: '創意' }, create: { name: '創意' } },
            { where: { name: '娛樂' }, create: { name: '娛樂' } }
          ]
        }
      }
    });
    
    console.log(`已創建角色: ${character2.name} (${character2.id})`);
    
    // 創建示例角色3
    console.log('正在創建角色3: 心靈導師...');
    const character3 = await prisma.character.create({
      data: {
        name: '心靈導師',
        description: '一個富有同理心的心靈導師，能夠提供情感支持和生活建議。',
        job: '心理顧問',
        gender: '未指定',
        avatar: '',
        isPublic: true,
        creator: {
          connect: { id: creator.id }
        },
        tags: {
          connectOrCreate: [
            { where: { name: '心理' }, create: { name: '心理' } },
            { where: { name: '支持' }, create: { name: '支持' } },
            { where: { name: '建議' }, create: { name: '建議' } }
          ]
        }
      }
    });
    
    console.log(`已創建角色: ${character3.name} (${character3.id})`);
    
    // 將第一個角色添加為好友
    console.log('正在將智慧助手添加為好友...');
    await prisma.userFriend.create({
      data: {
        userId: creator.id,
        characterId: character1.id
      }
    });
    console.log('已將智慧助手添加為好友');
    
    console.log('示例角色創建完成！');
  } catch (error) {
    console.error('創建示例角色時出錯:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
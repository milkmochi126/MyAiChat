const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('開始刪除預設角色...');

  // 刪除指定的角色
  const deletedLi = await prisma.character.delete({
    where: {
      id: 'cli_1', // 李今生的ID
    },
  }).catch(e => {
    console.log('刪除李今生時出錯：', e.message);
    return null;
  });

  if (deletedLi) {
    console.log('已刪除角色：', deletedLi.name);
  }

  const deletedShen = await prisma.character.delete({
    where: {
      id: 'cli_2', // 申奕馭的ID
    },
  }).catch(e => {
    console.log('刪除申奕馭時出錯：', e.message);
    return null;
  });

  if (deletedShen) {
    console.log('已刪除角色：', deletedShen.name);
  }

  console.log('預設角色清除完成！');
}

main()
  .catch((e) => {
    console.error('執行清除時發生錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
const { Client } = require('pg');

async function verifyCharacters() {
  // 從環境變數獲取連接字串，或使用硬編碼的連接字串進行測試
  const connectionString = 'postgresql://postgres:claire27764000@localhost:5432/MyAiChat';
  
  const client = new Client({ connectionString });
  
  try {
    console.log('連接到 PostgreSQL...');
    await client.connect();
    console.log('成功連接到 PostgreSQL!');
    
    // 檢查角色數量
    const characterRes = await client.query('SELECT COUNT(*) as count FROM "Character"');
    console.log(`資料庫中有 ${characterRes.rows[0].count} 個角色`);
    
    // 獲取所有角色
    const charactersRes = await client.query('SELECT id, name, job FROM "Character"');
    console.log('角色列表:');
    charactersRes.rows.forEach((character, index) => {
      console.log(`${index + 1}. ${character.name} (${character.job}) [ID: ${character.id}]`);
    });
    
    // 檢查標籤數量
    const tagRes = await client.query('SELECT COUNT(*) as count FROM "Tag"');
    console.log(`\n資料庫中有 ${tagRes.rows[0].count} 個標籤`);
    
    // 獲取所有標籤
    const tagsRes = await client.query('SELECT id, name FROM "Tag"');
    console.log('標籤列表:');
    tagsRes.rows.forEach((tag, index) => {
      console.log(`${index + 1}. ${tag.name} [ID: ${tag.id}]`);
    });
    
    // 檢查聊天數量
    const chatRes = await client.query('SELECT COUNT(*) as count FROM "Chat"');
    console.log(`\n資料庫中有 ${chatRes.rows[0].count} 個聊天`);
    
    // 獲取所有聊天
    const chatsRes = await client.query('SELECT id, title FROM "Chat"');
    console.log('聊天列表:');
    chatsRes.rows.forEach((chat, index) => {
      console.log(`${index + 1}. ${chat.title} [ID: ${chat.id}]`);
    });
    
    return true;
  } catch (err) {
    console.error('查詢數據庫時出錯:', err);
    return false;
  } finally {
    await client.end();
    console.log('\nPostgreSQL 連接已關閉');
  }
}

verifyCharacters()
  .then(success => {
    console.log('\n驗證完成');
    process.exit(success ? 0 : 1);
  })
  .catch(e => {
    console.error('驗證過程中發生意外錯誤:', e);
    process.exit(1);
  }); 
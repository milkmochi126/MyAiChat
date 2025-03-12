const { Client } = require('pg');

async function checkTables() {
  // 從環境變數獲取連接字串，或使用硬編碼的連接字串進行測試
  const connectionString = 'postgresql://postgres:claire27764000@localhost:5432/MyAiChat';
  
  const client = new Client({ connectionString });
  
  try {
    console.log('嘗試連接到 PostgreSQL...');
    await client.connect();
    console.log('成功連接到 PostgreSQL!');
    
    // 檢查資料庫中的表
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('資料庫中的表:');
    res.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.table_name}`);
    });
    
    return true;
  } catch (err) {
    console.error('檢查表時出錯:', err);
    return false;
  } finally {
    await client.end();
    console.log('PostgreSQL 連接已關閉');
  }
}

checkTables()
  .then(success => {
    console.log('檢查完成');
    process.exit(success ? 0 : 1);
  })
  .catch(e => {
    console.error('檢查過程中發生意外錯誤:', e);
    process.exit(1);
  }); 
// 這個文件需要在瀏覽器環境中執行
// 可以通過在HTML頁面中引入此腳本或在瀏覽器控制台中執行
// 由於這是伺服器端的Node.js項目，我們創建一個指南說明如何清除本地存儲

console.log('清除本地存儲指南');
console.log('================');
console.log('');
console.log('由於localStorage是瀏覽器端的功能，無法通過Node.js直接操作。');
console.log('請按照以下步驟手動清除本地存儲：');
console.log('');
console.log('方法1: 使用瀏覽器開發者工具');
console.log('1. 打開您的應用程序網頁');
console.log('2. 右鍵點擊頁面並選擇「檢查」或按F12打開開發者工具');
console.log('3. 切換到「應用程序」或「存儲」標籤');
console.log('4. 在左側找到「本地存儲」(Local Storage)');
console.log('5. 右鍵點擊您網站的網址並選擇「清除」');
console.log('');
console.log('方法2: 在應用程序中添加清除功能');
console.log('在您的HTML頁面或React組件中添加以下代碼：');
console.log('');
console.log('  <button onclick="clearLocalStorage()">清除本地存儲</button>');
console.log('  <script>');
console.log('    function clearLocalStorage() {');
console.log('      localStorage.clear();');
console.log('      alert("本地存儲已清除！");');
console.log('      // 可選：刷新頁面');
console.log('      window.location.reload();');
console.log('    }');
console.log('  </script>');
console.log('');
console.log('方法3: 直接在瀏覽器控制台執行');
console.log('1. 打開您的應用程序網頁');
console.log('2. 按F12打開開發者工具');
console.log('3. 切換到「控制台」標籤');
console.log('4. 輸入以下命令並按回車：');
console.log('   localStorage.clear()');
console.log('5. 刷新頁面');
console.log('');
console.log('執行以上任一方法後，所有本地存儲的數據將被清除。');
console.log('用戶需要重新登錄，您的應用程序將以全新狀態啟動。'); 
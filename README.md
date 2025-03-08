# AI 聊天應用

這是一個基於 Next.js 開發的 AI 聊天應用程序，支持角色創建、聊天和角色管理功能。

## 功能特點

- 角色創建和管理
- 聊天界面和消息歷史記錄
- 好友管理系統
- PWA 支持，可安裝為應用
- 响應式設計，適配桌面和移動設備

## 開發環境配置

### 前端部分

1. 安裝依賴
```bash
npm install
```

2. 運行開發服務器
```bash
npm run dev
```

3. 訪問應用
打開 [http://localhost:3000](http://localhost:3000) 查看應用

### 後端部分 (可選)

1. 設置 Python 虛擬環境
```bash
cd backend
python -m venv venv
source venv/bin/activate  # 在 Windows 上使用 venv\Scripts\activate
pip install -r requirements.txt
```

2. 運行後端服務器
```bash
cd backend
uvicorn main:app --reload
```

## 數據庫配置

項目使用 Prisma ORM 和 PostgreSQL 數據庫，也支持 SQLite 本地開發模式。

1. 設置數據庫連接
在 `.env.local` 文件中設置 `DATABASE_URL`

2. 運行遷移和種子數據
```bash
npx prisma migrate dev
npm run seed
```

## PWA 圖標配置

為了讓 PWA 功能正常工作，需要在 `public/icons/` 目錄中添加以下圖標：

1. `icon-192x192.png` - 192x192 像素的應用圖標
2. `icon-384x384.png` - 384x384 像素的應用圖標
3. `icon-512x512.png` - 512x512 像素的應用圖標
4. `favicon-16x16.png` - 16x16 像素的網站圖標
5. `favicon-32x32.png` - 32x32 像素的網站圖標

您可以使用任何圖片編輯工具創建這些圖標，例如：
- 線上工具：[Favicon Generator](https://realfavicongenerator.net/)
- 圖像處理：使用 Photoshop 或 GIMP 調整 `public/img/` 中的圖片

## 目錄結構

- `pages/`: 前端頁面
- `components/`: React 組件
- `lib/`: 工具函數和庫
- `prisma/`: 數據庫模式和遷移
- `public/`: 靜態資源
- `styles/`: CSS 樣式文件
- `backend/`: Python 後端服務（可選）
- `docs/`: 文檔和參考資料

## 許可證

MIT

## 用戶數據初始化

為了確保每個新用戶在註冊後都有正確的初始化狀態，我們進行了以下修改：

### 1. 用戶存儲工具 (`utils/userStorage.js`)

- 添加了 `initializeNewUser` 函數，用於初始化新用戶的數據
- 改進了 `clearAllUserData` 函數，用於清除所有本地存儲數據
- 添加了用戶特定的存儲鍵，確保不同用戶的數據完全隔離

### 2. 全局初始化 (`pages/_app.js`)

- 添加了 `UserInitializer` 組件，用於在用戶登錄時檢查和初始化用戶數據
- 確保每次會話變化時都檢查用戶初始化狀態

### 3. 導航欄 (`components/Navbar.js`)

- 修改了用戶資料獲取邏輯，使用用戶特定的存儲
- 改進了登出功能，確保清除所有用戶數據

### 4. 清除存儲頁面 (`pages/clear-storage.js`)

- 使用新的 `clearAllUserData` 函數來清除所有本地存儲數據

### 5. 主頁 (`pages/index.js`)

- 修改了聊天列表加載邏輯，使用用戶特定的存儲
- 添加了從 API 獲取數據的邏輯，確保數據隔離

### 6. 角色頁面 (`pages/characters.js`)

- 修改了角色列表加載邏輯，使用用戶特定的存儲
- 添加了從 API 獲取數據的邏輯，確保數據隔離

### 7. 好友頁面 (`pages/friends.js`)

- 修改了好友列表加載邏輯，使用用戶特定的存儲
- 添加了從 API 獲取數據的邏輯，確保數據隔離

### 8. 設置頁面 (`pages/settings.js`)

- 修改了用戶設置加載邏輯，使用用戶特定的存儲
- 改進了個人資料、API 金鑰和默認模型的保存邏輯
- 修改了暫存角色資料的邏輯，確保數據隔離

這些修改確保了：

1. 新用戶在註冊後會看到空的聊天列表、好友列表和角色列表
2. 用戶的個人資料會使用 Google 帳號的資料進行初始化
3. API 金鑰和默認模型設置會被初始化為空值
4. 不同用戶的數據完全隔離，不會互相影響
5. 切換帳號時會自動清除舊用戶的數據，並載入新用戶的數據

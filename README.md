# MyAiChat

基於 Next.js 和 FastAPI 開發的 AI 聊天應用，支持多模型、角色創建和用戶管理。

## 功能特點

- 多模型 AI 聊天：支持 Gemini、GPT-3.5、Claude 等模型
- 角色創建和管理：自定義角色，設置性格、喜好和說話風格
- 聊天歷史記錄：保存所有聊天記錄，隨時繼續對話
- 情感評估系統：計算與角色的親密度變化
- 好友管理系統：添加、刪除和管理好友
- PWA 支持：可安裝為應用
- 响應式設計：適配桌面和移動設備

## 技術架構

### 前端

- **Next.js**: React 框架，提供服務端渲染和API路由
- **TailwindCSS**: 用於樣式設計
- **NextAuth**: 用於用戶認證
- **Prisma**: ORM 數據庫操作

### 後端

- **FastAPI**: Python 後端框架
- **多模型整合**: 支持 Gemini、OpenAI、Claude 等多種 AI 模型
- **聊天記憶系統**: 處理長對話記憶和情境理解
- **情感評估引擎**: 分析對話情感並計算親密度

## 開發環境配置

### 前端部分

1. 安裝依賴
```bash
npm install
```

2. 設置環境變數
複製 `.env.example` 到 `.env.local` 並填寫必要的配置

3. 運行開發服務器
```bash
npm run dev
```

### 後端部分

1. 設置 Python 虛擬環境
```bash
cd backend
python -m venv venv
source venv/bin/activate  # 在 Windows 上使用 venv\Scripts\activate
pip install -r requirements.txt
```

2. 設置環境變數
複製 `backend/.env.example` 到 `backend/.env` 並填寫必要的配置

3. 運行後端服務器
```bash
cd backend
uvicorn main:app --reload
```

## 部署指南

### Render 部署

#### 前端部署

1. 在 Render 創建一個 Web Service
2. 連接 GitHub 存儲庫
3. 設置以下內容：
   - **構建命令**: `npm install && npm run build`
   - **啟動命令**: `npm start`
   - 添加必要的環境變數

#### 後端部署

1. 在 Render 創建另一個 Web Service
2. 連接同一個 GitHub 存儲庫
3. 設置以下內容：
   - **構建命令**: `pip install -r backend/requirements.txt`
   - **啟動命令**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - 添加必要的環境變數

## 許可證

MIT

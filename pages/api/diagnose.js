import { getSession } from 'next-auth/react';
import { Pool } from 'pg';
import prisma from '../../lib/prisma';

// 診斷API端點 - 檢查數據庫連接和表格狀態
export default async function handler(req, res) {
  try {
    // 驗證用戶會話
    const session = await getSession({ req });
    if (!session) {
      return res.status(401).json({ error: '未授權訪問' });
    }

    console.log('開始數據庫診斷，用戶:', session.user.name);
    
    // 獲取環境變量
    const connectionString = process.env.DATABASE_URL;
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    
    if (!connectionString) {
      return res.status(500).json({ 
        success: false, 
        error: '數據庫連接字符串未設置',
        env: {
          hasDatabase: false,
          hasNextAuthUrl: !!nextAuthUrl,
          hasNextAuthSecret: !!nextAuthSecret
        }
      });
    }
    
    // 診斷結果對象
    const diagnosticResults = {
      success: true,
      timestamp: new Date().toISOString(),
      user: session.user.name,
      connection: { 
        successful: false, 
        details: null 
      },
      tables: {},
      env: {
        hasDatabase: !!connectionString,
        hasNextAuthUrl: !!nextAuthUrl,
        hasNextAuthSecret: !!nextAuthSecret,
        databaseUrlMasked: connectionString ? `${connectionString.substring(0, 15)}...` : null
      }
    };
    
    // 測試原生 PostgreSQL 連接
    try {
      console.log('測試直接 PostgreSQL 連接...');
      const pool = new Pool({ connectionString });
      const connectionResult = await pool.query('SELECT NOW()');
      diagnosticResults.connection.successful = true;
      diagnosticResults.connection.details = connectionResult.rows[0].now;
      await pool.end();
    } catch (pgError) {
      console.error('PostgreSQL連接失敗:', pgError);
      diagnosticResults.connection.error = pgError.message;
      // 如果連接失敗，直接返回結果
      return res.status(500).json({
        ...diagnosticResults,
        success: false,
        error: '數據庫連接失敗'
      });
    }
    
    // 測試 Prisma 連接和表格存在性
    console.log('測試 Prisma 連接和表格...');
    const tablesToCheck = [
      'users', 'accounts', 'sessions', 'verification_tokens',
      'characters', 'chats', 'messages', 'user_friends', 
      'tags', 'user_profiles', 'memories'
    ];
    
    for (const table of tablesToCheck) {
      try {
        await prisma.$executeRawUnsafe(`SELECT 1 FROM "${table}" LIMIT 1`);
        diagnosticResults.tables[table] = { exists: true };
      } catch (error) {
        console.log(`表格 ${table} 檢查錯誤:`, error.message);
        diagnosticResults.tables[table] = { 
          exists: false, 
          error: error.message 
        };
      }
    }
    
    // 測試創建一個測試表 (如果可能)
    try {
      console.log('測試表格創建權限...');
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "diagnostic_test" (
          "id" SERIAL PRIMARY KEY,
          "test_field" TEXT,
          "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // 插入測試數據
      await prisma.$executeRaw`
        INSERT INTO "diagnostic_test" ("test_field") VALUES ('診斷測試成功')
      `;
      
      // 檢索測試數據
      const testResult = await prisma.$queryRaw`SELECT * FROM "diagnostic_test" LIMIT 1`;
      
      diagnosticResults.createTest = {
        successful: true,
        data: testResult
      };
      
      // 清理測試表
      await prisma.$executeRaw`DROP TABLE "diagnostic_test"`;
    } catch (createError) {
      console.error('表格創建測試失敗:', createError);
      diagnosticResults.createTest = {
        successful: false,
        error: createError.message
      };
    }
    
    // 返回診斷結果
    return res.status(200).json(diagnosticResults);
  } catch (error) {
    console.error('診斷過程中發生錯誤:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : null
    });
  }
} 
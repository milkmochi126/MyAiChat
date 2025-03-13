import { getSession } from 'next-auth/react';

// 安全地觸發數據庫初始化
export default async function handler(req, res) {
  try {
    // 檢查會話
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: '請先登入' });
    }
    
    // 只接受POST請求
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '僅允許POST請求' });
    }
    
    // 調用內部初始化API
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/db-init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: process.env.NEXTAUTH_SECRET
      }),
    });
    
    // 返回內部API的響應
    const result = await response.json();
    
    return res.status(response.status).json(result);
  } catch (error) {
    console.error('數據庫初始化觸發失敗:', error);
    return res.status(500).json({ error: error.message });
  }
} 
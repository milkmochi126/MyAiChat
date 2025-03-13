import { useState } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function NoAuthInit() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDirectInit = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      console.log('調用直接初始化API...');
      const response = await fetch('/api/direct-init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      console.log('初始化結果:', data);

      if (!response.ok) {
        throw new Error(data.error || '初始化失敗');
      }

      setResult(data);
    } catch (err) {
      console.error('初始化過程中發生錯誤:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>數據庫直接初始化 - 無需認證</title>
        <meta name="description" content="無需認證的數據庫初始化頁面" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          數據庫直接初始化
        </h1>

        <p className={styles.description}>
          此頁面不需要用戶認證，可以直接初始化數據庫
        </p>

        <div className={styles.grid} style={{ marginTop: '2rem', width: '100%', maxWidth: '800px' }}>
          <div className={styles.card} style={{ width: '100%' }}>
            <h2>初始化操作</h2>
            <p>點擊下方按鈕開始初始化數據庫：</p>
            <button
              onClick={handleDirectInit}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                marginTop: '10px'
              }}
            >
              {loading ? '初始化中...' : '開始初始化數據庫'}
            </button>

            {loading && (
              <div style={{ marginTop: '20px' }}>
                <p>正在初始化數據庫，請稍候...</p>
              </div>
            )}

            {error && (
              <div style={{ marginTop: '20px', color: 'red', padding: '10px', backgroundColor: '#ffebee', borderRadius: '5px' }}>
                <h3>發生錯誤：</h3>
                <p>{error}</p>
              </div>
            )}

            {result && (
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e6f7ff', borderRadius: '5px' }}>
                <h3>初始化結果：</h3>
                <p><strong>狀態：</strong> {result.success ? '成功' : '失敗'}</p>
                <p><strong>訊息：</strong> {result.message}</p>
                <p><strong>時間戳：</strong> {new Date(result.timestamp).toLocaleString()}</p>
                
                <h4 style={{ marginTop: '15px' }}>表格狀態：</h4>
                <div style={{ marginLeft: '20px' }}>
                  {Object.entries(result.tables).map(([table, status]) => (
                    <p key={table}>
                      <strong>{table}：</strong> {status}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="/"
          rel="noopener noreferrer"
        >
          返回首頁
        </a>
      </footer>
    </div>
  );
} 
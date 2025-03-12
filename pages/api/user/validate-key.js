import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import axios from "axios";

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "未授權" });
    }

    const { method } = req;

    if (method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).end(`Method ${method} Not Allowed`);
    }

    const { type, key } = req.body;
    
    if (!type || !key) {
      return res.status(400).json({ error: "缺少必要參數" });
    }
    
    try {
      let valid = false;
      let message = "";
      
      switch (type) {
        case 'gpt':
          // 驗證 OpenAI API 金鑰
          try {
            const response = await axios.get('https://api.openai.com/v1/models', {
              headers: {
                'Authorization': `Bearer ${key}`
              }
            });
            valid = response.status === 200;
            message = "OpenAI API 金鑰有效";
          } catch (error) {
            valid = false;
            message = error.response?.data?.error?.message || "無效的 OpenAI API 金鑰";
          }
          break;
          
        case 'claude':
          // 驗證 Anthropic API 金鑰
          try {
            const response = await axios.get('https://api.anthropic.com/v1/models', {
              headers: {
                'x-api-key': key,
                'anthropic-version': '2023-06-01'
              }
            });
            valid = response.status === 200;
            message = "Anthropic API 金鑰有效";
          } catch (error) {
            valid = false;
            message = error.response?.data?.error?.message || "無效的 Anthropic API 金鑰";
          }
          break;
          
        case 'gemini':
          // 驗證 Google Gemini API 金鑰
          try {
            const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            valid = response.status === 200;
            message = "Google Gemini API 金鑰有效";
          } catch (error) {
            valid = false;
            message = error.response?.data?.error?.message || "無效的 Google Gemini API 金鑰";
          }
          break;
          
        default:
          return res.status(400).json({ error: "不支援的 API 類型" });
      }
      
      return res.status(200).json({ 
        valid, 
        message 
      });
    } catch (error) {
      console.error("驗證 API 金鑰時出錯:", error);
      return res.status(500).json({ 
        valid: false,
        error: "驗證 API 金鑰失敗", 
        message: error.message 
      });
    }
  } catch (error) {
    console.error("API 金鑰驗證操作錯誤:", error);
    return res.status(500).json({ 
      valid: false,
      error: "內部伺服器錯誤", 
      message: error.message 
    });
  }
} 
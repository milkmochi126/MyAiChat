import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * 聊天消息組件
 * 用於渲染和格式化聊天消息，特別處理旁白描述等特殊格式
 * 支援 Markdown 格式
 */
const ChatMessage = ({ message, character, isUser }) => {
  // 解析消息內容，處理旁白和對話
  const renderFormattedContent = (content) => {
    if (!content) return null;
    
    // 使用正則表達式找出所有的旁白描述 *(旁白)*
    const regex = /\*\((.*?)\)\*/g;
    let parts = [];
    let lastIndex = 0;
    let match;
    
    // 查找所有匹配並分割內容
    while ((match = regex.exec(content)) !== null) {
      // 添加匹配前的普通文本（如果有）
      if (match.index > lastIndex) {
        const normalText = content.substring(lastIndex, match.index);
        if (normalText.trim()) {
          parts.push({
            type: 'dialogue',
            text: normalText.trim()
          });
        }
      }
      
      // 添加旁白描述
      parts.push({
        type: 'narration',
        text: match[1]
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // 添加最後剩餘的普通文本（如果有）
    if (lastIndex < content.length) {
      const normalText = content.substring(lastIndex);
      if (normalText.trim()) {
        parts.push({
          type: 'dialogue',
          text: normalText.trim()
        });
      }
    }
    
    // 如果沒有使用格式，則將整個內容視為對話
    if (parts.length === 0) {
      parts.push({
        type: 'dialogue',
        text: content
      });
    }
    
    // 渲染不同類型的內容
    return parts.map((part, index) => {
      if (part.type === 'narration') {
        return (
          <div key={index} className="text-gray-400 italic text-sm mb-1">
            {part.text}
          </div>
        );
      } else { // dialogue
        return (
          <div key={index} className="mb-1">
            <ReactMarkdown
              components={{
                p: ({node, ...props}) => <p className="markdown-content my-2" {...props} />,
                h1: ({node, ...props}) => <h1 className="markdown-content text-xl font-bold my-3" {...props} />,
                h2: ({node, ...props}) => <h2 className="markdown-content text-lg font-bold my-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="markdown-content font-bold my-2" {...props} />,
                ul: ({node, ...props}) => <ul className="markdown-content list-disc ml-5 my-2" {...props} />,
                ol: ({node, ...props}) => <ol className="markdown-content list-decimal ml-5 my-2" {...props} />,
                li: ({node, ...props}) => <li className="markdown-content mb-1" {...props} />,
                pre: ({node, ...props}) => <pre className="markdown-content bg-gray-800 p-2 rounded my-2 overflow-x-auto" {...props} />,
                code: ({node, inline, ...props}) => 
                  inline 
                    ? <code className="markdown-content bg-gray-800 px-1 rounded text-xs" {...props} /> 
                    : <code className="markdown-content" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="markdown-content border-l-4 border-gray-500 pl-2 italic my-2" {...props} />,
                a: ({node, ...props}) => <a className="markdown-content text-blue-400 underline" {...props} />,
                table: ({node, ...props}) => <table className="markdown-content border-collapse border border-gray-600 my-2" {...props} />,
                th: ({node, ...props}) => <th className="markdown-content border border-gray-600 px-2 py-1" {...props} />,
                td: ({node, ...props}) => <td className="markdown-content border border-gray-600 px-2 py-1" {...props} />,
                hr: ({node, ...props}) => <hr className="markdown-content border-gray-600 my-4" {...props} />,
              }}
            >
              {part.text}
            </ReactMarkdown>
          </div>
        );
      }
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* 角色頭像（非用戶消息時顯示） */}
      {!isUser && (
        <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden mr-2 flex-shrink-0 self-end">
          {character?.avatar && !character.isDeleted ? (
            <img 
              src={character.avatar.startsWith('data:') ? character.avatar : `/img/${character.avatar}`}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              {character?.name?.[0] || "?"}
            </div>
          )}
        </div>
      )}
      
      {/* 消息內容 */}
      <div 
        className={`max-w-[70%] p-3 rounded-2xl ${
          isUser 
            ? 'bg-blue-600 text-white rounded-tr-none' 
            : 'bg-gray-700 text-white rounded-tl-none'
        }`}
      >
        <div className="text-sm">
          {renderFormattedContent(message.content)}
        </div>
        
        {/* 顯示使用的模型 */}
        {!isUser && message.model && (
          <div className="mt-1 flex items-center justify-end">
            <span className={`text-xs ${
              message.model === 'gpt' ? 'text-green-400' : 
              message.model === 'claude' ? 'text-purple-400' : 
              message.model === 'gemini' ? 'text-blue-400' : 
              'text-gray-400'
            }`}>
              {message.model === 'gpt' ? 'GPT' : 
               message.model === 'claude' ? 'Claude' : 
               message.model === 'gemini' ? 'Gemini' : 
               message.model}
            </span>
          </div>
        )}
      </div>
      
      {/* 用戶頭像 */}
      {isUser && (
        <div className="w-8 h-8 bg-gray-600 rounded-full overflow-hidden ml-2 flex-shrink-0 self-end flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ChatMessage; 
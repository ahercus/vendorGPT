import React, { useEffect } from 'react';
import { formatMessage } from '../utils/formatMessage';

export default function ChatUI({ messages }) {
  console.log("Rendering messages:", messages);

  useEffect(() => {
    console.log("[ChatUI] Component rendered with messages:", messages);
  }, [messages]);

  return (
    <div className="chat-container">
      {messages.map((message, index) => {
        console.log("Message content:", message.content);
        console.log("Contains asterisks:", message.content.includes('**'));
        
        const formattedContent = formatMessage(message.content);
        console.log("Formatted content:", formattedContent);
        console.log("Contains bold tags:", formattedContent.includes('<b>'));
        
        return (
          <div key={index} className={`message ${message.role === 'user' ? 'user-message' : 'bot-message'}`}>
            <div className="message-header">
              <span className={message.role === 'user' ? 'user-label' : 'assistant-label'}>
                {message.role === 'user' ? 'You:' : 'Assistant:'}
              </span>
            </div>
            <div className="message-content" 
                dangerouslySetInnerHTML={{ __html: formattedContent }}>
            </div>
          </div>
        );
      })}
    </div>
  );
} 
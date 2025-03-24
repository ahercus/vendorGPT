import React from 'react';
import { formatMessage } from '../utils/formatMessage';

export default function ChatUI({ messages }) {
  return (
    <div className="chat-container">
      {messages.map((message, index) => (
        <div key={index} className={`message ${message.role === 'user' ? 'user-message' : 'bot-message'}`}>
          <div className="message-header">
            <span className={message.role === 'user' ? 'user-label' : 'assistant-label'}>
              {message.role === 'user' ? 'You:' : 'Assistant:'}
            </span>
          </div>
          <div className="message-content" 
               dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}>
          </div>
        </div>
      ))}
    </div>
  );
} 
import React from 'react';
import { formatMessage } from '../utils/formatMessage';

export default function ChatMessage({ message }) {
  return (
    <div className={`message ${message.role === 'user' ? 'user' : 'bot'}`}>
      <strong className={message.role === 'user' ? 'user-name' : 'assistant-name'}>
        {message.role === 'user' ? 'You' : 'Bot'}:
      </strong>
      <span 
        dangerouslySetInnerHTML={{ 
          __html: formatMessage(message.content) 
        }} 
      />
    </div>
  );
}
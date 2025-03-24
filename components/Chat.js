import { formatMessage } from '../utils/formatMessage';
import { useEffect, useState } from 'react';

export default function Chat({ messages: propMessages = [] }) {
  const [displayMessages, setDisplayMessages] = useState([]);
  
  useEffect(() => {
    // Always include the welcome message at the beginning
    const welcomeMessage = {
      role: 'assistant',
      content: 'Welcome to the AI Assistant! Here\'s how you can interact with me:<br><br>• Ask questions about any topic<br>• Request information or explanations<br>• Upload documents for analysis<br>• Search for specific information<br><br>How can I help you today?'
    };
    
    // If there are no messages, just show the welcome message
    // Otherwise, add the welcome message to the beginning if it's not already there
    if (!propMessages || propMessages.length === 0) {
      setDisplayMessages([welcomeMessage]);
    } else if (propMessages.length > 0 && 
              (propMessages[0].role !== 'assistant' || 
               !propMessages[0].content.includes('Welcome to the AI Assistant'))) {
      setDisplayMessages([welcomeMessage, ...propMessages]);
    } else {
      setDisplayMessages(propMessages);
    }
  }, [propMessages]);

  return (
    <div className="chat-container">
      {displayMessages.map((message, index) => (
        <div key={index} className={`message ${message.role}`}>
          <span className={message.role === 'assistant' ? 'assistant-label' : 'user-label'}>
            {message.role === 'assistant' ? 'Assistant' : 'You'}:
          </span>
          <div className="message-content" 
            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}>
          </div>
        </div>
      ))}
    </div>
  );
} 
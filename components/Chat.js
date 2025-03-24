import { formatMessage } from '../utils/formatMessage';

export default function Chat({ messages }) {
  return (
    <div className="chat-container">
      {messages.map((message, index) => (
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
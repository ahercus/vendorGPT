import { useState, useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';

export default function Home() {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([{
    text: "Yo! What's good? Whether you're talking brand, culture, or our Nashville hot heat levels - I'm here to keep it 💯",
    sender: 'bot'
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDots, setLoadingDots] = useState('');

  const quickActions = [
    { label: 'TALK LIKE DAVE', query: "I have some words here, and I need help translating it into Dave's tone and style." },
    { label: 'ON BRAND?', query: "I have an idea, but I don't know if it's on brand. Ready to hear it?" },
    { label: 'HOT TAKE', query: "There's something I want to show you, and I need you to give me your hot take on it. And when I say hot, I mean SPICY hot." },
    { label: 'WWDD?', query: "I've got a problem, and I need to know... what would Dave do??" }
  ];

  const addMessage = (text, sender) => {
    setChatLog(prev => [...prev, { text, sender }]);
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message;
    setMessage('');
    setIsLoading(true);
    addMessage(userMessage, 'user');

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      addMessage(data.response, 'bot');
    } catch (error) {
      console.error('Error:', error);
      addMessage('Sorry, I encountered an error. Please try again.', 'bot');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingDots(dots => dots.length >= 3 ? '' : dots + '.');
      }, 500);
    } else {
      setLoadingDots('');
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const formatMessage = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  return (
    <>
      <Head>
        <title>Ask Dave - Dave's Hot Chicken</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="main-content">
        <div className="header">
          <Image 
            src="/dhc-logo.png" 
            alt="Dave's Hot Chicken" 
            className="logo"
            width={240}
            height={120}
          />
          <h1>Ask Dave</h1>
          <p className="tagline">FLOCK AROUND AND FIND OUT</p>
        </div>

        <div className="quick-actions">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="action-btn"
              onClick={async () => {
                if (isLoading) return;
                setIsLoading(true);
                addMessage(action.query, 'user');

                try {
                  const response = await fetch('/api/assistant', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ message: action.query }),
                  });

                  const data = await response.json();
                  
                  if (data.error) {
                    throw new Error(data.error.message);
                  }

                  addMessage(data.response, 'bot');
                } catch (error) {
                  console.error('Error:', error);
                  addMessage('Sorry, I encountered an error. Please try again.', 'bot');
                } finally {
                  setIsLoading(false);
                }
              }}
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="chat-container">
          <div id="chat-log">
            {chatLog.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <strong className="bot-name">
                  {msg.sender === 'bot' ? 'Dave 🔥' : 'You'}:
                </strong>{' '}
                <span dangerouslySetInnerHTML={{ 
                  __html: formatMessage(msg.text).replace(/\n/g, '<br>') 
                }} />
              </div>
            ))}
          </div>

          <div className="input-area">
            <input
              id="user-input"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Enter your message..."
            />
            <button 
              id="send-btn"
              onClick={handleSend}
              disabled={isLoading}
            >
              {isLoading ? loadingDots.padEnd(3, ' ') : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 
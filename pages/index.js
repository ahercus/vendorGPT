import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';

export default function Home() {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDots, setLoadingDots] = useState('');
  const [activeButton, setActiveButton] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const inputRef = useRef(null);
  const chatLogRef = useRef(null);
  const [queryType, setQueryType] = useState('general');
  const [timeframe, setTimeframe] = useState('all');

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  useEffect(() => {
    chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [chatLog]);

  useEffect(() => {
    const introMessage = {
      text: "Hey, how can I help? 👋",
      sender: 'bot'
    };
    setChatLog([introMessage]);
  }, []);

  const quickActions = [
    { 
      label: 'Bios',
      queries: {
        brief: "Provide a numbered list of available staff bios, ranked by leadership level.",
        detailed: "Provide a detailed numbered list of all staff bios, organized by leadership hierarchy, including their roles and key responsibilities."
      }
    },
    { 
      label: 'Work',
      queries: {
        brief: "List our case studies in order of significance/mentions.",
        detailed: "Provide a comprehensive numbered list of our case studies, ranked by significance and impact, including key metrics and outcomes."
      }
    },
    { 
      label: 'Capabilities',
      queries: {
        brief: "Show a menu of our capabilities including: Services, Markets, Channels.",
        detailed: "Provide a detailed breakdown of our capabilities, organized by: 1. Services Offered 2. Market Expertise 3. Channel Capabilities 4. Technical Specialties"
      }
    }
  ];

  function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const name = sender === 'bot' ? 'Bot' : 'You';
    messageDiv.innerHTML = `<strong class="bot-name">${name}:</strong> ${text.replace(/\n/g, '<br>')}`;
    
    // Add copy button only for bot messages (not user messages)
    if (sender === 'bot') {
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.title = 'Copy to clipboard';
      copyButton.ariaLabel = 'Copy to clipboard';
      copyButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 3H4C3.45 3 3 3.45 3 4V16C3 16.55 3.45 17 4 17H16C16.55 17 17 16.55 17 16V4C17 3.45 16.55 3 16 3ZM15 15H5V5H15V15ZM19 7V19C19 19.55 18.55 20 18 20H6V18H18V7H19Z" fill="currentColor"/></svg>';
      copyButton.onclick = () => {
        navigator.clipboard.writeText(text);
      };
      messageDiv.appendChild(copyButton);
    }
    
    // Make sure we're appending to the DOM only once
    chatLogRef.current.appendChild(messageDiv);
    chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }

  const fetchResponse = async (query) => {
    try {
      // Construct enhanced message with both modifiers when applicable
      let enhancedQuery = query;
      
      // Add query type modifier
      if (queryType === 'contact') {
        enhancedQuery = `[Unless I have told you otherwise, please only provide the contact details of the sales rep/s for vendors relevant to my query.] ${enhancedQuery}`;
      } else if (queryType === 'deck') {
        enhancedQuery = `[Unless I have told you otherwise, please only provide filenames and Google Drive links for relevant documents] ${enhancedQuery}`;
      }
      
      // Add timeframe modifier
      if (timeframe === 'recent') {
        enhancedQuery = `[Only deliver results within the last 12 months] ${enhancedQuery}`;
      }
      
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: enhancedQuery,
          sessionId: sessionId
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      addMessage(data.response, 'bot');
    } catch (error) {
      console.error('Error:', error);
      addMessage('Sorry, I encountered an error. Please try again.', 'bot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    setIsLoading(true);
    addMessage(message, 'user');
    setMessage('');
    await fetchResponse(message);
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
    // Remove intro phrases and clean up extra lines
    const cleanText = text
      .replace(/^Here's (a |the |an )?(detailed |brief |quick )?(?:overview|summary|breakdown|description) of .+?:\n*/i, '')
      .replace(/^Let me .+?:\n*/i, '')
      .replace(/^Here are .+?:\n*/i, '')
      .replace(/^\n+|\n+$/g, '') // Remove leading/trailing newlines
      // Format headers with specific styling
      .replace(/^# (.+)$/gm, '<h1 class="main-title">$1</h1>')
      .replace(/^## (.+)$/gm, '<h2 class="section-header">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 class="tertiary-header">$1</h3>')
      // Format bullet points with bold headers
      .replace(/^• \*\*([^*]+)\*\*: (.+)$/gm, '<li><strong>$1</strong>: $2</li>')
      // Handle regular bullet points
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      // Handle remaining bold text
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // First handle markdown style links: [text](url)
    let textWithLinks = cleanText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const fullUrl = url.startsWith('http') ? url : url.startsWith('www.') ? `https://${url}` : `https://${url}`;
      return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="message-link">${linkText}</a>`;
    });
    
    // Handle text like "You can view it on Slack [here](...)" or similar patterns
    textWithLinks = textWithLinks.replace(/(\S+)\s+\[([^\]]+)\]\s*\(([^)]+)\)/g, (match, precedingWord, linkText, url) => {
      const fullUrl = url.startsWith('http') ? url : url.startsWith('www.') ? `https://${url}` : `https://${url}`;
      return `${precedingWord} <a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="message-link">${linkText}</a>`;
    });

    // Then handle any remaining plain URLs
    const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\w+\.(?:com|org|net|edu|gov|io|vercel\.app)[^\s,.:;'")`]*)/g;
    textWithLinks = textWithLinks.replace(urlRegex, (url) => {
      // Don't process URLs that are already in an anchor tag
      if (url.includes('<a href=')) return url;
      
      const fullUrl = url.startsWith('http') ? url : url.startsWith('www.') ? `https://${url}` : `https://${url}`;
      
      // Only transform Slack and Google Drive links to "Here"
      if (fullUrl.includes('slack.com/files') || 
          fullUrl.includes('drive.google.com')) {
        return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="message-link">Here</a>`;
      }
      
      // Keep other URLs as they are (like walmart.com)
      return `<a href="${fullUrl}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
    });

    // Split into paragraphs and handle bullet points
    const paragraphs = textWithLinks.split('\n\n').filter(para => para.trim());
    
    return paragraphs.map(para => {
      if (para.startsWith('<h1') || para.startsWith('<h2') || para.startsWith('<h3')) {
        return para;
      }
      if (para.includes('<li>')) {
        return `<ul class="custom-list">${para}</ul>`;
      }
      return `<p>${para}</p>`;
    }).join('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  // Replace the loading dots with animated dots
  const LoadingDots = () => (
    <div className="loading-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );

  const copyToClipboard = (text) => {
    // Remove HTML tags and decode entities for clean copying
    const cleanText = text.replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    navigator.clipboard.writeText(cleanText);
  };

  const handleButtonClick = (buttonType) => {
    setActiveButton(buttonType);
    setIsLoading(true);
    
    let query = '';
    switch (buttonType) {
      case 'relevant_experience':
        query = "Provide a comprehensive overview of our most relevant experience, focusing on key projects and achievements that demonstrate our expertise.";
        break;
      case 'case_studies':
        query = "Share detailed case studies of our most successful projects, including objectives, approach, and measurable outcomes.";
        break;
      case 'capabilities':
        query = "Outline our core capabilities and services, including our technical expertise, industry specializations, and unique value propositions.";
        break;
    }
    
    addMessage(query, 'user');
    fetchResponse(query);
  };

  const CopyIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 3H4C3.45 3 3 3.45 3 4V16C3 16.55 3.45 17 4 17H16C16.55 17 17 16.55 17 16V4C17 3.45 16.55 3 16 3ZM15 15H5V5H15V15ZM19 7V19C19 19.55 18.55 20 18 20H6V18H18V7H19Z" 
        fill="currentColor"/>
    </svg>
  );

  return (
    <>
      <Head>
        <title>Vendor GPT</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="main-content">
        <div className="header">
          <div className="header-text">
            <h1>Vendor GPT</h1>
            <p className="tagline">Your Noble Librarian</p>
          </div>
        </div>

        <div className="chat-container">
          <div id="chat-log" ref={chatLogRef}>
            {chatLog.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <strong className={msg.sender === 'bot' ? 'assistant-name' : 'user-name'}>
                  {msg.sender === 'bot' ? 'Assistant' : 'You'}:
                </strong>
                <span dangerouslySetInnerHTML={{ 
                  __html: formatMessage(msg.text)
                }} />
              </div>
            ))}
          </div>

          <div className="input-area">
            <div className="input-controls">
              <input
                id="user-input"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your message..."
                ref={inputRef}
              />
              <div className="response-toggles">
                <div className="response-mode">
                  <button 
                    className={`mode-button ${queryType === 'general' ? 'active' : ''}`}
                    onClick={() => setQueryType('general')}
                  >
                    General
                  </button>
                  <button 
                    className={`mode-button ${queryType === 'contact' ? 'active' : ''}`}
                    onClick={() => setQueryType('contact')}
                  >
                    Contact
                  </button>
                  <button 
                    className={`mode-button ${queryType === 'deck' ? 'active' : ''}`}
                    onClick={() => setQueryType('deck')}
                  >
                    Deck
                  </button>
                </div>
                <div className="centered-toggle-row">
                  <button 
                    className={`mode-button ${timeframe === 'all' ? 'active' : ''}`}
                    onClick={() => setTimeframe('all')}
                  >
                    All
                  </button>
                  <button 
                    className={`mode-button ${timeframe === 'recent' ? 'active' : ''}`}
                    onClick={() => setTimeframe('recent')}
                  >
                    Recent
                  </button>
                </div>
              </div>
              <button 
                id="send-btn"
                onClick={handleSend}
                disabled={isLoading}
              >
                {isLoading ? <LoadingDots /> : 'Send'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 
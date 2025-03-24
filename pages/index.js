import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { formatMessage } from '../utils/formatMessage';

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
  const [showInitialText, setShowInitialText] = useState(true);

  console.log("Component mounted");

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  useEffect(() => {
    chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [chatLog]);

  useEffect(() => {
    console.log("showInitialText:", showInitialText);
  }, [showInitialText]);

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

  const addMessage = (text, sender) => {
    // Hide initial text when a message is added
    if (showInitialText) {
      setShowInitialText(false);
    }
    
    // No need to process text here anymore since it's pre-formatted by the API
    setChatLog(prevLog => [...prevLog, { text, sender }]);
  };

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

  const CopyIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 3H4C3.45 3 3 3.45 3 4V16C3 16.55 3.45 17 4 17H16C16.55 17 17 16.55 17 16V4C17 3.45 16.55 3 16 3ZM15 15H5V5H15V15ZM19 7V19C19 19.55 18.55 20 18 20H6V18H18V7H19Z" 
        fill="currentColor"/>
    </svg>
  );

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

  console.log("Rendering with showInitialText:", showInitialText);
  console.log("Chat log length:", chatLog.length);

  const styles = {
    welcomeContainer: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      color: 'white',
      animation: 'fadeIn 0.5s ease-in-out',
    },
    welcomeHeader: {
      marginBottom: '20px',
      textAlign: 'center',
    },
    welcomeHeaderTitle: {
      fontSize: '28px',
      fontWeight: '600',
      background: 'linear-gradient(90deg, #e0c3fc 0%, #8ec5fc 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: '0 0 5px 0',
    },
    dataSource: {
      fontSize: '14px',
      opacity: '0.8',
      margin: '0',
      fontStyle: 'italic',
    },
    // Add more styles as needed
  };

  return (
    <>
      <Head>
        <title>Vendor Vault</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Video Background */}
      <div className="video-background">
        <video autoPlay muted loop playsInline>
          <source src="/background-gradient.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="main-content">
        <div className="header">
          <div className="header-text">
            <h1>Vendor Vault</h1>
            <p className="tagline">Noble People's Archival Vendor Assistant</p>
          </div>
        </div>

        <div className="chat-container glass-container">
          <div id="chat-log" ref={chatLogRef} className="chat-log-container">
            {showInitialText ? (
              <div className="welcome-container">
                <div className="welcome-header">
                  <p>Let me traul through all of the media kits and vendor contacts that have been dumped into Slack over the years.</p>
                  <h2 className="helper-text">Here's how I can help:</h2>
                </div>
                <div className="welcome-content">
                  <div className="mode-cards">
                    <div className="mode-card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div className="mode-icon general-icon" style={{ minWidth: '40px', width: '40px', height: '40px' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z" fill="currentColor"/>
                        </svg>
                      </div>
                      <h3 style={{ margin: '0', minWidth: '70px', whiteSpace: 'nowrap' }}>General</h3>
                      <p style={{ margin: '0', flex: '1' }}>Vendor info, capabilities & projects</p>
                    </div>
                    
                    <div className="mode-card">
                      <div className="mode-icon contact-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 6C13.1 6 14 6.9 14 8C14 9.1 13.1 10 12 10C10.9 10 10 9.1 10 8C10 6.9 10.9 6 12 6ZM12 15C14.7 15 17.8 16.29 18 17V18H6V17.01C6.2 16.29 9.3 15 12 15ZM12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4ZM12 13C9.33 13 4 14.34 4 17V20H20V17C20 14.34 14.67 13 12 13Z" fill="currentColor"/>
                        </svg>
                      </div>
                      <h3>Contact</h3>
                      <p>Get vendor rep contact details</p>
                    </div>
                    
                    <div className="mode-card">
                      <div className="mode-icon deck-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 10H9V17H7V10ZM11 7H13V17H11V7ZM15 13H17V17H15V13Z" fill="currentColor"/>
                        </svg>
                      </div>
                      <h3>Deck</h3>
                      <p>Find vendor presentations & docs</p>
                    </div>
                  </div>
                  <div className="welcome-footer">
                    <div className="timeframe-toggle">
                      <div className="toggle-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M11.99 2C6.47 2 2 6.48 2 12C2 17.52 6.47 22 11.99 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 11.99 2ZM12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20ZM12.5 7H11V13L16.25 16.15L17 14.92L12.5 12.25V7Z" fill="currentColor"/>
                        </svg>
                      </div>
                      <h3>Recent</h3>
                       <p>decks uploaded within last 12 months</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {console.log("Conditional rendering check:", showInitialText ? "showing initial text" : "showing chat log")}
                {chatLog.map((msg, index) => (
                  <div key={index} className={`message ${msg.sender}`}>
                    <strong className={msg.sender === 'bot' ? 'assistant-name' : 'user-name'}>
                      {msg.sender === 'bot' ? 'Assistant' : 'You'}:
                    </strong>
                    <div className="message-content">
                      <span dangerouslySetInnerHTML={{ __html: msg.text }} />
                      {msg.sender === 'bot' && (
                        <button 
                          className="copy-button" 
                          onClick={() => copyToClipboard(msg.text)}
                          title="Copy to clipboard"
                        >
                          <CopyIcon />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
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
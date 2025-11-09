import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const inputRef = useRef(null);
  const chatLogRef = useRef(null);
  const [queryType, setQueryType] = useState('general');
  const [timeframe, setTimeframe] = useState('all');
  const [showInitialText, setShowInitialText] = useState(true);

  useEffect(() => {
    inputRef.current.focus();
  }, []);

  useEffect(() => {
    chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [chatLog]);

  const addMessage = (text, sender) => {
    // Hide initial text when a message is added
    if (showInitialText) {
      setShowInitialText(false);
    }
    
    setChatLog(prevLog => [...prevLog, { text, sender }]);
  };

  const setQueryTypeHandler = (type) => {
    // Map UI button values to backend query types
    if (type === 'contact') {
      setQueryType('contact');
    } else if (type === 'deck') {
      setQueryType('deck');
    } else {
      setQueryType('general');
    }
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  // Loading animation component
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

  return (
    <>
      <Head>
        <title>Stalker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style dangerouslySetInnerHTML={{ __html: `
          /* Force critical style fixes */
          .message.user {
            background-color: rgba(0, 20, 0, 0.9) !important;
            border: 1px solid rgba(0, 255, 0, 0.3) !important;
            border-radius: 4px !important;
            overflow: hidden !important;
          }
          
          .message.bot {
            background-color: #d4dcd9 !important;
            border: 1px solid rgba(221, 221, 221, 0.3) !important;
            border-radius: 4px !important;
            overflow: hidden !important;
          }
          
          .user-name {
            color: rgba(0, 255, 0, 0.9) !important;
            font-weight: bold !important;
          }
          
          .assistant-name {
            color: #052a03 !important;
            font-weight: bold !important;
          }
          
          #user-input, .mode-button, #send-btn {
            border-radius: 4px !important;
          }
        `}} />
      </Head>

      {/* Video Background */}
      <div className="video-background">
        <video autoPlay muted loop playsInline className="noir-filter">
          <source src="/background-gradient.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="main-content">
        <div className="header">
          <img src="/Stalker-fixed.png" alt="Stalker Logo" className="logo" />
        </div>

        <div className="chat-container" style={{
          position: 'relative',
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(0, 255, 0, 0.3)',
          borderRadius: '4px',
          padding: '1rem',
          boxShadow: '0 0 15px rgba(0, 0, 0, 0.7)',
          minHeight: 'auto',
          height: 'auto',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div id="chat-log" ref={chatLogRef} className="chat-log-container">
            {showInitialText ? (
              <div className="spy-search-container" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0',
                margin: '0'
              }}>
                <div className="main-console" style={{
                  width: '100%',
                  maxWidth: '650px',
                  marginBottom: '0'
                }}>
                  <div className="input-controls" style={{
                    display: 'flex',
                    gap: '10px',
                    width: '100%',
                    alignItems: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <input
                      id="user-input"
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your surveillance request..."
                      ref={inputRef}
                      autoFocus
                      style={{
                        flex: '1',
                        padding: '10px 15px',
                        border: '1px solid rgba(0, 255, 0, 0.5)',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        color: 'rgb(0, 255, 0)',
                        fontFamily: 'Courier Prime, monospace',
                        outline: 'none'
                      }}
                    />
                    <button 
                      id="send-btn"
                      onClick={handleSend}
                      disabled={isLoading}
                      style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'rgb(0, 255, 0)',
                        border: '1px solid rgba(0, 255, 0, 0.5)',
                        borderRadius: '4px',
                        padding: '10px 15px',
                        fontFamily: 'Courier Prime, monospace',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontSize: '0.75em'
                      }}
                    >
                      SEND
                    </button>
                  </div>
                  <div className="response-toggles" style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    width: '100%',
                    marginBottom: '0'
                  }}>
                    <div className="response-mode" style={{
                      display: 'flex',
                      width: '100%',
                      gap: '2px',
                      marginBottom: '2px'
                    }}>
                      <button 
                        className={`mode-button ${queryType === 'general' ? 'active' : ''}`}
                        onClick={() => setQueryTypeHandler('general')}
                        style={{
                          flex: '1',
                          textAlign: 'center',
                          backgroundColor: queryType === 'general' ? 'rgba(0, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          color: queryType === 'general' ? '#00FF00' : 'rgba(0, 255, 0, 0.7)',
                          border: '1px solid rgba(0, 255, 0, 0.4)',
                          borderRadius: '4px',
                          padding: '6px 15px',
                          fontSize: '0.7em',
                          cursor: 'pointer',
                          fontFamily: 'Courier Prime, monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}
                      >
                        GENERAL
                      </button>
                      <button 
                        className={`mode-button ${queryType === 'contact' ? 'active' : ''}`}
                        onClick={() => setQueryTypeHandler('contact')}
                        style={{
                          flex: '1',
                          textAlign: 'center',
                          backgroundColor: queryType === 'contact' ? 'rgba(0, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          color: queryType === 'contact' ? '#00FF00' : 'rgba(0, 255, 0, 0.7)',
                          border: '1px solid rgba(0, 255, 0, 0.4)',
                          borderRadius: '4px',
                          padding: '6px 15px',
                          fontSize: '0.7em',
                          cursor: 'pointer',
                          fontFamily: 'Courier Prime, monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}
                      >
                        CONTACT
                      </button>
                      <button 
                        className={`mode-button ${queryType === 'deck' ? 'active' : ''}`}
                        onClick={() => setQueryTypeHandler('deck')}
                        style={{
                          flex: '1',
                          textAlign: 'center',
                          backgroundColor: queryType === 'deck' ? 'rgba(0, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          color: queryType === 'deck' ? '#00FF00' : 'rgba(0, 255, 0, 0.7)',
                          border: '1px solid rgba(0, 255, 0, 0.4)',
                          borderRadius: '4px',
                          padding: '6px 15px',
                          fontSize: '0.7em',
                          cursor: 'pointer',
                          fontFamily: 'Courier Prime, monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}
                      >
                        DOSSIER
                      </button>
                    </div>
                    <div className="response-mode" style={{
                      display: 'flex',
                      width: '100%',
                      gap: '2px',
                      marginBottom: '2px'
                    }}>
                      <button 
                        className={`mode-button ${timeframe === 'all' ? 'active' : ''}`}
                        onClick={() => setTimeframe('all')}
                        style={{
                          flex: '1',
                          textAlign: 'center',
                          backgroundColor: timeframe === 'all' ? 'rgba(0, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          color: timeframe === 'all' ? '#00FF00' : 'rgba(0, 255, 0, 0.7)',
                          border: '1px solid rgba(0, 255, 0, 0.4)',
                          borderRadius: '4px',
                          padding: '6px 15px',
                          fontSize: '0.7em',
                          cursor: 'pointer',
                          fontFamily: 'Courier Prime, monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}
                      >
                        ALL
                      </button>
                      <button 
                        className={`mode-button ${timeframe === 'recent' ? 'active' : ''}`}
                        onClick={() => setTimeframe('recent')}
                        style={{
                          flex: '1',
                          textAlign: 'center',
                          backgroundColor: timeframe === 'recent' ? 'rgba(0, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                          color: timeframe === 'recent' ? '#00FF00' : 'rgba(0, 255, 0, 0.7)',
                          border: '1px solid rgba(0, 255, 0, 0.4)',
                          borderRadius: '4px',
                          padding: '6px 15px',
                          fontSize: '0.7em',
                          cursor: 'pointer',
                          fontFamily: 'Courier Prime, monospace',
                          textTransform: 'uppercase',
                          letterSpacing: '1px'
                        }}
                      >
                        RECENT
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {chatLog.map((msg, index) => (
                  <div key={index} className={`message ${msg.sender}`} style={{
                    backgroundColor: msg.sender === 'user' ? 'rgba(0, 20, 0, 0.9)' : '#d4dcd9',
                    border: msg.sender === 'user' ? '1px solid rgba(0, 255, 0, 0.3)' : '1px solid rgba(221, 221, 221, 0.3)',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    padding: '0',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <strong 
                      className={msg.sender === 'bot' ? 'assistant-name' : 'user-name'}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        [msg.sender === 'bot' ? 'left' : 'right']: '15px',
                        color: msg.sender === 'bot' ? '#052a03' : 'rgba(0, 255, 0, 0.9)',
                        fontFamily: 'Courier Prime, monospace',
                        fontSize: '0.75em',
                        textTransform: 'uppercase',
                        fontWeight: 'bold',
                        zIndex: '10'
                      }}
                    >
                      {msg.sender === 'bot' ? 'SYSTEM:' : 'AGENT:'}
                    </strong>
                    <div className="message-content" style={{
                      color: msg.sender === 'user' ? '#0fce09' : '#083f06',
                      background: 'none',
                      border: 'none',
                      fontFamily: 'Courier Prime, monospace',
                      padding: '30px 15px 15px 15px',
                      boxShadow: 'none',
                      fontSize: '1em',
                      lineHeight: '1.5',
                      margin: '0',
                      textAlign: msg.sender === 'user' ? 'right' : 'left'
                    }}>
                      <span style={{
                        color: msg.sender === 'user' ? '#0fce09' : '#083f06',
                        fontFamily: 'Courier Prime, monospace',
                        fontSize: '1em',
                        display: 'inline-block',
                        textAlign: msg.sender === 'user' ? 'right' : 'left'
                      }} dangerouslySetInnerHTML={{ __html: msg.text }} />
                      {msg.sender === 'bot' && (
                        <button 
                          className="copy-button" 
                          onClick={() => copyToClipboard(msg.text)}
                          title="Copy to clipboard"
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '10px',
                            background: 'transparent',
                            border: 'none',
                            opacity: '0.7',
                            width: '16px',
                            height: '16px',
                            padding: '0',
                            zIndex: '10'
                          }}
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

          {!showInitialText && (
            <div className="input-area" style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              borderTop: '1px solid rgba(0, 255, 0, 0.3)',
              padding: '15px',
              width: '100%'
            }}>
              <div className="input-controls" style={{
                display: 'flex',
                gap: '10px',
                width: '100%',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <input
                  id="user-input"
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your surveillance request..."
                  ref={inputRef}
                  autoFocus
                  style={{
                    flex: '1',
                    padding: '10px 15px',
                    border: '1px solid rgba(0, 255, 0, 0.5)',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'rgb(0, 255, 0)',
                    fontFamily: 'Courier Prime, monospace',
                    outline: 'none'
                  }}
                />
                <button 
                  id="send-btn"
                  onClick={handleSend}
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'rgb(0, 255, 0)',
                    border: '1px solid rgba(0, 255, 0, 0.5)',
                    borderRadius: '4px',
                    padding: '10px 15px',
                    fontFamily: 'Courier Prime, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontSize: '0.75em'
                  }}
                >
                  {isLoading ? <LoadingDots /> : 'SEND'}
                </button>
              </div>
              <div className="response-toggles" style={{
                marginTop: '0.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                width: '100%',
                marginBottom: '0'
              }}>
                <div className="response-mode" style={{
                  display: 'flex',
                  width: '100%',
                  gap: '2px',
                  marginBottom: '2px'
                }}>
                  <button 
                    className={`mode-button ${queryType === 'general' ? 'active' : ''}`}
                    onClick={() => setQueryTypeHandler('general')}
                    style={{
                      flex: '1',
                      textAlign: 'center',
                      backgroundColor: queryType === 'general' ? 'rgba(0, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      color: queryType === 'general' ? '#00FF00' : 'rgba(0, 255, 0, 0.7)',
                      border: '1px solid rgba(0, 255, 0, 0.4)',
                      borderRadius: '4px',
                      padding: '6px 15px',
                      fontSize: '0.7em',
                      cursor: 'pointer',
                      fontFamily: 'Courier Prime, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    GENERAL
                  </button>
                  <button 
                    className={`mode-button ${queryType === 'contact' ? 'active' : ''}`}
                    onClick={() => setQueryTypeHandler('contact')}
                    style={{
                      flex: '1',
                      textAlign: 'center',
                      backgroundColor: queryType === 'contact' ? 'rgba(0, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      color: queryType === 'contact' ? '#00FF00' : 'rgba(0, 255, 0, 0.7)',
                      border: '1px solid rgba(0, 255, 0, 0.4)',
                      borderRadius: '4px',
                      padding: '6px 15px',
                      fontSize: '0.7em',
                      cursor: 'pointer',
                      fontFamily: 'Courier Prime, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    CONTACT
                  </button>
                  <button 
                    className={`mode-button ${queryType === 'deck' ? 'active' : ''}`}
                    onClick={() => setQueryTypeHandler('deck')}
                    style={{
                      flex: '1',
                      textAlign: 'center',
                      backgroundColor: queryType === 'deck' ? 'rgba(0, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      color: queryType === 'deck' ? '#00FF00' : 'rgba(0, 255, 0, 0.7)',
                      border: '1px solid rgba(0, 255, 0, 0.4)',
                      borderRadius: '4px',
                      padding: '6px 15px',
                      fontSize: '0.7em',
                      cursor: 'pointer',
                      fontFamily: 'Courier Prime, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    DOSSIER
                  </button>
                </div>
                <div className="response-mode" style={{
                  display: 'flex',
                  width: '100%',
                  gap: '2px',
                  marginBottom: '2px'
                }}>
                  <button 
                    className={`mode-button ${timeframe === 'all' ? 'active' : ''}`}
                    onClick={() => setTimeframe('all')}
                    style={{
                      flex: '1',
                      textAlign: 'center',
                      backgroundColor: timeframe === 'all' ? 'rgba(0, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      color: timeframe === 'all' ? '#00FF00' : 'rgba(0, 255, 0, 0.7)',
                      border: '1px solid rgba(0, 255, 0, 0.4)',
                      borderRadius: '4px',
                      padding: '6px 15px',
                      fontSize: '0.7em',
                      cursor: 'pointer',
                      fontFamily: 'Courier Prime, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    ALL
                  </button>
                  <button 
                    className={`mode-button ${timeframe === 'recent' ? 'active' : ''}`}
                    onClick={() => setTimeframe('recent')}
                    style={{
                      flex: '1',
                      textAlign: 'center',
                      backgroundColor: timeframe === 'recent' ? 'rgba(0, 40, 0, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      color: timeframe === 'recent' ? '#00FF00' : 'rgba(0, 255, 0, 0.7)',
                      border: '1px solid rgba(0, 255, 0, 0.4)',
                      borderRadius: '4px',
                      padding: '6px 15px',
                      fontSize: '0.7em',
                      cursor: 'pointer',
                      fontFamily: 'Courier Prime, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    RECENT
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 
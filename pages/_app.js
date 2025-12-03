import '../styles/globals.css';
import '../styles/welcome.css';
import '../styles/chat.css';
import { useEffect } from 'react';
import { trackPageView } from '../utils/ecosystemAnalytics';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    trackPageView(window.location.pathname, document.title);
  }, []);
  
  return <Component {...pageProps} />;
} 
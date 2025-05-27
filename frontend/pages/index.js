import { useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [messages, setMessages] = useState([]);

  const handleSend = async (text) => {
    // display user message immediately
    setMessages((msgs) => [...msgs, { text, sender: 'user' }]);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();
      if (data.message) {
        setMessages((msgs) => [...msgs, { text: data.message, sender: 'assistant' }]);
      }
    } catch (err) {
      console.error('Chat error', err);
      setMessages((msgs) => [...msgs, { text: 'Error: failed to get response', sender: 'system' }]);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>LeadGen Chat</h1>
      <ChatWindow messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}

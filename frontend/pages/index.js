import { useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';
import styles from '../styles/Home.module.css';

export default function Home() {
  const [messages, setMessages] = useState([]);

  const handleSend = (text) => {
    setMessages([...messages, { text, sender: 'user' }]);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>LeadGen Chat</h1>
      <ChatWindow messages={messages} />
      <ChatInput onSend={handleSend} />
    </div>
  );
}

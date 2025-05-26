import { useState } from 'react';

export default function ChatInput({ onSend }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex' }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ flex: 1, padding: '0.5rem' }}
        placeholder="Type a message"
      />
      <button type="submit" style={{ padding: '0.5rem 1rem' }}>Send</button>
    </form>
  );
}

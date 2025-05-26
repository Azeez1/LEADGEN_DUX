export default function ChatWindow({ messages }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', border: '1px solid #ccc', marginBottom: '1rem' }}>
      {messages.map((msg, idx) => (
        <div key={idx} style={{ marginBottom: '0.5rem' }}>
          <strong>{msg.sender}: </strong>{msg.text}
        </div>
      ))}
    </div>
  );
}

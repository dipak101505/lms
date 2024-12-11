import { useState, useEffect, useRef } from 'react';
import { getDatabase, ref, push, onValue, off, serverTimestamp, remove } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';

function Chat() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const db = getDatabase();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Reference to the messages in the database
    const messagesRef = ref(db, 'messages');
    
    // Send join message when component mounts
    if (user) {
      const firstName = user.email.split('@')[0];
        push(messagesRef, {
        type: 'system',
        text: `${firstName} joined`,
        timestamp: serverTimestamp(),
      });
    }

    // Listen for new messages
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        setMessages(messageList);
        scrollToBottom();
      }
    });

    // Cleanup listener when component unmounts
    return () => {
      off(messagesRef);
    };
  }, [db, user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messagesRef = ref(db, 'messages');
    push(messagesRef, {
      type: 'user',
      text: newMessage,
      sender: user.email,
      timestamp: serverTimestamp(),
    });

    setNewMessage('');
  };

  const clearAllMessages = async () => {
    const db = getDatabase();
    const messagesRef = ref(db, 'messages');
    await remove(messagesRef);
  };

  Chat.clearMessages = clearAllMessages;

  return (
    <div style={{
      marginTop: '20px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <div style={{
        height: '300px',
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#fff'
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              marginBottom: '8px',
              padding: '8px',
              borderRadius: '6px',
              backgroundColor: message.type === 'system' ? '#f7fafc' : 
                message.sender === user?.email ? '#e6fffa' : '#f0f9ff'
            }}
          >
            {message.type === 'system' ? (
              <div style={{ color: '#718096', fontSize: '14px', textAlign: 'center' }}>
                {message.text}
              </div>
            ) : (
              <>
                <div style={{ fontSize: '12px', color: '#718096' }}>
                  {message.sender.split('@')[0]}
                </div>
                <div style={{ marginTop: '4px' }}>{message.text}</div>
              </>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0'
      }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #e2e8f0',
            marginRight: '8px'
          }}
        />
        <button
          type="submit"
          style={{
            padding: '8px',
            width: '36px',
            height: '36px',
            backgroundColor: '#ffa600',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </form>
    </div>
  );
}

export default Chat;
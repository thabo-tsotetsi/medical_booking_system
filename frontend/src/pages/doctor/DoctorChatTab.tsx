import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';

interface Conversation {
  id: string;
  subject: string;
  last_message?: string;
  last_message_at?: string;
  patient_first_name?: string;
  patient_last_name?: string;
}

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
}

export default function DoctorChatTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find((c) => c.id === selectedId);

  useEffect(() => {
    api.get('/chat/conversations').then((res) => setConversations(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    api.get(`/chat/conversations/${selectedId}/messages`).then((res) => setMessages(res.data));
  }, [selectedId]);

  // Simple polling for new messages while viewing a conversation
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => {
      api.get(`/chat/conversations/${selectedId}/messages`).then((res) => setMessages(res.data));
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedId) return;
    setSending(true);
    try {
      const { data } = await api.post(`/chat/conversations/${selectedId}/messages`, { content: newMessage.trim() });
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
    } finally {
      setSending(false);
    }
  };

  const displayName = selectedConv
    ? `${selectedConv.patient_first_name} ${selectedConv.patient_last_name}`
    : '';

  return (
    <div>
      <h2>Patient queries</h2>
      <p style={{ color: '#666', marginBottom: '1rem' }}>View and respond to messages from patients.</p>
      <div className="chat-layout">
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">Conversations</div>
          <div className="chat-conversation-list">
            {loading ? (
              <p style={{ padding: '1rem' }}>Loading...</p>
            ) : conversations.length === 0 ? (
              <p style={{ padding: '1rem' }}>No patient messages yet.</p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  className={`chat-conversation-item ${selectedId === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(c.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId(c.id)}
                >
                  <div className="avatar">{c.patient_first_name?.[0]}{c.patient_last_name?.[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name">{c.patient_first_name} {c.patient_last_name}</div>
                    <div className="preview">{c.last_message || c.subject || 'No messages yet'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="chat-main">
          {selectedId ? (
            <>
              <div className="chat-main-header">{displayName}</div>
              <div className="chat-messages">
                {messages.map((m) => (
                  <div key={m.id} className={`chat-message ${m.sender_type === 'doctor' ? 'sent' : 'received'}`}>
                    <div>{m.content}</div>
                    <div className="time">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form className="chat-input-area" onSubmit={sendMessage}>
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your response..."
                  disabled={sending}
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !newMessage.trim()}>Send</button>
              </form>
            </>
          ) : (
            <div className="chat-empty">Select a conversation to view and respond.</div>
          )}
        </div>
      </div>
    </div>
  );
}

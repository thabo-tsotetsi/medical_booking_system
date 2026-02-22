import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';

interface Conversation {
  id: string;
  subject: string;
  last_message?: string;
  last_message_at?: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  doctor_title?: string;
  specialty_name?: string;
  patient_first_name?: string;
  patient_last_name?: string;
}

interface Message {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
}

interface Doctor {
  id: string;
  first_name: string;
  last_name: string;
  title?: string;
  specialty_name?: string;
}

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const doctorIdFromUrl = searchParams.get('doctorId');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(!!doctorIdFromUrl);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasHandledDoctorId = useRef(false);

  const selectedConv = conversations.find((c) => c.id === selectedId);

  useEffect(() => {
    api.get('/chat/conversations').then((res) => setConversations(res.data)).finally(() => setLoading(false));
    api.get('/users/doctors').then((res) => setDoctors(res.data));
  }, []);

  useEffect(() => {
    if (!doctorIdFromUrl || loading || hasHandledDoctorId.current) return;
    hasHandledDoctorId.current = true;
    api.get('/chat/conversations').then((res) => {
      const list = res.data as (Conversation & { doctor_id?: string })[];
      const existing = list.find((c) => c.doctor_id === doctorIdFromUrl);
      if (existing) {
        setConversations(list);
        setSelectedId(existing.id);
        setShowNewChat(false);
        setSearchParams({});
      } else {
        api.post('/chat/conversations', { doctorId: doctorIdFromUrl })
          .then(({ data }) => {
            setConversations((prev) => [...prev, { id: data.id, subject: '', doctor_id: doctorIdFromUrl } as Conversation & { doctor_id: string }]);
            setSelectedId(data.id);
            setShowNewChat(false);
            setSearchParams({});
          })
          .then(() => api.get('/chat/conversations').then((r) => setConversations(r.data)))
          .catch(() => setSearchParams({}));
      }
    });
  }, [doctorIdFromUrl, loading, setSearchParams]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    api.get(`/chat/conversations/${selectedId}/messages`).then((res) => setMessages(res.data));
  }, [selectedId]);

  // Simple polling for new messages while a conversation is open
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

  const startConversation = async (doctorId: string) => {
    setSending(true);
    try {
      const { data } = await api.post('/chat/conversations', { doctorId });
      const convs = await api.get('/chat/conversations').then((r) => r.data);
      setConversations(convs);
      setSelectedId(data.id);
      setShowNewChat(false);
    } finally {
      setSending(false);
    }
  };

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
    ? selectedConv.doctor_first_name
      ? `${selectedConv.doctor_title || ''} ${selectedConv.doctor_first_name} ${selectedConv.doctor_last_name}`.trim()
      : `${selectedConv.patient_first_name} ${selectedConv.patient_last_name}`.trim()
    : '';

  return (
    <div>
      <h1>Messages</h1>
      <div className="chat-layout">
        <div className="chat-sidebar">
          <div className="chat-sidebar-header">
            Chats
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginLeft: 'auto', display: 'block', marginTop: 8 }}
              onClick={() => setShowNewChat(true)}
            >
              New chat
            </button>
          </div>
          {showNewChat ? (
            <div className="chat-conversation-list">
              <div className="chat-sidebar-header" style={{ borderBottom: 0 }}>Select a doctor to message</div>
              {doctors.map((doc) => (
                <div
                  key={doc.id}
                  className="chat-conversation-item"
                  onClick={() => startConversation(doc.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && startConversation(doc.id)}
                >
                  <div className="avatar">{doc.first_name[0]}{doc.last_name[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="name">{doc.title || ''} {doc.first_name} {doc.last_name}</div>
                    <div className="preview">{doc.specialty_name || 'Doctor'}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="chat-conversation-list">
              {loading ? (
                <p style={{ padding: '1rem' }}>Loading...</p>
              ) : conversations.length === 0 ? (
                <p style={{ padding: '1rem' }}>No conversations yet. Start a new chat with a doctor.</p>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`chat-conversation-item ${selectedId === c.id ? 'active' : ''}`}
                    onClick={() => { setSelectedId(c.id); setShowNewChat(false); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && (setSelectedId(c.id), setShowNewChat(false))}
                  >
                    <div className="avatar">
                      {c.doctor_first_name ? c.doctor_first_name[0] : c.patient_first_name?.[0]}
                      {c.doctor_last_name ? c.doctor_last_name[0] : c.patient_last_name?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="name">
                        {c.doctor_first_name ? `${c.doctor_title || ''} ${c.doctor_first_name} ${c.doctor_last_name}`.trim() : `${c.patient_first_name} ${c.patient_last_name}`}
                      </div>
                      <div className="preview">{c.last_message || c.subject || 'No messages yet'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <div className="chat-main">
          {selectedId ? (
            <>
              <div className="chat-main-header">{displayName}</div>
              <div className="chat-messages">
                {messages.map((m) => (
                  <div key={m.id} className={`chat-message ${m.sender_type === 'patient' ? 'sent' : 'received'}`}>
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
                  placeholder="Type a message..."
                  disabled={sending}
                />
                <button type="submit" className="btn btn-primary" disabled={sending || !newMessage.trim()}>Send</button>
              </form>
            </>
          ) : (
            <div className="chat-empty">
              {showNewChat ? 'Select a doctor above to start a conversation.' : 'Select a conversation or start a new chat.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

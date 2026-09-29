import { useEffect, useState } from 'react';
import http from '../api/http';
import { useAuth } from '../context/AuthContext';
import { getAvatarGradient, getInitials, formatTime } from '../utils/avatar';
import { Search, UserPlus, X, MessageSquare, ShieldCheck } from 'lucide-react';

export default function ConversationList({ activeId, onSelect, userStatuses = {} }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  async function loadConversations() {
    try {
      const { data } = await http.get('/users/me/conversations');
      setConversations(data);
    } catch (err) {
      console.error('Lỗi tải danh sách hội thoại:', err);
    }
  }

  useEffect(() => {
    loadConversations();
  }, [activeId]);

  async function handleSearch(e) {
    const q = e.target.value;
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const { data } = await http.get('/users/search', { params: { q } });
      setResults(data);
    } catch (err) {
      console.error('Lỗi tìm kiếm user:', err);
    } finally {
      setIsSearching(false);
    }
  }

  function handleClearSearch() {
    setQuery('');
    setResults([]);
  }

  async function startConversation(targetUserId) {
    try {
      const { data } = await http.post('/conversations', { participantIds: [targetUserId] });
      setQuery('');
      setResults([]);
      await loadConversations();
      onSelect(data._id, data);
    } catch (err) {
      console.error('Lỗi tạo cuộc trò chuyện:', err);
    }
  }

  return (
    <div className="conversation-container">
      {/* Search Header */}
      <div className="conv-search-wrapper">
        <div className="conv-search-input-group">
          <Search size={16} className="search-icon-inside" />
          <input
            className="search-box"
            placeholder="Tìm người dùng để chat..."
            value={query}
            onChange={handleSearch}
          />
          {query && (
            <button className="search-clear-btn" onClick={handleClearSearch} type="button">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {query.trim().length > 0 && (
          <div className="search-results-floating">
            <div className="search-results-head">
              <span>Kết quả tìm kiếm</span>
              {isSearching && <span className="search-loading-dots">Đang tìm...</span>}
            </div>
            {results.length > 0 ? (
              <ul className="search-results-list">
                {results.map((u) => {
                  const isOnline = userStatuses[u._id] === 'online' || u.status === 'online';
                  return (
                    <li key={u._id} onClick={() => startConversation(u._id)} className="search-user-item">
                      <div
                        className="user-avatar-circle mini"
                        style={{ background: getAvatarGradient(u.username) }}
                      >
                        {getInitials(u.username)}
                        <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                      </div>
                      <div className="search-user-info">
                        <span className="search-user-name">{u.username}</span>
                        <span className="search-user-status">
                          {isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                        </span>
                      </div>
                      <button className="btn-chat-action">
                        <UserPlus size={14} />
                        <span>Nhắn</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : !isSearching ? (
              <div className="search-empty-state">
                <span>Không tìm thấy người dùng "{query}"</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="conversation-list-scroll">
        <div className="conv-section-title">
          <span>Hội thoại ({conversations.length})</span>
          <span className="conv-badge-tag"><ShieldCheck size={12} /> E2E</span>
        </div>

        {conversations.length === 0 ? (
          <div className="conversations-empty">
            <div className="conv-empty-icon">
              <MessageSquare size={32} />
            </div>
            <p className="conv-empty-text">Chưa có cuộc trò chuyện nào</p>
            <p className="conv-empty-hint">Hãy tìm kiếm bạn bè bằng thanh tìm kiếm ở trên để bắt đầu trò chuyện bảo mật.</p>
          </div>
        ) : (
          <ul className="conversations-ul">
            {conversations.map((c) => {
              // Tìm người đối thoại (không phải chính mình)
              const other = c.participants.find((p) => p._id !== user?._id) || c.participants[0];
              const displayName = c.type === 'group' ? c.name : (other?.username || '(Người dùng đã xóa)');
              const isOnline = other ? (userStatuses[other._id] === 'online' || other.status === 'online') : false;
              const isActive = c._id === activeId;

              return (
                <li
                  key={c._id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelect(c._id, c)}
                >
                  <div
                    className="user-avatar-circle"
                    style={{ background: getAvatarGradient(displayName) }}
                  >
                    {getInitials(displayName)}
                    <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                  </div>

                  <div className="conv-item-content">
                    <div className="conv-item-top">
                      <span className="conv-item-name">{displayName}</span>
                      {c.lastMessageAt && (
                        <span className="conv-item-time">{formatTime(c.lastMessageAt)}</span>
                      )}
                    </div>
                    <div className="conv-item-sub">
                      <span className="conv-sub-text">
                        {isOnline ? 'Đang hoạt động' : 'Được mã hóa E2E'}
                      </span>
                    </div>
                  </div>
                  {isActive && <div className="active-highlight-bar" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

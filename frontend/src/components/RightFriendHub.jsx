import { useState, useEffect } from 'react';
import http from '../api/http';
import { getSocket } from '../api/socket';
import { getAvatarGradient, getInitials, formatTime } from '../utils/avatar';
import {
  Users,
  UserCheck,
  Inbox,
  Send,
  UserPlus,
  MessageSquare,
  ShieldCheck,
  Check,
  X,
  Clock,
  Search,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function RightFriendHub({ onStartChat, userStatuses = {}, onOpenCreateGroup }) {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'friends' | 'find' | 'sent'
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [notificationMsg, setNotificationMsg] = useState('');

  async function loadData() {
    try {
      const [reqRes, friendRes] = await Promise.all([
        http.get('/friends/requests'),
        http.get('/friends/list'),
      ]);
      setReceivedRequests(reqRes.data.received || []);
      setSentRequests(reqRes.data.sent || []);
      setFriendsList(friendRes.data || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu bạn bè:', err);
    }
  }

  useEffect(() => {
    loadData();
    fetchUsers();

    const socket = getSocket();
    const handleNewRequest = (newReq) => {
      setReceivedRequests((prev) => [newReq, ...prev]);
      showNotification(`🔔 Nhận được lời mời kết bạn từ ${newReq.sender?.username}!`);
    };

    const handleAccepted = ({ friend, conversation }) => {
      loadData();
      fetchUsers(searchQuery);
      showNotification(`🎉 ${friend?.username} đã chấp nhận lời mời kết bạn!`);
    };

    socket?.on('friend_request_received', handleNewRequest);
    socket?.on('friend_request_accepted', handleAccepted);

    return () => {
      socket?.off('friend_request_received', handleNewRequest);
      socket?.off('friend_request_accepted', handleAccepted);
    };
  }, []);

  function showNotification(msg) {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 4000);
  }

  async function handleAccept(reqId) {
    setActionLoadingId(reqId);
    try {
      const { data } = await http.put(`/friends/accept/${reqId}`);
      showNotification('✅ Đã chấp nhận kết bạn!');
      await loadData();
      if (data.conversation && onStartChat) {
        onStartChat(data.conversation._id, data.conversation);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi chấp nhận kết bạn');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleReject(reqId) {
    setActionLoadingId(reqId);
    try {
      await http.put(`/friends/reject/${reqId}`);
      showNotification('Đã từ chối lời mời.');
      setReceivedRequests((prev) => prev.filter((r) => r._id !== reqId));
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi từ chối kết bạn');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function fetchUsers(query = '') {
    setIsSearching(true);
    try {
      const { data } = await http.get('/users/search', { params: { q: query } });
      setSearchResults(data || []);
    } catch (err) {
      console.error('Lỗi lấy danh sách người dùng:', err);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSearch(e) {
    const q = e.target.value;
    setSearchQuery(q);
    fetchUsers(q);
  }

  async function handleSendRequest(targetUserId) {
    try {
      await http.post(`/friends/request/${targetUserId}`);
      showNotification('Đã gửi lời mời kết bạn!');
      setSearchResults((prev) =>
        prev.map((u) => (u._id === targetUserId ? { ...u, friendshipStatus: 'sent' } : u))
      );
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi gửi lời mời');
    }
  }

  async function handleChatNow(targetUserId) {
    try {
      const { data } = await http.post('/conversations', { participantIds: [targetUserId] });
      if (onStartChat) {
        onStartChat(data._id, data);
      }
    } catch (err) {
      console.error('Lỗi mở chat:', err);
    }
  }

  return (
    <div className="friend-hub-main-container">
      {/* Toast */}
      {notificationMsg && (
        <div className="friend-request-toast">
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Top Banner Navigation */}
      <div className="friend-hub-top-card">
        <div className="friend-hub-brand-row">
          <div className="friend-hub-brand-icon">
            <Users size={26} className="text-cyan" />
          </div>
          <div>
            <h2 className="friend-hub-title">Trung tâm Bạn bè & Kết nối</h2>
            <p className="friend-hub-desc">
              Kết bạn để trò chuyện mã hóa đầu cuối ElGamal 256-bit & AES-256-GCM
            </p>
          </div>
          {onOpenCreateGroup && (
            <button
              className="btn-create-group-hub"
              onClick={onOpenCreateGroup}
              type="button"
              title="Tạo nhóm chat mới"
            >
              <Users size={15} />
              <span>+ Tạo nhóm</span>
            </button>
          )}
        </div>

        {/* 4 Tabs */}
        <div className="friend-hub-nav-tabs">
          <button
            type="button"
            className={`hub-tab-btn ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            <Inbox size={15} />
            <span>Lời mời kết bạn</span>
            {receivedRequests.length > 0 && (
              <span className="badge-count-red">{receivedRequests.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`hub-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('friends');
              loadData();
            }}
          >
            <UserCheck size={15} />
            <span>Danh sách bạn bè ({friendsList.length})</span>
          </button>

          <button
            type="button"
            className={`hub-tab-btn ${activeTab === 'find' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('find');
              fetchUsers(searchQuery);
            }}
          >
            <UserPlus size={15} />
            <span>Người dùng & Kết bạn ({searchResults.length})</span>
          </button>

          <button
            type="button"
            className={`hub-tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            <Send size={15} />
            <span>Đã gửi ({sentRequests.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="friend-hub-content-box">
        {/* TAB 1: LỜI MỜI NHẬN ĐƯỢC */}
        {activeTab === 'received' && (
          <div className="hub-list-flow">
            <div className="hub-list-title">
              <span>Lời mời kết bạn đang chờ bạn phê duyệt ({receivedRequests.length})</span>
            </div>
            {receivedRequests.length === 0 ? (
              <div className="friend-empty-state">
                <Inbox size={42} className="text-muted" />
                <p>Không có lời mời kết bạn nào đang chờ.</p>
                <span className="sub">Khi ai đó gửi lời mời cho bạn, bạn có thể bấm Đồng ý để trở thành bạn bè và bắt đầu nhắn tin.</span>
              </div>
            ) : (
              receivedRequests.map((reqItem) => {
                const u = reqItem.sender;
                const isOnline = userStatuses[u?._id] === 'online' || u?.status === 'online';
                const isBusy = actionLoadingId === reqItem._id;

                return (
                  <div key={reqItem._id} className="hub-user-item-card">
                    <div className="user-avatar-circle" style={{ background: getAvatarGradient(u?.username) }}>
                      {getInitials(u?.username)}
                      <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                    </div>

                    <div className="hub-user-info">
                      <div className="hub-name-row">
                        <span className="hub-username">{u?.username}</span>
                        <span className="hub-time">{formatTime(reqItem.createdAt)}</span>
                      </div>
                      <span className="hub-sec-tag">
                        <ShieldCheck size={12} className="text-emerald" /> Khóa công khai ElGamal sẵn sàng
                      </span>
                    </div>

                    <div className="hub-card-actions">
                      <button
                        type="button"
                        className="btn-friend-accept"
                        onClick={() => handleAccept(reqItem._id)}
                        disabled={isBusy}
                      >
                        <Check size={16} />
                        <span>Đồng ý</span>
                      </button>
                      <button
                        type="button"
                        className="btn-friend-reject"
                        onClick={() => handleReject(reqItem._id)}
                        disabled={isBusy}
                      >
                        <X size={16} />
                        <span>Từ chối</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: DANH SÁCH BẠN BÈ */}
        {activeTab === 'friends' && (
          <div className="hub-list-flow">
            <div className="hub-list-title">
              <span>Danh bạ bạn bè ({friendsList.length})</span>
            </div>
            {friendsList.length === 0 ? (
              <div className="friend-empty-state">
                <UserCheck size={42} className="text-muted" />
                <p>Bạn chưa có người bạn nào.</p>
                <span className="sub">Chuyển sang tab "Tìm kiếm & Kết bạn" để gửi lời mời đến bạn bè của bạn!</span>
              </div>
            ) : (
              friendsList.map((f) => {
                const isOnline = userStatuses[f._id] === 'online' || f.status === 'online';

                return (
                  <div key={f._id} className="hub-user-item-card">
                    <div className="user-avatar-circle" style={{ background: getAvatarGradient(f.username) }}>
                      {getInitials(f.username)}
                      <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                    </div>

                    <div className="hub-user-info">
                      <div className="hub-name-row">
                        <span className="hub-username">{f.username}</span>
                        <span className={`status-pill ${isOnline ? 'online' : 'offline'}`}>
                          {isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}
                        </span>
                      </div>
                    </div>

                    <div className="hub-card-actions">
                      <button
                        type="button"
                        className="btn-chat-with-friend"
                        onClick={() => handleChatNow(f._id)}
                      >
                        <MessageSquare size={14} className="text-cyan" />
                        <span>Nhắn tin</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: NGƯỜI DÙNG & KẾT BẠN (HIỆN DANH SÁCH NGƯỜI LẠ) */}
        {activeTab === 'find' && (
          <div className="hub-list-flow">
            <div className="hub-list-title">
              <span>Danh sách người dùng trên hệ thống ({searchResults.length})</span>
            </div>

            <div className="hub-search-box-large">
              <Search size={18} className="text-cyan" />
              <input
                type="text"
                placeholder="Lọc nhanh theo tên người dùng (hoặc xem tất cả bên dưới)..."
                value={searchQuery}
                onChange={handleSearch}
              />
              {isSearching && <span className="text-xs text-muted">Đang tải...</span>}
            </div>

            <div className="hub-search-results-area">
              {searchResults.length === 0 ? (
                <div className="friend-empty-state">
                  <UserPlus size={40} className="text-muted" />
                  <p>{searchQuery ? `Không tìm thấy người dùng nào với từ khóa "${searchQuery}"` : 'Chưa có người dùng nào khác trên hệ thống'}</p>
                  <span className="sub">Danh sách người dùng sẽ tự động hiển thị tại đây để bạn kết bạn và trò chuyện.</span>
                </div>
              ) : (
                searchResults.map((u) => {
                  const isOnline = userStatuses[u._id] === 'online' || u.status === 'online';
                  const isFriend = u.friendshipStatus === 'friend';
                  const isSent = u.friendshipStatus === 'sent';
                  const isReceived = u.friendshipStatus === 'received';

                  return (
                    <div key={u._id} className="hub-user-item-card">
                      <div className="user-avatar-circle" style={{ background: getAvatarGradient(u.username) }}>
                        {getInitials(u.username)}
                        <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                      </div>

                      <div className="hub-user-info">
                        <div className="hub-name-row">
                          <span className="hub-username">{u.username}</span>
                          {isFriend && <span className="status-pill online">Bạn bè</span>}
                        </div>
                        <span className="hub-sec-tag">
                          <ShieldCheck size={12} className="text-emerald" /> Khóa ElGamal 256-bit
                        </span>
                      </div>

                      <div className="hub-card-actions">
                        {isFriend ? (
                          <button
                            type="button"
                            className="btn-chat-with-friend"
                            onClick={() => handleChatNow(u._id)}
                          >
                            <MessageSquare size={14} className="text-cyan" />
                            <span>Nhắn tin</span>
                          </button>
                        ) : isSent ? (
                          <span className="badge-request-sent">Đã gửi lời mời</span>
                        ) : isReceived ? (
                          <button
                            type="button"
                            className="btn-friend-accept"
                            onClick={() => handleAccept(u.requestId)}
                          >
                            <Check size={14} />
                            <span>Đồng ý kết bạn</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-friend-add-large"
                            onClick={() => handleSendRequest(u._id)}
                          >
                            <UserPlus size={14} />
                            <span>Kết bạn</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ĐÃ GỬI */}
        {activeTab === 'sent' && (
          <div className="hub-list-flow">
            <div className="hub-list-title">
              <span>Các lời mời kết bạn bạn đã gửi đi ({sentRequests.length})</span>
            </div>
            {sentRequests.length === 0 ? (
              <div className="friend-empty-state">
                <Send size={42} className="text-muted" />
                <p>Bạn chưa gửi lời mời kết bạn nào.</p>
                <span className="sub">Dùng tab "Tìm kiếm & Kết bạn" để gửi lời mời đến bạn bè.</span>
              </div>
            ) : (
              sentRequests.map((reqItem) => {
                const u = reqItem.receiver;
                const isOnline = userStatuses[u?._id] === 'online' || u?.status === 'online';

                return (
                  <div key={reqItem._id} className="hub-user-item-card">
                    <div className="user-avatar-circle" style={{ background: getAvatarGradient(u?.username) }}>
                      {getInitials(u?.username)}
                      <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                    </div>

                    <div className="hub-user-info">
                      <div className="hub-name-row">
                        <span className="hub-username">{u?.username}</span>
                        <span className="hub-time">{formatTime(reqItem.createdAt)}</span>
                      </div>
                    </div>

                    <div className="friend-card-pending-badge">
                      <Clock size={14} />
                      <span>Đang chờ đối phương đồng ý</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

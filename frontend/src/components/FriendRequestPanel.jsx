import { useState, useEffect } from 'react';
import http from '../api/http';
import { getSocket } from '../api/socket';
import { getAvatarGradient, getInitials, formatTime } from '../utils/avatar';
import {
  UserPlus,
  Check,
  X,
  Clock,
  ShieldCheck,
  UserCheck,
  Inbox,
  Send,
  Users,
  Sparkles
} from 'lucide-react';

export default function FriendRequestPanel({ onStartChat, userStatuses = {} }) {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent' | 'friends'
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [notificationMsg, setNotificationMsg] = useState('');

  async function loadRequests() {
    setLoading(true);
    try {
      const { data } = await http.get('/friends/requests');
      setReceivedRequests(data.received || []);
      setSentRequests(data.sent || []);
    } catch (err) {
      console.error('Lỗi nạp lời mời kết bạn:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadFriends() {
    try {
      const { data } = await http.get('/friends/list');
      setFriendsList(data || []);
    } catch (err) {
      console.error('Lỗi nạp danh sách bạn bè:', err);
    }
  }

  useEffect(() => {
    loadRequests();
    loadFriends();

    const socket = getSocket();
    const handleNewRequest = (newReq) => {
      setReceivedRequests((prev) => [newReq, ...prev]);
      showNotification(`🔔 Bạn vừa nhận được lời mời kết bạn từ ${newReq.sender?.username}!`);
    };

    const handleAccepted = ({ friend, conversation }) => {
      loadRequests();
      loadFriends();
      showNotification(`🎉 ${friend?.username} đã chấp nhận lời mời kết bạn của bạn!`);
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
      await loadRequests();
      await loadFriends();
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
      showNotification('Đã từ chối lời mời kết bạn.');
      setReceivedRequests((prev) => prev.filter((r) => r._id !== reqId));
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi từ chối kết bạn');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleStartChatWithFriend(friendId) {
    try {
      const { data } = await http.post('/conversations', { participantIds: [friendId] });
      if (onStartChat) {
        onStartChat(data._id, data);
      }
    } catch (err) {
      console.error('Lỗi mở chat với bạn:', err);
    }
  }

  return (
    <div className="friend-request-panel">
      {/* Toast Notification */}
      {notificationMsg && (
        <div className="friend-request-toast">
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Panel Header */}
      <div className="friend-panel-header">
        <div className="friend-panel-title">
          <Users size={20} className="text-cyan" />
          <span>Quản lý Bạn bè & Lời mời</span>
        </div>

        {/* Tab selection */}
        <div className="friend-panel-tabs">
          <button
            type="button"
            className={`friend-tab-btn ${activeTab === 'received' ? 'active' : ''}`}
            onClick={() => setActiveTab('received')}
          >
            <Inbox size={15} />
            <span>Lời mời nhận được</span>
            {receivedRequests.length > 0 && (
              <span className="badge-count-red">{receivedRequests.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`friend-tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            <Send size={15} />
            <span>Đã gửi ({sentRequests.length})</span>
          </button>

          <button
            type="button"
            className={`friend-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('friends');
              loadFriends();
            }}
          >
            <UserCheck size={15} />
            <span>Bạn bè ({friendsList.length})</span>
          </button>
        </div>
      </div>

      {/* Panel Content Body */}
      <div className="friend-panel-body">
        {/* TAB 1: LỜI MỜI NHẬN ĐƯỢC */}
        {activeTab === 'received' && (
          <div className="friend-requests-list">
            {receivedRequests.length === 0 ? (
              <div className="friend-empty-state">
                <Inbox size={36} className="text-muted" />
                <p>Không có lời mời kết bạn nào đang chờ.</p>
                <span className="sub">Khi người khác gửi lời mời, bạn sẽ thấy nút Đồng ý / Từ chối ở đây.</span>
              </div>
            ) : (
              receivedRequests.map((reqItem) => {
                const u = reqItem.sender;
                const isOnline = userStatuses[u?._id] === 'online' || u?.status === 'online';
                const isBusy = actionLoadingId === reqItem._id;

                return (
                  <div key={reqItem._id} className="friend-request-card">
                    <div className="user-avatar-circle" style={{ background: getAvatarGradient(u?.username) }}>
                      {getInitials(u?.username)}
                      <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                    </div>

                    <div className="friend-card-info">
                      <div className="friend-card-name-row">
                        <span className="friend-name">{u?.username}</span>
                        <span className="friend-time">{formatTime(reqItem.createdAt)}</span>
                      </div>
                      <span className="friend-tag-e2e">
                        <ShieldCheck size={12} className="text-emerald" /> Khóa ElGamal 256-bit sẵn sàng
                      </span>
                    </div>

                    <div className="friend-card-actions">
                      <button
                        type="button"
                        className="btn-friend-accept"
                        onClick={() => handleAccept(reqItem._id)}
                        disabled={isBusy}
                        title="Đồng ý kết bạn"
                      >
                        <Check size={16} />
                        <span>Đồng ý</span>
                      </button>
                      <button
                        type="button"
                        className="btn-friend-reject"
                        onClick={() => handleReject(reqItem._id)}
                        disabled={isBusy}
                        title="Từ chối lời mời"
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

        {/* TAB 2: LỜI MỜI ĐÃ GỬI */}
        {activeTab === 'sent' && (
          <div className="friend-requests-list">
            {sentRequests.length === 0 ? (
              <div className="friend-empty-state">
                <Send size={36} className="text-muted" />
                <p>Bạn chưa gửi lời mời kết bạn nào.</p>
                <span className="sub">Dùng thanh tìm kiếm ở khung bên trái để tìm và gửi lời mời kết bạn.</span>
              </div>
            ) : (
              sentRequests.map((reqItem) => {
                const u = reqItem.receiver;
                const isOnline = userStatuses[u?._id] === 'online' || u?.status === 'online';

                return (
                  <div key={reqItem._id} className="friend-request-card">
                    <div className="user-avatar-circle" style={{ background: getAvatarGradient(u?.username) }}>
                      {getInitials(u?.username)}
                      <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                    </div>

                    <div className="friend-card-info">
                      <div className="friend-card-name-row">
                        <span className="friend-name">{u?.username}</span>
                        <span className="friend-time">{formatTime(reqItem.createdAt)}</span>
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

        {/* TAB 3: DANH SÁCH BẠN BÈ */}
        {activeTab === 'friends' && (
          <div className="friend-requests-list">
            {friendsList.length === 0 ? (
              <div className="friend-empty-state">
                <UserCheck size={36} className="text-muted" />
                <p>Bạn chưa có người bạn nào trong danh bạ.</p>
                <span className="sub">Hãy gửi lời mời kết bạn để cùng trò chuyện bảo mật E2EE!</span>
              </div>
            ) : (
              friendsList.map((f) => {
                const isOnline = userStatuses[f._id] === 'online' || f.status === 'online';

                return (
                  <div key={f._id} className="friend-request-card">
                    <div className="user-avatar-circle" style={{ background: getAvatarGradient(f.username) }}>
                      {getInitials(f.username)}
                      <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                    </div>

                    <div className="friend-card-info">
                      <div className="friend-card-name-row">
                        <span className="friend-name">{f.username}</span>
                        <span className={`status-pill ${isOnline ? 'online' : 'offline'}`}>
                          {isOnline ? 'Đang online' : 'Ngoại tuyến'}
                        </span>
                      </div>
                    </div>

                    <div className="friend-card-actions">
                      <button
                        type="button"
                        className="btn-chat-with-friend"
                        onClick={() => handleStartChatWithFriend(f._id)}
                      >
                        <Sparkles size={14} className="text-cyan" />
                        <span>Nhắn tin ngay</span>
                      </button>
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

import { useState, useEffect } from 'react';
import http from '../api/http';
import { getAvatarGradient, getInitials } from '../utils/avatar';
import {
  Users,
  Plus,
  X,
  Check,
  Shield,
  Search,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

export default function CreateGroupModal({ isOpen, onClose, onGroupCreated, userStatuses = {} }) {
  const [groupName, setGroupName] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadFriends();
      setGroupName('');
      setSelectedFriends([]);
      setError('');
    }
  }, [isOpen]);

  async function loadFriends() {
    setLoading(true);
    try {
      const { data } = await http.get('/friends/list');
      setFriends(data || []);
    } catch (err) {
      console.error('Lỗi nạp danh sách bạn bè:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelectFriend(friendId) {
    if (selectedFriends.includes(friendId)) {
      setSelectedFriends(selectedFriends.filter((id) => id !== friendId));
    } else {
      setSelectedFriends([...selectedFriends, friendId]);
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault();
    setError('');

    if (!groupName.trim()) {
      return setError('Vui lòng nhập tên nhóm');
    }
    if (selectedFriends.length < 2) {
      return setError('Nhóm chat cần ít nhất 2 người bạn khác (tổng 3 người trở lên)');
    }

    setSubmitting(true);
    try {
      const { data } = await http.post('/conversations', {
        name: groupName.trim(),
        type: 'group',
        participantIds: selectedFriends,
      });

      if (onGroupCreated) {
        onGroupCreated(data._id, data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Lỗi khi tạo nhóm chat');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="crypto-modal-backdrop" onClick={onClose}>
      <div className="crypto-modal-window create-group-window" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="crypto-modal-header">
          <div className="crypto-modal-title">
            <div className="crypto-modal-icon-badge text-cyan">
              <Users size={18} />
            </div>
            <div>
              <h3>Tạo nhóm chat mới</h3>
              <span className="crypto-modal-subtitle">Trò chuyện đa thành viên bảo mật E2EE</span>
            </div>
          </div>
          <button className="crypto-modal-close-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateGroup}>
          <div className="crypto-modal-body">
            {error && (
              <div className="crypto-alert-banner" style={{ background: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)', color: '#fda4af' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Tên nhóm */}
            <div className="group-input-group">
              <label>Tên nhóm chat</label>
              <input
                type="text"
                className="group-name-input"
                placeholder="VD: Nhóm Đồ Án Tốt Nghiệp..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={40}
                required
              />
            </div>

            {/* Chọn bạn bè */}
            <div className="group-members-section">
              <div className="flex-between mb-2">
                <label className="text-sm font-semibold">
                  Chọn thành viên ({selectedFriends.length} đã chọn)
                </label>
                <span className="text-xs text-muted">Cần tối thiểu 2 người</span>
              </div>

              {/* Tìm nhanh bạn */}
              <div className="group-friend-search-wrap">
                <Search size={14} className="text-muted" />
                <input
                  type="text"
                  placeholder="Tìm bạn bè..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Danh sách bạn bè để chọn */}
              <div className="group-friends-picker-list">
                {loading ? (
                  <div className="text-center p-4 text-muted text-sm">Đang nạp danh sách bạn bè...</div>
                ) : filteredFriends.length === 0 ? (
                  <div className="text-center p-4 text-muted text-sm">
                    {friends.length === 0
                      ? 'Bạn chưa có người bạn nào. Hãy kết bạn trước khi tạo nhóm!'
                      : 'Không tìm thấy người bạn phù hợp'}
                  </div>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSelected = selectedFriends.includes(friend._id);
                    const isOnline = userStatuses[friend._id] === 'online' || friend.status === 'online';

                    return (
                      <div
                        key={friend._id}
                        className={`group-friend-choice-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSelectFriend(friend._id)}
                      >
                        <div
                          className="user-avatar-circle mini"
                          style={{ background: getAvatarGradient(friend.username) }}
                        >
                          {getInitials(friend.username)}
                          <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                        </div>

                        <div className="choice-info">
                          <span className="choice-name">{friend.username}</span>
                          <span className="choice-email">{friend.email}</span>
                        </div>

                        <div className={`checkbox-custom ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={13} />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="crypto-alert-banner success" style={{ marginTop: '10px' }}>
              <Shield size={16} />
              <span>
                Nhóm chat sử dụng hệ mã lai: Mỗi người nhận có 1 bản bọc khóa ElGamal riêng biệt!
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="crypto-modal-footer">
            <button className="btn-modal-secondary" type="button" onClick={onClose}>
              Hủy
            </button>
            <button className="btn-modal-primary" type="submit" disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo nhóm chat'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

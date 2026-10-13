import React from 'react';
import { X, Users, MessageSquare, ShieldCheck } from 'lucide-react';
import { getAvatarGradient, getInitials } from '../utils/avatar';

export default function GroupMembersModal({
  isOpen,
  onClose,
  conversation,
  currentUser,
  userStatuses = {},
  onStartDirectChat,
}) {
  if (!isOpen || !conversation) return null;

  const participants = conversation.participants || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="crypto-inspector-modal"
        style={{ maxWidth: '480px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inspector-header">
          <div className="inspector-title-row">
            <Users size={20} className="text-cyan" />
            <h3>Thành viên nhóm ({participants.length})</h3>
          </div>
          <button className="inspector-close-btn" onClick={onClose} title="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="inspector-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
          <div style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
            Nhóm: <strong style={{ color: 'var(--text-primary)' }}>{conversation.name}</strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {participants.map((p) => {
              const isMe = (p._id?.toString() || '') === (currentUser?._id?.toString() || '');
              const isOnline = userStatuses[p._id] === 'online' || p.status === 'online';

              return (
                <div
                  key={p._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      className="user-avatar-circle"
                      style={{
                        background: getAvatarGradient(p.username),
                        width: '38px',
                        height: '38px',
                        fontSize: '14px',
                        position: 'relative',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(p.username)}
                      <span className={`status-indicator-dot ${isOnline ? 'online' : 'offline'}`} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {p.username}
                        </span>
                        {isMe && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: 'var(--cyan-neon)',
                              fontWeight: 500,
                            }}
                          >
                            Bạn
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: isOnline ? 'var(--emerald-neon)' : 'var(--text-dim)' }}>
                          {isOnline ? '● Trực tuyến' : '○ Ngoại tuyến'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>•</span>
                        <span style={{ fontSize: '11px', color: 'var(--emerald-neon)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <ShieldCheck size={11} /> ElGamal 256-bit
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isMe && onStartDirectChat && (
                    <button
                      type="button"
                      className="btn-chat-with-friend"
                      style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}
                      onClick={() => {
                        onClose();
                        onStartDirectChat(p._id);
                      }}
                      title={`Nhắn tin riêng với ${p.username}`}
                    >
                      <MessageSquare size={13} className="text-cyan" />
                      <span>Nhắn tin</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="inspector-footer" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="inspector-done-btn" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

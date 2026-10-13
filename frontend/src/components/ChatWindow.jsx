import { useEffect, useRef, useState } from 'react';
import http from '../api/http';
import { getSocket } from '../api/socket';
import { useAuth } from '../context/AuthContext';
import * as elgamal from '../crypto/elgamal';
import { generateAesKey, exportAesKeyHex, encryptAES } from '../crypto/aes';
import { hybridDecrypt } from '../crypto/hybrid';
import * as signature from '../crypto/signature';
import { sha256 } from '../crypto/hash';
import { getAvatarGradient, getInitials, formatTime } from '../utils/avatar';
import { playSendSound, playReceiveSound, isSoundEnabled, setSoundEnabled } from '../utils/sound';
import CryptoModal from './CryptoModal';
import KeyModal from './KeyModal';
import RightFriendHub from './RightFriendHub';
import {
  Send,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Volume2,
  VolumeX,
  Key,
  Info,
  Smile,
  Search,
  Sparkles,
  Terminal,
  CheckCheck,
  ArrowLeft,
  Reply,
  CornerDownRight,
  X,
  Palette,
  Home,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download
} from 'lucide-react';

const QUICK_EMOJIS = ['👋', '😀', '❤️', '🔥', '👍', '🔐', '🛡️', '⚡', '🚀', '💻', '🎉', '✨'];

async function decryptAndVerify(message, myUserId, privateKey) {
  try {
    const mine = message.recipientKeys?.find(
      (rk) => (rk.recipient?._id || rk.recipient)?.toString() === myUserId?.toString()
    );
    if (!mine) return { error: 'Không tìm thấy khóa mã hóa dành cho bạn' };
    if (!privateKey) return { error: 'Không có private key trên thiết bị này' };

    const decrypted = await hybridDecrypt(
      { encryptedMessage: message.encryptedMessage, encryptedKeyChunks: mine.encryptedKeyChunks },
      privateKey
    );

    const verified = await signature.verify(decrypted, message.signature, message.sender?.elgamalPublicKey);
    const hash = await sha256(decrypted);

    let text = decrypted;
    let replyInfo = null;

    try {
      if (typeof decrypted === 'string' && decrypted.startsWith('{"_reply":')) {
        const parsed = JSON.parse(decrypted);
        if (parsed._reply) {
          replyInfo = parsed._reply;
          text = parsed.content;
        }
      }
    } catch (e) {
      // Dạng tin nhắn thông thường (không phải cấu trúc trả lời)
    }

    return {
      text,
      replyInfo,
      attachments: message.attachments || [],
      verified,
      hash,
      raw: {
        encryptedMessage: message.encryptedMessage,
        encryptedKeyChunks: mine.encryptedKeyChunks,
        signature: message.signature,
        senderPublicKey: message.sender?.elgamalPublicKey,
      },
    };
  } catch (err) {
    return {
      error: 'Không thể giải mã tin nhắn này (khóa phiên hoặc dữ liệu không hợp lệ)',
      raw: {
        encryptedMessage: message.encryptedMessage,
        signature: message.signature,
      },
    };
  }
}

export default function ChatWindow({
  conversationId,
  userStatuses = {},
  onBack,
  onOpenThemeModal,
  onSelectConversation,
  onOpenCreateGroup,
}) {
  const { user, privateKey } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, senderName, text }
  const [selectedFiles, setSelectedFiles] = useState([]); // [{ file, previewUrl, name, size, type, base64 }]

  // Modals
  const [inspectMessage, setInspectMessage] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  // Toggle sound
  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      // Giới hạn kích thước file 15MB để truyền mượt mà
      if (file.size > 15 * 1024 * 1024) {
        alert(`Tệp "${file.name}" vượt quá kích thước 15MB cho phép.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Data = uploadEvent.target.result;
        const isImg = file.type.startsWith('image/');
        setSelectedFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            isImage: isImg,
            previewUrl: isImg ? base64Data : null,
            base64: base64Data,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  function handleRemoveFile(index) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Load conversation & messages
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setReplyingTo(null);

    async function load() {
      try {
        const [{ data: conv }, { data: history }] = await Promise.all([
          http.get(`/conversations/${conversationId}`),
          http.get(`/conversations/${conversationId}/messages`),
        ]);
        if (cancelled) return;
        setConversation(conv);

        const decrypted = await Promise.all(
          history.map(async (m) => {
            const result = await decryptAndVerify(m, user._id, privateKey);
            return {
              _id: m._id,
              senderId: m.sender?._id || m.sender,
              senderName: m.sender?.username || 'Thành viên',
              createdAt: m.createdAt,
              ...result,
            };
          })
        );
        if (!cancelled) setMessages(decrypted);
      } catch (err) {
        console.error('Lỗi tải cuộc trò chuyện:', err);
      }
    }
    load();

    const socket = getSocket();
    socket?.emit('join_conversation', conversationId);

    const handleNewMessage = async (m) => {
      if (m.conversation !== conversationId) return;
      const result = await decryptAndVerify(m, user._id, privateKey);
      const isMine = (m.sender?._id || m.sender)?.toString() === user._id?.toString();

      if (!isMine) {
        playReceiveSound();
      }

      setMessages((prev) => {
        if (prev.some((x) => x._id === m._id)) return prev;
        return [
          ...prev,
          {
            _id: m._id,
            senderId: m.sender?._id || m.sender,
            senderName: m.sender?.username || 'Thành viên',
            createdAt: m.createdAt,
            ...result,
          },
        ];
      });
      setPartnerTyping(false);
    };

    const handleUserTyping = (data) => {
      if (data.userId !== user._id) {
        setPartnerTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setPartnerTyping(false);
        }, 2500);
      }
    };

    socket?.on('new_message', handleNewMessage);
    socket?.on('user_typing', handleUserTyping);

    return () => {
      cancelled = true;
      socket?.off('new_message', handleNewMessage);
      socket?.off('user_typing', handleUserTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId, user._id, privateKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  function handleInputChange(e) {
    const text = e.target.value;
    setDraft(text);

    // Emit typing socket event (throttled every 1.5s)
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 1500 && conversationId) {
      lastTypingEmitRef.current = now;
      const socket = getSocket();
      socket?.emit('typing', { conversationId });
    }
  }

  function handleInsertEmoji(emoji) {
    setDraft((prev) => prev + emoji);
    inputRef.current?.focus();
  }

  function handleStartReply(msg) {
    setReplyingTo({
      id: msg._id,
      senderName: msg.senderName,
      text: msg.text,
    });
    inputRef.current?.focus();
  }

  function scrollToMessage(targetId) {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('msg-highlight-pulse');
      setTimeout(() => el.classList.remove('msg-highlight-pulse'), 1800);
    }
  }

  async function handleSend(e) {
    e?.preventDefault?.();
    const hasFiles = selectedFiles.length > 0;
    if ((!draft.trim() && !hasFiles) || !conversation || sending) return;

    const contentToSend = draft.trim();
    setSending(true);

    try {
      // Chuẩn bị danh sách attachments đã băm sha256
      const attachmentsToSend = await Promise.all(
        selectedFiles.map(async (f) => {
          const fileSha256 = await sha256(f.base64);
          return {
            url: f.base64,
            filename: f.name,
            mimeType: f.type,
            sizeBytes: f.size,
            sha256: fileSha256,
          };
        })
      );

      // Nếu đang trả lời tin nhắn cũ: đóng gói metadata trả lời vào nội dung mã hóa E2E
      let payloadText = contentToSend;
      if (replyingTo) {
        payloadText = JSON.stringify({
          _reply: {
            id: replyingTo.id,
            sender: replyingTo.senderName,
            snippet: replyingTo.text?.length > 90 ? replyingTo.text.slice(0, 90) + '...' : replyingTo.text,
          },
          content: contentToSend,
        });
      }

      // 1. Mã hóa nội dung 1 LẦN bằng AES-256-GCM
      const aesKey = await generateAesKey();
      const aesKeyHex = await exportAesKeyHex(aesKey);
      const encryptedMessage = await encryptAES(payloadText, aesKey);

      // 2. Với MỖI thành viên, mã hóa khóa AES bằng public key ElGamal riêng
      const recipientKeys = conversation.participants.map((p) => ({
        recipient: p._id,
        encryptedKeyChunks: elgamal.encrypt(aesKeyHex, p.elgamalPublicKey),
      }));

      // 3. Ký số lên nội dung GỐC bằng private key ElGamal
      const sig = await signature.sign(payloadText, privateKey);

      const socket = getSocket();
      socket.emit(
        'send_message',
        {
          conversationId,
          encryptedMessage,
          recipientKeys,
          signature: sig,
          attachments: attachmentsToSend,
        },
        (ack) => {
          if (ack?.error) {
            console.error('Gửi tin nhắn thất bại:', ack.error);
          }
        }
      );

      playSendSound();
      setDraft('');
      setSelectedFiles([]);
      setReplyingTo(null);
      setShowEmojiPicker(false);
    } catch (err) {
      console.error('Lỗi mã hóa/gửi:', err);
    } finally {
      setSending(false);
    }
  }

  if (!conversationId) {
    return (
      <div className="chat-empty-view-wrapper">
        <RightFriendHub
          onStartChat={(id, conv) => onSelectConversation && onSelectConversation(id, conv)}
          userStatuses={userStatuses}
          onOpenCreateGroup={() => onOpenCreateGroup && onOpenCreateGroup()}
        />
      </div>
    );
  }

  // Partner information
  const otherParticipant = conversation?.participants?.find((p) => p._id !== user._id) || conversation?.participants?.[0];
  const partnerName = conversation?.type === 'group' ? conversation.name : (otherParticipant?.username || 'Đối thoại');
  const isPartnerOnline = otherParticipant ? (userStatuses[otherParticipant._id] === 'online' || otherParticipant.status === 'online') : false;

  return (
    <div className="chat-window-layout">
      {/* Top Header */}
      <header className="chat-top-header">
        <div className="chat-header-user">
          {onBack && (
            <button className="btn-mobile-back" onClick={onBack} title="Quay lại danh sách hội thoại">
              <ArrowLeft size={18} />
            </button>
          )}
          <div
            className="user-avatar-circle"
            style={{ background: getAvatarGradient(partnerName) }}
          >
            {getInitials(partnerName)}
            <span className={`status-indicator-dot ${isPartnerOnline ? 'online' : 'offline'}`} />
          </div>
          <div className="chat-header-info">
            <div className="chat-partner-name">{partnerName}</div>
            <div className="chat-partner-status">
              {partnerTyping ? (
                <span className="typing-text-header">
                  <span className="typing-indicator-inline">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                  đang soạn tin
                </span>
              ) : isPartnerOnline ? (
                <span className="text-emerald">Đang trực tuyến</span>
              ) : (
                <span className="text-dim">Ngoại tuyến</span>
              )}
            </div>
          </div>
        </div>

        <div className="chat-header-actions">
          {onBack && (
            <button
              className="header-badge-btn"
              onClick={onBack}
              title="Trở về Trang chủ / Trung tâm Bạn bè"
            >
              <Home size={14} className="text-cyan" />
              <span>Trang chủ</span>
            </button>
          )}

          <button
            className="header-badge-btn"
            onClick={() => setShowKeyModal(true)}
            title="Xem thông số khóa & thuật toán bảo mật"
          >
            <ShieldCheck size={14} className="text-cyan" />
            <span>Mã hóa E2E kép</span>
          </button>

          {onOpenThemeModal && (
            <button
              className="header-icon-action-btn"
              onClick={onOpenThemeModal}
              title="Đổi màu giao diện Chat-app"
            >
              <Palette size={18} className="text-cyan" />
            </button>
          )}

          <button
            className="header-icon-action-btn"
            onClick={handleToggleSound}
            title={soundOn ? 'Tắt âm thanh thông báo' : 'Bật âm thanh thông báo'}
          >
            {soundOn ? <Volume2 size={18} className="text-cyan" /> : <VolumeX size={18} className="text-dim" />}
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="messages-area">
        {messages.length === 0 ? (
          <div className="conversation-start-welcome">
            <div className="welcome-lock-badge">
              <Lock size={28} />
            </div>
            <h4>Bắt đầu cuộc trò chuyện bảo mật với {partnerName}</h4>
            <p>
              Không ai ngoài hai bạn có thể đọc được tin nhắn này, kể cả máy chủ hệ thống.
            </p>
            <div className="quick-start-buttons">
              <button onClick={() => setDraft('👋 Xin chào bạn!')}>👋 Gửi lời chào</button>
              <button onClick={() => setDraft('🔐 Test mã hóa ElGamal + AES-256')}>🔐 Test mã hóa E2E</button>
            </div>
          </div>
        ) : (
          messages.map((m) => {
            const mine = (m.senderId?.toString() || '') === (user?._id?.toString() || '');
            return (
              <div key={m._id} id={`msg-${m._id}`} className={`msg-group-row ${mine ? 'mine' : 'theirs'}`}>
                {!mine && (
                  <div
                    className="msg-sender-avatar"
                    style={{ background: getAvatarGradient(m.senderName) }}
                  >
                    {getInitials(m.senderName)}
                  </div>
                )}

                <div className="msg-content-wrapper">
                  {!mine && <span className="msg-sender-name">{m.senderName}</span>}

                  <div className={`msg-bubble ${mine ? 'bubble-mine' : 'bubble-theirs'}`}>
                    {/* Trích dẫn tin nhắn cũ nếu là tin nhắn trả lời */}
                    {m.replyInfo && (
                      <div
                        className="msg-quoted-box"
                        onClick={() => scrollToMessage(m.replyInfo.id)}
                        title="Bấm để cuộn đến tin nhắn gốc"
                      >
                        <div className="quote-sender-line">
                          <CornerDownRight size={11} className="mr-1 text-cyan" />
                          <span>{m.replyInfo.sender}</span>
                        </div>
                        <div className="quote-snippet-line">{m.replyInfo.snippet}</div>
                      </div>
                    )}

                    {m.error ? (
                      <div className="msg-decrypt-error">
                        <AlertTriangle size={15} />
                        <span>{m.error}</span>
                      </div>
                    ) : (
                      <>
                        {m.text && <div className="msg-text-line">{m.text}</div>}

                        {/* File & Image Attachments */}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className="msg-attachments-container">
                            {m.attachments.map((att, attIdx) => {
                              const isImg = att.mimeType?.startsWith('image/') || att.url?.startsWith('data:image/');
                              return (
                                <div key={attIdx} className="msg-attachment-item">
                                  {isImg ? (
                                    <div className="attachment-image-wrap">
                                      <img
                                        src={att.url}
                                        alt={att.filename}
                                        className="attachment-rendered-img"
                                        onClick={() => window.open(att.url, '_blank')}
                                        title="Bấm để xem ảnh gốc"
                                      />
                                    </div>
                                  ) : (
                                    <a
                                      href={att.url}
                                      download={att.filename}
                                      className="attachment-file-card"
                                      title={`Tải xuống ${att.filename}`}
                                    >
                                      <div className="file-icon-badge">
                                        <FileText size={18} />
                                      </div>
                                      <div className="file-info-text">
                                        <span className="file-name-text">{att.filename}</span>
                                        <span className="file-size-text">
                                          {(att.sizeBytes / 1024).toFixed(1)} KB
                                        </span>
                                      </div>
                                      <Download size={14} className="file-download-icon" />
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    <div className="msg-footer-bar">
                      <span className="msg-timestamp">{formatTime(m.createdAt)}</span>
                      {mine && <CheckCheck size={13} className="text-cyan" />}
                    </div>
                  </div>

                  {/* Verification & Action Chips */}
                  {!m.error && (
                    <div className="msg-security-row">
                      <button
                        className="msg-action-chip reply-btn"
                        onClick={() => handleStartReply(m)}
                        title="Trả lời tin nhắn này"
                      >
                        <Reply size={11} />
                        <span>Trả lời</span>
                      </button>

                      <button
                        className={`msg-verify-badge ${m.verified ? 'is-valid' : 'is-invalid'}`}
                        onClick={() => setInspectMessage(m)}
                        title="Bấm để xem chi tiết mã hóa & thử nghiệm giả mạo"
                      >
                        {m.verified ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                        <span>{m.verified ? 'Chữ ký hợp lệ' : 'Chữ ký sai'}</span>
                        <Terminal size={11} className="ml-1 opacity-70" />
                        <span className="inspect-callout">Soi gói tin</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Realtime Partner Typing Bubble */}
        {partnerTyping && (
          <div className="msg-group-row theirs">
            <div
              className="msg-sender-avatar"
              style={{ background: getAvatarGradient(partnerName) }}
            >
              {getInitials(partnerName)}
            </div>
            <div className="msg-content-wrapper">
              <div className="typing-bubble">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Emoji Bar */}
      {showEmojiPicker && (
        <div className="quick-emoji-drawer">
          <div className="emoji-list">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="emoji-btn"
                onClick={() => handleInsertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Replying Banner Above Composer */}
      {replyingTo && (
        <div className="composer-reply-bar">
          <div className="reply-bar-indicator" />
          <div className="reply-bar-content">
            <span className="reply-bar-title">
              <Reply size={12} className="text-cyan mr-1" />
              Đang trả lời <strong>{replyingTo.senderName}</strong>
            </span>
            <span className="reply-bar-snippet">
              {replyingTo.text?.length > 80 ? replyingTo.text.slice(0, 80) + '...' : replyingTo.text}
            </span>
          </div>
          <button
            type="button"
            className="reply-bar-close"
            onClick={() => setReplyingTo(null)}
            title="Hủy trả lời"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Selected Attachments Preview Bar */}
      {selectedFiles.length > 0 && (
        <div className="composer-attachments-preview">
          {selectedFiles.map((f, idx) => (
            <div key={idx} className="preview-attachment-chip">
              {f.isImage ? (
                <img src={f.previewUrl} alt={f.name} className="preview-mini-thumb" />
              ) : (
                <FileText size={16} className="text-cyan" />
              )}
              <span className="preview-filename">{f.name}</span>
              <button
                type="button"
                className="btn-remove-attachment"
                onClick={() => handleRemoveFile(idx)}
                title="Xóa tệp này"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer Input Area */}
      <form className="chat-composer-form" onSubmit={handleSend}>
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Nút Đính kèm Tệp / Ảnh */}
        <button
          type="button"
          className="btn-emoji-toggle"
          onClick={() => fileInputRef.current?.click()}
          title="Gửi ảnh hoặc tệp đính kèm mã hóa"
        >
          <Paperclip size={19} />
        </button>

        <button
          type="button"
          className={`btn-emoji-toggle ${showEmojiPicker ? 'active' : ''}`}
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          title="Chọn biểu tượng cảm xúc"
        >
          <Smile size={20} />
        </button>

        <div className="composer-input-wrapper">
          <input
            ref={inputRef}
            className="composer-input"
            value={draft}
            onChange={handleInputChange}
            placeholder={
              replyingTo
                ? `Trả lời ${replyingTo.senderName}...`
                : selectedFiles.length > 0
                ? 'Nhập lời nhắn kèm tệp (hoặc nhấn Gửi trực tiếp)...'
                : 'Nhập tin nhắn bảo mật (mã hóa tự động trước khi gửi)...'
            }
            disabled={sending}
          />
        </div>

        <button
          className="btn-composer-send"
          type="submit"
          disabled={sending || (!draft.trim() && selectedFiles.length === 0)}
          title="Gửi tin nhắn mã hóa"
        >
          <Send size={18} />
        </button>
      </form>

      {/* Crypto Inspector Modal */}
      <CryptoModal
        message={inspectMessage}
        isOpen={Boolean(inspectMessage)}
        onClose={() => setInspectMessage(null)}
      />

      {/* Key & Security Modal */}
      <KeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        user={user}
        conversation={conversation}
        privateKey={privateKey}
      />
    </div>
  );
}

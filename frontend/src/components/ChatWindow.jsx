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
  Palette
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

export default function ChatWindow({ conversationId, userStatuses = {}, onBack, onOpenThemeModal }) {
  const { user, privateKey } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, senderName, text }

  // Modals
  const [inspectMessage, setInspectMessage] = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  // Toggle sound
  function handleToggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
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
    if (!draft.trim() || !conversation || sending) return;

    const contentToSend = draft.trim();
    setSending(true);

    try {
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
        { conversationId, encryptedMessage, recipientKeys, signature: sig },
        (ack) => {
          if (ack?.error) {
            console.error('Gửi tin nhắn thất bại:', ack.error);
          }
        }
      );

      playSendSound();
      setDraft('');
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
      <div className="chat-empty-view">
        <div className="chat-empty-card">
          <div className="empty-shield-icon-wrapper">
            <Shield size={48} className="shield-icon-glow" />
            <Sparkles size={20} className="sparkle-accent" />
          </div>
          <h2>Chat-app — Bảo mật Đầu-Cuối Toàn Diện</h2>
          <p className="empty-desc">
            Tin nhắn của bạn được bảo vệ bởi mô hình mã hóa lai <strong>ElGamal 256-bit</strong> và{' '}
            <strong>AES-256-GCM</strong>, xác thực chống giả mạo bằng <strong>Chữ ký số ElGamal</strong>.
          </p>
          <div className="empty-security-pills">
            <span className="sec-pill">🔒 Zero-Knowledge</span>
            <span className="sec-pill">⚡ AES-256-GCM</span>
            <span className="sec-pill">🛡️ ElGamal Signature</span>
          </div>
          <div className="empty-action-hint">
            👈 Hãy chọn một cuộc trò chuyện từ danh sách hoặc tìm bạn bè để bắt đầu.
          </div>
        </div>
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
                      <div className="msg-text-line">{m.text}</div>
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

      {/* Composer Input Area */}
      <form className="chat-composer-form" onSubmit={handleSend}>
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
            placeholder={replyingTo ? `Trả lời ${replyingTo.senderName}...` : 'Nhập tin nhắn bảo mật (mã hóa tự động trước khi gửi)...'}
            disabled={sending}
          />
        </div>

        <button
          className="btn-composer-send"
          type="submit"
          disabled={sending || !draft.trim()}
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

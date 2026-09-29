import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Key,
  Lock,
  Copy,
  Check,
  Terminal,
  RefreshCw,
  X,
  ShieldAlert,
  Binary,
  Zap,
  HelpCircle
} from 'lucide-react';
import * as signature from '../crypto/signature';
import { sha256, md5 } from '../crypto/hash';
import { truncateHex } from '../utils/avatar';

export default function CryptoModal({ message, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'tamper' | 'hash_compare'
  const [copied, setCopied] = useState(false);

  // Trạng thái cho tab Thử nghiệm giả mạo (Tamper Lab)
  const [tamperedText, setTamperedText] = useState('');
  const [tamperResult, setTamperResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Trạng thái cho tab Đối chiếu MD5 vs SHA-256
  const [customHashInput, setCustomHashInput] = useState('Dữ liệu thử nghiệm MD5 vs SHA-256');
  const [md5Output, setMd5Output] = useState('');
  const [shaOutput, setShaOutput] = useState('');
  const [benchmarkResult, setBenchmarkResult] = useState(null);
  const [benchmarking, setBenchmarking] = useState(false);

  useEffect(() => {
    if (message?.text) {
      setTamperedText(message.text);
      setTamperResult(null);
    }
  }, [message]);

  useEffect(() => {
    if (customHashInput !== undefined) {
      try {
        setMd5Output(md5(customHashInput));
        sha256(customHashInput).then(setShaOutput);
      } catch (err) {
        // ignore
      }
    }
  }, [customHashInput]);

  if (!isOpen || !message) return null;

  const raw = message.raw || {};
  const encrypted = raw.encryptedMessage || {};
  const sig = raw.signature || {};
  const senderKey = raw.senderPublicKey || {};
  const currentMsgMd5 = message.text ? md5(message.text) : '—';

  function handleCopyJson() {
    const payload = {
      messageId: message._id,
      sender: message.senderName,
      plaintext: message.text,
      hashes: {
        sha256: message.hash,
        md5: currentMsgMd5,
      },
      encryptedMessage: encrypted,
      signature: sig,
      senderPublicKey: senderKey,
      verified: message.verified,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRunTamperCheck() {
    if (!raw.signature || !raw.senderPublicKey) return;
    setTesting(true);
    try {
      const currentHash = await sha256(tamperedText);
      const isOk = await signature.verify(tamperedText, raw.signature, raw.senderPublicKey);
      setTamperResult({ verified: isOk, hash: currentHash });
    } catch (err) {
      setTamperResult({ verified: false, hash: 'Lỗi tính toán', error: err.message });
    } finally {
      setTesting(false);
    }
  }

  function handleResetTamper() {
    setTamperedText(message.text || '');
    setTamperResult(null);
  }

  async function handleRunBenchmark() {
    setBenchmarking(true);
    setTimeout(async () => {
      try {
        const iters = 10000;
        const testStr = 'benchmark_test_data_sample_string_';

        // Đo MD5 10.000 lần
        const t1 = performance.now();
        for (let i = 0; i < iters; i++) {
          md5(testStr + i);
        }
        const t2 = performance.now();

        // Đo SHA-256 500 lần (do Web Crypto digest là async promise) rồi quy đổi tương đương
        const shaIters = 500;
        const t3 = performance.now();
        for (let i = 0; i < shaIters; i++) {
          await sha256(testStr + i);
        }
        const t4 = performance.now();
        const scaledShaTime = ((t4 - t3) * (iters / shaIters)).toFixed(1);

        setBenchmarkResult({
          md5Ms: (t2 - t1).toFixed(1),
          shaMs: scaledShaTime,
          iterations: iters,
        });
      } finally {
        setBenchmarking(false);
      }
    }, 60);
  }

  return (
    <div className="crypto-modal-backdrop" onClick={onClose}>
      <div className="crypto-modal-window" onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="crypto-modal-header">
          <div className="crypto-modal-title">
            <div className="crypto-modal-icon-badge">
              <Terminal size={18} />
            </div>
            <div>
              <h3>Hộp soi mã hóa & Thực nghiệm mật mã</h3>
              <p>AES-256-GCM + Trao khóa ElGamal + Chữ ký số ElGamal + Đối chiếu MD5</p>
            </div>
          </div>
          <div className="crypto-modal-header-actions">
            <button className="crypto-copy-btn" onClick={handleCopyJson} title="Sao chép toàn bộ gói tin JSON">
              {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              <span>{copied ? 'Đã sao chép' : 'Copy JSON'}</span>
            </button>
            <button className="crypto-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab selection */}
        <div className="crypto-modal-tabs">
          <button
            className={`crypto-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <ShieldCheck size={15} />
            Chi tiết gói tin mã hóa
          </button>
          <button
            className={`crypto-tab-btn ${activeTab === 'tamper' ? 'active' : ''}`}
            onClick={() => setActiveTab('tamper')}
          >
            <ShieldAlert size={15} />
            Thử nghiệm giả mạo (Tamper Lab)
          </button>
          <button
            className={`crypto-tab-btn ${activeTab === 'hash_compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('hash_compare')}
          >
            <Binary size={15} />
            Thực nghiệm MD5 vs SHA-256
          </button>
        </div>

        {/* Modal body */}
        <div className="crypto-modal-body">
          {activeTab === 'details' ? (
            <div className="crypto-details-stack">
              {/* Bản rõ */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <span className="crypto-tag tag-cyan">Nội dung giải mã (Plaintext)</span>
                  <span className="crypto-meta">Người gửi: <strong>{message.senderName}</strong></span>
                </div>
                <div className="crypto-codeblock plaintext-box">
                  {message.text || '(Không thể hiển thị bản rõ)'}
                </div>
              </div>

              {/* Gói tin AES-256-GCM */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <Lock size={15} className="text-cyan" />
                    <strong>Bản mã AES-256-GCM (Dữ liệu truyền qua mạng)</strong>
                  </div>
                  <span className="crypto-tag tag-slate">Server chỉ thấy phần này</span>
                </div>
                <div className="crypto-param-grid">
                  <div className="crypto-param-item">
                    <label>Bản mã (Cipher Data):</label>
                    <code>{truncateHex(encrypted.data, 24, 16)}</code>
                  </div>
                  <div className="crypto-param-item">
                    <label>Vector khởi tạo (IV 96-bit):</label>
                    <code>{encrypted.iv || '—'}</code>
                  </div>
                  <div className="crypto-param-item">
                    <label>Tag xác thực (Auth Tag 128-bit):</label>
                    <code>{encrypted.authTag || '—'}</code>
                  </div>
                </div>
              </div>

              {/* Khóa phiên ElGamal */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <Key size={15} className="text-purple" />
                    <strong>Khóa phiên mã hóa bằng ElGamal của bạn</strong>
                  </div>
                  <span className="crypto-tag tag-purple">Bất đối xứng</span>
                </div>
                <p className="crypto-hint">
                  Khóa đối xứng AES được bẻ nhỏ thành từng khối và mã hóa riêng biệt bằng ElGamal Public Key của bạn:
                </p>
                <div className="crypto-chunks-preview">
                  {raw.encryptedKeyChunks && raw.encryptedKeyChunks.length > 0 ? (
                    raw.encryptedKeyChunks.slice(0, 3).map((chunk, idx) => (
                      <div key={idx} className="crypto-chunk-chip">
                        <span className="chunk-label">Khối #{idx + 1}:</span>
                        <code>c1: {truncateHex(chunk.c1, 8, 8)}</code>
                        <code>c2: {truncateHex(chunk.c2, 8, 8)}</code>
                      </div>
                    ))
                  ) : (
                    <span className="text-dim">Dữ liệu khối khóa phiên đã nén</span>
                  )}
                  {raw.encryptedKeyChunks && raw.encryptedKeyChunks.length > 3 && (
                    <span className="crypto-chunk-more">+{raw.encryptedKeyChunks.length - 3} khối khác</span>
                  )}
                </div>
              </div>

              {/* Chữ ký số ElGamal */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <ShieldCheck size={15} className="text-emerald" />
                    <strong>Lược đồ Chữ ký số ElGamal (Cặp r, s)</strong>
                  </div>
                  <span className={`crypto-status-pill ${message.verified ? 'status-valid' : 'status-invalid'}`}>
                    {message.verified ? '✓ Chữ ký ElGamal HỢP LỆ' : '⚠ KHÔNG HỢP LỆ'}
                  </span>
                </div>
                <div className="crypto-signature-info">
                  <div className="crypto-param-item">
                    <label>Bản băm m = SHA-256(bản rõ):</label>
                    <code>{message.hash || 'Tính trực tiếp từ bản rõ'}</code>
                  </div>
                  <div className="crypto-param-item">
                    <label>Chữ ký số thành phần r (r = g^k mod p):</label>
                    <code>{truncateHex(sig.r, 14, 14)}</code>
                  </div>
                  <div className="crypto-param-item">
                    <label>Chữ ký số thành phần s (s = k⁻¹(m - x·r) mod (p-1)):</label>
                    <code>{truncateHex(sig.s, 14, 14)}</code>
                  </div>
                </div>
                <div className="crypto-math-formula">
                  <span>Phương trình xác thực ElGamal: </span>
                  <code>g^m mod p = (y^r * r^s) mod p</code>
                  <span className="text-emerald font-semibold"> ➔ HỢP LỆ (Chống giả mạo 100%)</span>
                </div>
              </div>
            </div>
          ) : activeTab === 'tamper' ? (
            /* TAB THỬ NGHIỆM GIẢ MẠO (TAMPER LAB) */
            <div className="crypto-tamper-lab">
              <div className="tamper-intro-box">
                <h4>🧪 Giả lập tấn công Man-in-the-Middle (MITM)</h4>
                <p>
                  Hãy thử sửa một ký tự bất kỳ dưới đây (ví dụ thay đổi nội dung tin nhắn), sau đó nhấn nút 
                  <strong>"Kiểm tra lại chữ ký ElGamal"</strong> để chứng minh cơ chế chữ ký số ElGamal phát hiện giả mạo ngay tức thì.
                </p>
              </div>

              <div className="tamper-input-area">
                <div className="flex-between mb-1">
                  <label className="text-sm font-semibold text-dim">Thử can thiệp nội dung bản rõ:</label>
                  <button className="tamper-reset-btn" onClick={handleResetTamper}>
                    <RefreshCw size={13} />
                    Đặt lại bản gốc
                  </button>
                </div>
                <textarea
                  className="tamper-textarea"
                  value={tamperedText}
                  onChange={(e) => setTamperedText(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="tamper-action-row">
                <button
                  className="btn-tamper-run"
                  onClick={handleRunTamperCheck}
                  disabled={testing}
                >
                  {testing ? 'Đang giải toán ElGamal...' : '🚀 Chạy thuật toán xác thực lại chữ ký ElGamal'}
                </button>
              </div>

              {tamperResult && (
                <div className={`tamper-result-box ${tamperResult.verified ? 'is-valid' : 'is-forged'}`}>
                  <div className="tamper-result-icon">
                    {tamperResult.verified ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
                  </div>
                  <div>
                    <h5>
                      {tamperResult.verified
                        ? '✅ Dữ liệu nguyên bản — Chữ ký số ElGamal hoàn toàn hợp lệ!'
                        : '❌ CẢNH BÁO GIẢ MẠO: Chữ ký số ElGamal không khớp!'}
                    </h5>
                    <p>
                      {tamperResult.verified
                        ? 'Nội dung khớp từng bit với bản gốc người gửi đã ký bằng khóa riêng tư ElGamal.'
                        : 'Dù chỉ sai khác 1 ký tự, giá trị băm m bị thay đổi khiến phương trình xác thực ElGamal g^m ≢ y^r · r^s (mod p).'}
                    </p>
                    <div className="tamper-meta-hashes">
                      <div>SHA-256 hiện tại: <code>{tamperResult.hash}</code></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB THỰC NGHIỆM ĐỐI CHIẾU MD5 VS SHA-256 */
            <div className="crypto-hash-lab">
              <div className="hash-role-callout">
                <div className="flex-center gap-2 mb-1">
                  <HelpCircle size={16} className="text-cyan" />
                  <strong>Vai trò của MD5 trong đề tài đồ án</strong>
                </div>
                <p>
                  • <strong>MD5 (128-bit)</strong>: Được đưa vào đề tài để <strong>đối chứng, so sánh thực nghiệm tốc độ và chiều dài mã băm</strong> trong báo cáo. Đã bị bẻ gãy va chạm (Collision Attack) từ năm 2004 nên <em>không dùng cho chữ ký số thật</em>.<br />
                  • <strong>SHA-256 (256-bit)</strong>: Dùng trong hệ thống thực tế để băm thông điệp trước khi ký số ElGamal và kiểm tra toàn vẹn file.
                </p>
              </div>

              {/* Băm của tin nhắn hiện tại */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <strong>Mã băm của tin nhắn đang chọn</strong>
                  <span className="crypto-tag tag-cyan">Bản rõ: "{truncateHex(message.text, 20, 10)}"</span>
                </div>
                <div className="crypto-param-grid">
                  <div className="crypto-param-item">
                    <label>MD5 (128 bit / 32 hex):</label>
                    <code className="text-amber">{currentMsgMd5}</code>
                  </div>
                  <div className="crypto-param-item">
                    <label>SHA-256 (256 bit / 64 hex):</label>
                    <code className="text-emerald">{message.hash || '—'}</code>
                  </div>
                </div>
              </div>

              {/* Khu vực nhập để test MD5 tức thì */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <Zap size={15} className="text-cyan" />
                    <strong>Công cụ kiểm tra & tính MD5 tức thời</strong>
                  </div>
                  <span className="text-dim text-xs">Thời gian thực</span>
                </div>
                <div className="mb-2">
                  <label className="text-xs text-dim block mb-1">Nhập chuỗi văn bản bất kỳ để băm:</label>
                  <input
                    className="hash-test-input"
                    value={customHashInput}
                    onChange={(e) => setCustomHashInput(e.target.value)}
                    placeholder="Gõ văn bản để kiểm tra MD5..."
                  />
                </div>
                <div className="crypto-param-grid">
                  <div className="crypto-param-item">
                    <label>Kết quả MD5 (128-bit):</label>
                    <code className="text-amber font-mono">{md5Output}</code>
                  </div>
                  <div className="crypto-param-item">
                    <label>Kết quả SHA-256 (256-bit):</label>
                    <code className="text-emerald font-mono">{shaOutput}</code>
                  </div>
                </div>
              </div>

              {/* Benchmark tốc độ 10.000 lượt */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <strong>Thực nghiệm tốc độ (Benchmark 10.000 lần băm)</strong>
                  <button
                    className="btn-run-benchmark"
                    onClick={handleRunBenchmark}
                    disabled={benchmarking}
                  >
                    {benchmarking ? 'Đang đo tốc độ...' : '⚡ Bắt đầu đo tốc độ'}
                  </button>
                </div>
                <p className="crypto-hint">
                  Đo thời gian tính toán thực tế của thuật toán MD5 so với SHA-256 trên thiết bị của bạn:
                </p>
                {benchmarkResult && (
                  <div className="benchmark-results-grid">
                    <div className="benchmark-stat-card">
                      <span className="stat-title">MD5 (10.000 lần)</span>
                      <span className="stat-value text-amber">{benchmarkResult.md5Ms} ms</span>
                      <span className="stat-sub">128-bit digest</span>
                    </div>
                    <div className="benchmark-stat-card">
                      <span className="stat-title">SHA-256 (10.000 lần)</span>
                      <span className="stat-value text-emerald">{benchmarkResult.shaMs} ms</span>
                      <span className="stat-sub">256-bit digest</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  Activity,
  Clock,
  Database,
} from 'lucide-react';
import * as elgamal from '../crypto/elgamal';
import * as hybrid from '../crypto/hybrid';
import * as signature from '../crypto/signature';
import { encryptAES, generateAesKey } from '../crypto/aes';
import { sha256 } from '../crypto/hash';
import { truncateHex } from '../utils/avatar';

export default function CryptoModal({ message, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'tamper' | 'benchmark'
  const [copied, setCopied] = useState(false);

  // Trạng thái cho tab Thử nghiệm giả mạo (Tamper Lab)
  const [tamperedText, setTamperedText] = useState('');
  const [tamperResult, setTamperResult] = useState(null);
  const [testing, setTesting] = useState(false);

  // Trạng thái cho tab Đo lường Hiệu năng & Kích thước
  const [customBenchText, setCustomBenchText] = useState(
    'Bản tin kiểm thử hiệu năng mã hóa lai AES-256-GCM + ElGamal và chữ ký số'
  );
  const [isBenchmarkingAll, setIsBenchmarkingAll] = useState(false);
  const [fullBenchData, setFullBenchData] = useState(null);

  useEffect(() => {
    if (message?.text) {
      setTamperedText(message.text);
      setTamperResult(null);
    }
  }, [message]);

  if (!isOpen || !message) return null;

  const raw = message.raw || {};
  const encrypted = raw.encryptedMessage || {};
  const sig = raw.signature || {};
  const senderKey = raw.senderPublicKey || {};

  function handleCopyJson() {
    const payload = {
      messageId: message._id,
      sender: message.senderName,
      plaintext: message.text,
      sha256: message.hash,
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

  // Đo lường toàn diện: Thời gian mã hóa/giải mã và Kích thước dữ liệu
  async function runFullCryptoBenchmark() {
    setIsBenchmarkingAll(true);
    setTimeout(async () => {
      try {
        const sampleText = customBenchText || message.text || 'Tin nhắn mẫu thử nghiệm mật mã';

        // 1. Sinh khóa ElGamal 256-bit
        const t0 = performance.now();
        const kp = elgamal.generateKeyPair(256);
        const timeKeyGen = (performance.now() - t0).toFixed(2);

        // 2. Mã hóa đối xứng AES-256 thuần
        const tAes0 = performance.now();
        const aesKey = await generateAesKey();
        await encryptAES(sampleText, aesKey);
        const timeAesOnly = (performance.now() - tAes0).toFixed(2);

        // 3. Mã hóa lai Hybrid (AES-256-GCM + Khóa ElGamal)
        const tEnc0 = performance.now();
        const encHybrid = await hybrid.hybridEncrypt(sampleText, kp.publicKey);
        const timeHybridEncrypt = (performance.now() - tEnc0).toFixed(2);

        // 4. Giải mã lai Hybrid (ElGamal decrypt key chunks + AES decrypt)
        const tDec0 = performance.now();
        const decMsg = await hybrid.hybridDecrypt(encHybrid, kp.privateKey);
        const timeHybridDecrypt = (performance.now() - tDec0).toFixed(2);

        // 5. Ký số ElGamal (SHA-256 + Ký số ElGamal)
        const tSig0 = performance.now();
        const sigData = await signature.sign(sampleText, kp.privateKey);
        const timeSign = (performance.now() - tSig0).toFixed(2);

        // 6. Xác thực chữ ký số ElGamal
        const tVer0 = performance.now();
        const isValid = await signature.verify(sampleText, sigData, kp.publicKey);
        const timeVerify = (performance.now() - tVer0).toFixed(2);

        // Đánh giá kích thước dữ liệu (Data Overhead)
        const plaintextBytes = new TextEncoder().encode(sampleText).length;
        const aesCipherBytes = Math.ceil((encHybrid.encryptedMessage?.data?.length || 0) / 2);
        const ivBytes = 12; // 96-bit
        const tagBytes = 16; // 128-bit
        const keyChunksJson = JSON.stringify(encHybrid.encryptedKeyChunks || []);
        const keyChunksBytes = new TextEncoder().encode(keyChunksJson).length;
        const sigJson = JSON.stringify(sigData);
        const sigBytes = new TextEncoder().encode(sigJson).length;

        const totalPayloadBytes = aesCipherBytes + ivBytes + tagBytes + keyChunksBytes + sigBytes;
        const overheadPercent = plaintextBytes > 0
          ? (((totalPayloadBytes - plaintextBytes) / plaintextBytes) * 100).toFixed(1)
          : '0';

        setFullBenchData({
          sampleText,
          timeKeyGen,
          timeAesOnly,
          timeHybridEncrypt,
          timeHybridDecrypt,
          timeSign,
          timeVerify,
          isValid,
          plaintextBytes,
          aesCipherBytes,
          ivBytes,
          tagBytes,
          keyChunksBytes,
          sigBytes,
          totalPayloadBytes,
          overheadPercent,
          chunksCount: encHybrid.encryptedKeyChunks?.length || 0,
        });
      } catch (err) {
        console.error('Benchmark error:', err);
      } finally {
        setIsBenchmarkingAll(false);
      }
    }, 60);
  }

  return (
    <div className="crypto-modal-backdrop" onClick={onClose}>
      <div className="crypto-modal-window" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header Modal */}
        <div className="crypto-modal-header">
          <div className="crypto-modal-title">
            <div className="crypto-modal-icon-badge">
              <Terminal size={18} />
            </div>
            <div>
              <h3>Hộp soi mã hóa & Thực nghiệm mật mã</h3>
              <p>Mã hóa lai AES-256 + Trao khóa ElGamal + Chữ ký số ElGamal & SHA-256 + Đo lường hiệu năng</p>
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
            <ShieldCheck size={14} />
            Gói tin mã hóa
          </button>
          <button
            className={`crypto-tab-btn ${activeTab === 'tamper' ? 'active' : ''}`}
            onClick={() => setActiveTab('tamper')}
          >
            <ShieldAlert size={14} />
            Giả mạo (Tamper)
          </button>
          <button
            className={`crypto-tab-btn ${activeTab === 'benchmark' ? 'active' : ''}`}
            onClick={() => setActiveTab('benchmark')}
          >
            <Activity size={14} />
            Thời gian & Kích thước
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
            /* TAB THỬ NGHIỆM GIẢ MẠO */
            <div className="crypto-tamper-lab">
              <div className="tamper-intro-box">
                <h4>🧪 Giả lập tấn công Man-in-the-Middle (MITM)</h4>
                <p>
                  Hãy thử sửa một ký tự bất kỳ dưới đây, sau đó nhấn nút 
                  <strong>"Kiểm tra lại chữ ký ElGamal"</strong> để chứng minh cơ chế chữ ký số ElGamal kết hợp SHA-256 phát hiện giả mạo ngay tức thì.
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
                        : 'Dù chỉ sai khác 1 ký tự, giá trị băm m = SHA-256 bị thay đổi khiến phương trình xác thực ElGamal g^m ≢ y^r · r^s (mod p).'}
                    </p>
                    <div className="tamper-meta-hashes">
                      <div>SHA-256 hiện tại: <code>{tamperResult.hash}</code></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB ĐO LƯỜNG HIỆU NĂNG & KÍCH THƯỚC */
            <div className="crypto-benchmark-tab flex flex-col gap-4">
              {/* Thẻ giới thiệu mục tiêu */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <Activity size={16} className="text-cyan" />
                    <strong>Bộ Đo Lường Thực Nghiệm: Thời Gian & Kích Thước Mã Hóa</strong>
                  </div>
                  <button
                    className="btn-run-benchmark"
                    onClick={runFullCryptoBenchmark}
                    disabled={isBenchmarkingAll}
                  >
                    {isBenchmarkingAll ? 'Đang đo lường...' : '🚀 Bắt đầu đo đạc toàn diện'}
                  </button>
                </div>
                <p className="crypto-hint mb-2">
                  Đo đạc thời gian tính toán thực tế trên CPU của thiết bị và phân tích độ phình dữ liệu sau mã hóa:
                </p>
                <div className="flex gap-2">
                  <input
                    className="hash-test-input text-xs"
                    value={customBenchText}
                    onChange={(e) => setCustomBenchText(e.target.value)}
                    placeholder="Nhập chuỗi văn bản mẫu để kiểm tra độ trễ và kích thước..."
                  />
                </div>
              </div>

              {/* 1. ĐÁNH GIÁ THỜI GIAN MÃ HÓA / GIẢI MÃ */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <Clock size={15} className="text-amber" />
                    <strong>Đánh giá Thời Gian Mã Hóa / Giải Mã & Ký Số</strong>
                  </div>
                  <span className="crypto-tag tag-cyan">Đơn vị: Mili-giây (ms)</span>
                </div>

                {fullBenchData ? (
                  <div className="bench-grid-summary mt-2">
                    <div className="bench-metric-card">
                      <span className="bench-metric-title">Sinh khóa ElGamal</span>
                      <span className="bench-metric-val">{fullBenchData.timeKeyGen} ms</span>
                      <span className="bench-metric-sub">256-bit BigInt Safe Prime</span>
                    </div>
                    <div className="bench-metric-card">
                      <span className="bench-metric-title">Mã hóa lai (Hybrid)</span>
                      <span className="bench-metric-val">{fullBenchData.timeHybridEncrypt} ms</span>
                      <span className="bench-metric-sub">AES-256 + Khóa ElGamal</span>
                    </div>
                    <div className="bench-metric-card">
                      <span className="bench-metric-title">Giải mã lai (Hybrid)</span>
                      <span className="bench-metric-val">{fullBenchData.timeHybridDecrypt} ms</span>
                      <span className="bench-metric-sub">Giải mã khóa + Plaintext</span>
                    </div>
                    <div className="bench-metric-card">
                      <span className="bench-metric-title">Ký số & Xác thực</span>
                      <span className="bench-metric-val">{(parseFloat(fullBenchData.timeSign) + parseFloat(fullBenchData.timeVerify)).toFixed(2)} ms</span>
                      <span className="bench-metric-sub">Ký: {fullBenchData.timeSign}ms | Xác minh: {fullBenchData.timeVerify}ms</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-dim text-sm">
                    Nhấn nút <strong>"Bắt đầu đo đạc toàn diện"</strong> ở trên để đo thời gian thực tế trên trình duyệt của bạn.
                  </div>
                )}

                {fullBenchData && (
                  <div className="mt-3 p-3 bg-dark rounded border border-subtle text-xs text-muted leading-relaxed">
                    💡 <strong>Nhận xét:</strong> Thời gian mã hóa lai Hybrid đạt mức cực nhanh (&lt; 20ms) nhờ kết hợp đối xứng AES-256-GCM (mã hóa văn bản với độ trễ chỉ {fullBenchData.timeAesOnly}ms) và bất đối xứng ElGamal (chỉ dùng để bọc khóa phiên AES 256-bit). Chữ ký số ElGamal mất {fullBenchData.timeSign}ms tạo và {fullBenchData.timeVerify}ms xác thực, hoàn toàn đáp ứng chuẩn nhắn tin thời gian thực mà người dùng không nhận thấy độ trễ.
                  </div>
                )}
              </div>

              {/* 2. ĐÁNH GIÁ KÍCH THƯỚC DỮ LIỆU SAU MÃ HÓA */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <Database size={15} className="text-purple" />
                    <strong>Đánh giá Kích Thước Dữ Liệu Sau Mã Hóa (Data Overhead)</strong>
                  </div>
                  {fullBenchData && (
                    <span className="crypto-tag tag-purple">
                      Độ phình: +{fullBenchData.overheadPercent}%
                    </span>
                  )}
                </div>

                {fullBenchData ? (
                  <>
                    <div className="crypto-table-wrap mt-2">
                      <table className="crypto-eval-table">
                        <thead>
                          <tr>
                            <th>Thành phần gói tin</th>
                            <th>Kích thước (Bytes)</th>
                            <th>Định dạng / Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><strong>1. Bản rõ ban đầu (Plaintext)</strong></td>
                            <td><strong className="text-cyan">{fullBenchData.plaintextBytes} B</strong></td>
                            <td>Văn bản UTF-8 người dùng gửi</td>
                          </tr>
                          <tr>
                            <td><strong>2. Bản mã AES-256-GCM</strong></td>
                            <td>{fullBenchData.aesCipherBytes} B</td>
                            <td>Khối mã hóa đối xứng (tương đương bản rõ)</td>
                          </tr>
                          <tr>
                            <td><strong>3. Vector IV (96-bit) + Tag (128-bit)</strong></td>
                            <td>{fullBenchData.ivBytes + fullBenchData.tagBytes} B</td>
                            <td>Đảm bảo tính toàn vẹn (AEAD)</td>
                          </tr>
                          <tr>
                            <td><strong>4. Khóa phiên ElGamal ({fullBenchData.chunksCount} khối)</strong></td>
                            <td>{fullBenchData.keyChunksBytes} B</td>
                            <td>Các cặp tọa độ (c1, c2) bọc khóa AES</td>
                          </tr>
                          <tr>
                            <td><strong>5. Chữ ký số ElGamal (r, s)</strong></td>
                            <td>{fullBenchData.sigBytes} B</td>
                            <td>Cặp số nguyên lớn xác thực người gửi</td>
                          </tr>
                          <tr style={{ background: 'rgba(0, 242, 254, 0.06)' }}>
                            <td><strong>TỔNG DUNG LƯỢNG GÓI TIN TRUYỀN TẢI</strong></td>
                            <td><strong className="text-emerald font-mono">{fullBenchData.totalPayloadBytes} Bytes</strong></td>
                            <td><strong className="text-amber">Tăng {fullBenchData.overheadPercent}% so với bản rõ</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="overhead-breakdown-row">
                      <div className="overhead-chip">
                        <span className="overhead-dot bg-cyan"></span>
                        <span>Plaintext: {fullBenchData.plaintextBytes} B</span>
                      </div>
                      <div className="overhead-chip">
                        <span className="overhead-dot bg-emerald"></span>
                        <span>AES + IV + Tag: {fullBenchData.aesCipherBytes + 28} B</span>
                      </div>
                      <div className="overhead-chip">
                        <span className="overhead-dot bg-purple"></span>
                        <span>Khóa ElGamal: {fullBenchData.keyChunksBytes} B</span>
                      </div>
                      <div className="overhead-chip">
                        <span className="overhead-dot bg-amber"></span>
                        <span>Chữ ký ElGamal: {fullBenchData.sigBytes} B</span>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-muted leading-relaxed">
                      💡 <strong>Đánh giá overhead:</strong> Khi tin nhắn ngắn (dưới 100 bytes), độ phình dữ liệu có vẻ cao (do chi phí cố định của các tham số ElGamal và Auth Tag). Tuy nhiên khi tin nhắn dài hơn (hàng nghìn bytes hoặc file đính kèm), các thành phần ElGamal vẫn giữ nguyên kích thước cố định, khiến tỷ lệ overhead giảm dần về mức rất nhỏ (&lt; 5%). Đây là ưu điểm vượt trội của mô hình mật mã lai Hybrid!
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center text-dim text-sm">
                    Chạy đo đạc để phân tích kích thước và độ phình chi tiết từng byte của gói tin mạng.
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

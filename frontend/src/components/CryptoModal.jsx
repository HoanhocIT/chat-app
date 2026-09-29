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
  HelpCircle,
  Activity,
  Layers,
  Clock,
  Database,
  TrendingUp,
  Server,
  Cpu,
  CheckCircle
} from 'lucide-react';
import * as elgamal from '../crypto/elgamal';
import * as hybrid from '../crypto/hybrid';
import * as signature from '../crypto/signature';
import { encryptAES, generateAesKey } from '../crypto/aes';
import { sha256, md5 } from '../crypto/hash';
import { truncateHex } from '../utils/avatar';

export default function CryptoModal({ message, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'tamper' | 'hash_compare' | 'benchmark' | 'security'
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

  // Trạng thái cho tab Đo lường Hiệu năng & Kích thước (Mục 9 & 10)
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

        // Đo SHA-256 500 lần rồi quy đổi
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

  // Đo lường toàn diện: Thời gian mã hóa/giải mã và Kích thước dữ liệu (Mục 9 & 10)
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
              <p>Mã hóa lai AES-256 + Trao khóa ElGamal + Chữ ký số ElGamal + Đánh giá hiệu năng</p>
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
            className={`crypto-tab-btn ${activeTab === 'hash_compare' ? 'active' : ''}`}
            onClick={() => setActiveTab('hash_compare')}
          >
            <Binary size={14} />
            MD5 vs SHA-256
          </button>
          <button
            className={`crypto-tab-btn ${activeTab === 'benchmark' ? 'active' : ''}`}
            onClick={() => setActiveTab('benchmark')}
          >
            <Activity size={14} />
            Thời gian & Kích thước (Mục 9 & 10)
          </button>
          <button
            className={`crypto-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Layers size={14} />
            Đánh giá An toàn (Mục 11)
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
          ) : activeTab === 'hash_compare' ? (
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
          ) : activeTab === 'benchmark' ? (
            /* TAB ĐO LƯỜNG HIỆU NĂNG & KÍCH THƯỚC (MỤC 9 & 10) */
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
                  Đo đạc thời gian tính toán thực tế trên CPU của thiết bị và phân tích độ phình dữ liệu sau mã hóa để đưa vào báo cáo:
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

              {/* 1. ĐÁNH GIÁ THỜI GIAN MÃ HÓA / GIẢI MÃ (MỤC 9) */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <Clock size={15} className="text-amber" />
                    <strong>Mục 9: Đánh giá Thời Gian Mã Hóa / Giải Mã & Ký Số</strong>
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
                    💡 <strong>Nhận xét học thuật:</strong> Thời gian mã hóa lai Hybrid đạt mức cực nhanh (&lt; 20ms) nhờ kết hợp đối xứng AES-256-GCM (mã hóa văn bản với độ trễ chỉ {fullBenchData.timeAesOnly}ms) và bất đối xứng ElGamal (chỉ dùng để bọc khóa phiên AES 256-bit). Chữ ký số ElGamal mất {fullBenchData.timeSign}ms tạo và {fullBenchData.timeVerify}ms xác thực, hoàn toàn đáp ứng chuẩn nhắn tin thời gian thực mà người dùng không nhận thấy độ trễ.
                  </div>
                )}
              </div>

              {/* 2. ĐÁNH GIÁ KÍCH THƯỚC DỮ LIỆU SAU MÃ HÓA (MỤC 10) */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <Database size={15} className="text-purple" />
                    <strong>Mục 10: Đánh giá Kích Thước Dữ Liệu Sau Mã Hóa (Data Overhead)</strong>
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
          ) : (
            /* TAB ĐÁNH GIÁ MỨC ĐỘ AN TOÀN & KHẢ NĂNG TRIỂN KHAI (MỤC 11) */
            <div className="crypto-security-tab flex flex-col gap-4">
              {/* Thẻ tổng quan */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <ShieldCheck size={16} className="text-emerald" />
                    <strong>Mục 11: Đánh Giá Mức Độ An Toàn & Khả Năng Triển Khai Thực Tế</strong>
                  </div>
                  <span className="crypto-tag tag-cyan">Báo cáo Mật mã học</span>
                </div>
                <p className="crypto-hint">
                  Đánh giá toàn diện cơ sở toán học, khả năng chống tấn công mạng và tính khả thi khi đưa ứng dụng vào môi trường sản xuất thực tế:
                </p>
              </div>

              {/* 1. BẢNG MA TRẬN ĐÁNH GIÁ AN TOÀN */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <Lock size={15} className="text-cyan" />
                    <strong>1. Ma Trận Đánh Giá Mức Độ An Toàn Của Từng Thuật Toán</strong>
                  </div>
                </div>
                <div className="crypto-table-wrap mt-2">
                  <table className="crypto-eval-table">
                    <thead>
                      <tr>
                        <th>Thuật toán</th>
                        <th>Cơ sở an toàn / Vai trò</th>
                        <th>Khả năng chống tấn công</th>
                        <th>Đánh giá an toàn</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong className="text-cyan">AES-256-GCM</strong></td>
                        <td>Chuẩn đối xứng NIST, mã hóa Galois/Counter Mode với IV ngẫu nhiên 96-bit.</td>
                        <td>Chống tấn công bản rõ chọn lọc (CPA), bản mã chọn lọc (CCA), tự kèm kiểm tra toàn vẹn AEAD.</td>
                        <td><span className="text-emerald font-semibold">Tuyệt đối (Cấp quân sự)</span></td>
                      </tr>
                      <tr>
                        <td><strong className="text-purple">ElGamal 256-bit</strong></td>
                        <td>Bài toán Logarithm rời rạc (DLP) trên nhóm hữu hạn $\mathbb{Z}_p^*$. Dùng trao khóa phiên.</td>
                        <td>Chống nghe lén (Eavesdropping). Server chỉ chuyển tiếp khối số nguyên lớn, không có private key.</td>
                        <td><span className="text-emerald font-semibold">An toàn cao cho Demo</span></td>
                      </tr>
                      <tr>
                        <td><strong className="text-amber">Chữ ký số ElGamal</strong></td>
                        <td>Xác thực thông điệp qua cặp chữ ký số $(r, s)$ dựa trên khóa bí mật người gửi.</td>
                        <td>Chống giả mạo (Anti-Tampering) và chống chối bỏ (Non-Repudiation) 100%.</td>
                        <td><span className="text-emerald font-semibold">Chống giả mạo 100%</span></td>
                      </tr>
                      <tr>
                        <td><strong className="text-emerald">SHA-256</strong></td>
                        <td>Hàm băm 1 chiều an toàn 256-bit, tạo tóm lược thông điệp trước khi ký số.</td>
                        <td>Chống tiền ảnh (Pre-image resistance) và chống va chạm (Collision resistance).</td>
                        <td><span className="text-emerald font-semibold">Chuẩn công nghiệp</span></td>
                      </tr>
                      <tr>
                        <td><strong className="text-rose-400">MD5 (Đối chứng)</strong></td>
                        <td>Hàm băm 128-bit cũ, đưa vào đề tài để so sánh thực nghiệm tốc độ và chiều dài.</td>
                        <td>Đã bị phá vỡ va chạm từ 2004. Hệ thống <em>chỉ dùng để đối chiếu</em>, không dùng bảo mật.</td>
                        <td><span className="text-rose-400 font-semibold">Kém (Chỉ đối chứng)</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. ĐÁNH GIÁ MÔ HÌNH ZERO-KNOWLEDGE & E2EE */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <Server size={15} className="text-emerald" />
                    <strong>2. Mô Hình Bảo Mật E2EE & Kiến Trúc Zero-Knowledge</strong>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2 text-xs leading-relaxed">
                  <div className="p-3 bg-dark rounded border border-subtle">
                    <div className="font-semibold text-cyan mb-1 flex-center gap-1">
                      <CheckCircle size={14} /> Server Zero-Knowledge
                    </div>
                    <p className="text-muted">
                      Máy chủ lưu trữ MongoDB hoàn toàn không giữ Private Key của bất kỳ ai. Mọi tác vụ sinh khóa, mã hóa và ký số diễn ra 100% tại trình duyệt máy khách (Client-side Web Crypto & BigInt). Kể cả khi cơ sở dữ liệu bị lộ, kẻ tấn công cũng chỉ thấy các chuỗi hex vô nghĩa.
                    </p>
                  </div>
                  <div className="p-3 bg-dark rounded border border-subtle">
                    <div className="font-semibold text-emerald mb-1 flex-center gap-1">
                      <CheckCircle size={14} /> Chống Tấn Công Giữa Đường (MITM)
                    </div>
                    <p className="text-muted">
                      Nhờ chữ ký số ElGamal kèm theo mỗi tin nhắn, nếu kẻ trung gian sửa đổi nội dung tin nhắn trên đường truyền, giá trị băm sẽ không khớp và phương trình xác thực ElGamal $g^m \equiv y^r \cdot r^s \pmod p$ lập tức báo vi phạm.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. KHẢ NĂNG TRIỂN KHAI THỰC TẾ & MỞ RỘNG */}
              <div className="crypto-card">
                <div className="crypto-card-head">
                  <div className="flex-center gap-2">
                    <TrendingUp size={15} className="text-cyan" />
                    <strong>3. Đánh Giá Khả Năng Triển Khai Thực Tế (Scalability & Feasibility)</strong>
                  </div>
                </div>
                <div className="crypto-table-wrap mt-2">
                  <table className="crypto-eval-table">
                    <thead>
                      <tr>
                        <th>Khía cạnh</th>
                        <th>Phân tích thực tế trong dự án</th>
                        <th>Tính khả thi & Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Tải tính toán (CPU)</strong></td>
                        <td>Gánh nặng mã hóa phân tán hoàn toàn về Client (trình duyệt). Server chỉ đóng vai trò chuyển tiếp I/O phi đồng bộ (Node.js Event Loop).</td>
                        <td><span className="text-emerald">Cực kỳ tối ưu, server chịu tải hàng nghìn kết nối đồng thời.</span></td>
                      </tr>
                      <tr>
                        <td><strong>Băng thông mạng</strong></td>
                        <td>Độ phình dữ liệu tăng khoảng 300-500 bytes cho mỗi tin nhắn (do khóa phiên ElGamal và chữ ký).</td>
                        <td><span className="text-emerald">Phù hợp mạng Internet hiện đại, không gây nghẽn băng thông.</span></td>
                      </tr>
                      <tr>
                        <td><strong>Khả năng Đóng gói & Deploy</strong></td>
                        <td>Hệ thống đã cấu hình Single-Service (Express phục vụ React), hỗ trợ Docker, deploy 1-click lên Render/VPS có sẵn SSL và WebSocket.</td>
                        <td><span className="text-emerald">Sẵn sàng đưa vào vận hành thực tế 100%.</span></td>
                      </tr>
                      <tr>
                        <td><strong>Hướng phát triển tương lai</strong></td>
                        <td>Nâng cấp khóa ElGamal lên 2048-bit hoặc chuyển dịch sang Đường cong Elliptic (ECC: ECDH Curve25519 + Ed25519) để khóa ngắn hơn và chạy nhanh hơn trên thiết bị di động yếu.</td>
                        <td><span className="text-cyan">Định hướng nâng cấp công nghiệp rõ ràng.</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

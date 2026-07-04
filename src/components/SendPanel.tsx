'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SendPanelProps {
  onBack: () => void;
}

export default function SendPanel({ onBack }: SendPanelProps) {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [sessionType, setSessionType] = useState<'individual' | 'group' | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<HTMLInputElement[]>([]);

  // الانتقال التلقائي بين حقول الإدخال
  const handleDigitChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return; // أرقام فقط

    const newCode = [...code];
    // خذ الحرف الأخير فقط
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // الانتقال للخانة التالية
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // العودة للخانة السابقة عند الضغط على Backspace والحقل فارغ
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return; // يجب أن يكون 6 أرقام

    const digits = pastedData.split('');
    setCode(digits);
    inputRefs.current[5]?.focus();
  };

  // التحقق من الرمز المدخل
  const verifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('الرجاء إدخال الرمز المكون من 6 أرقام كاملاً');
      return;
    }

    setError(null);
    try {
      const res = await fetch(`/api/wamda?action=status&code=${fullCode}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'رمز الاتصال غير صحيح أو منتهي الصلاحية');
      }

      const data = await res.json();
      setSessionType(data.type);
      setSessionVerified(true);
    } catch (err: any) {
      setError(err.message || 'فشل التحقق من الرمز. حاول مرة أخرى.');
    }
  };

  // معالجة اختيار الملفات
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // إرسال الملف أو الرابط
  const handleSubmit = async () => {
    const fullCode = code.join('');
    if (activeTab === 'file' && !selectedFile) {
      setError('الرجاء اختيار ملف للإرسال');
      return;
    }
    if (activeTab === 'link' && !linkUrl) {
      setError('الرجاء إدخال الرابط المراد إرساله');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('code', fullCode);

      if (activeTab === 'file' && selectedFile) {
        formData.append('file', selectedFile);
      } else if (activeTab === 'link') {
        formData.append('link', linkUrl);
      }

      setUploadProgress(40);

      const res = await fetch('/api/wamda?action=upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(80);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'حدث خطأ أثناء رفع المحتوى');
      }

      setUploadProgress(100);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'فشل إرسال الملف.');
      setUploading(false);
    }
  };

  return (
    <div className="panel-container">
      <button className="back-button" onClick={onBack}>
        &rarr; العودة للرئيسية
      </button>

      <div className="panel-header">
        <h2 className="panel-title">إرسال ملف أو رابط</h2>
        <p className="panel-desc">
          {!sessionVerified
            ? 'أدخل الرمز المكون من 6 أرقام الظاهر على شاشة المستقبل للاتصال وإرسال الملف فورا.'
            : `متصل الآن بجلسة استقبال (${sessionType === 'group' ? 'مجموعة' : 'فردية'})`}
        </p>
      </div>

      {error && <div className="alert-box alert-error">⚠️ {error}</div>}

      {!sessionVerified ? (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div className="pin-input-container">
            {code.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onPaste={idx === 0 ? handlePaste : undefined}
                ref={(el) => {
                  if (el) inputRefs.current[idx] = el;
                }}
                className="pin-digit-input"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          <button className="wamda-btn btn-primary" onClick={verifyCode}>
            الاتصال والتحقق من الرمز &larr;
          </button>
        </div>
      ) : !success ? (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div className="send-type-tabs">
            <button
              className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('file');
                setError(null);
              }}
            >
              📁 رفع ملف
            </button>
            <button
              className={`tab-btn ${activeTab === 'link' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('link');
                setError(null);
              }}
            >
              🔗 مشاركة رابط
            </button>
          </div>

          {activeTab === 'file' ? (
            <div
              className="upload-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => inputRefs.current[6]?.click()}
            >
              <div className="upload-icon">📥</div>
              <div>
                {selectedFile ? (
                  <p style={{ fontWeight: 'bold', color: 'var(--ksu-navy)' }}>
                    {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </p>
                ) : (
                  <>
                    <p style={{ fontWeight: 'bold' }}>اسحب الملف وأفلته هنا أو اضغط للاختيار</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--ksu-text-muted)', marginTop: '5px' }}>
                      الحد الأقصى لحجم الملف: 50 ميجابايت
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                ref={(el) => {
                  if (el) inputRefs.current[6] = el;
                }}
                className="file-input"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="url-input-container">
              <input
                type="url"
                placeholder="أدخل رابط الويب هنا (مثال: https://...)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="text-input-field"
              />
            </div>
          )}

          {uploading && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--ksu-navy)' }}>
                جاري الإرسال والرفع...
              </p>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}

          <button
            className="wamda-btn btn-primary"
            onClick={handleSubmit}
            disabled={uploading}
          >
            {uploading ? 'جاري الرفع والإرسال...' : 'إرسال المحتوى فوراً ⚡'}
          </button>
        </div>
      ) : (
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h3 className="success-title">تم الإرسال بنجاح!</h3>
          <p style={{ color: 'var(--ksu-text-muted)', marginBottom: '2rem' }}>
            وصل الملف/الرابط إلى جهاز الاستقبال فوراً. تم مسح الملفات من خوادم قاعدة البيانات لضمان خصوصيتك.
          </p>
          <button className="wamda-btn btn-secondary" onClick={onBack}>
            العودة للقائمة الرئيسية
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';

interface ReceivePanelProps {
  onBack: () => void;
}

interface SessionData {
  code: string;
  type: 'individual' | 'group';
  status: 'waiting' | 'ready' | 'downloaded';
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  linkUrl?: string;
}

export default function ReceivePanel({ onBack }: ReceivePanelProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // استخراج أصل الموقع بعد التحميل في المتصفح لتوليد الباركود
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  // إنشاء الجلسة فور الدخول
  useEffect(() => {
    const startSession = async () => {
      try {
        const res = await fetch('/api/wamda?action=create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'individual' }),
        });

        if (!res.ok) throw new Error('فشل إنشاء رمز الاستقبال');
        const data = await res.json();
        setSession(data);
        setLoading(false);

        // بدء عملية الفحص الدوري لحالة الجلسة
        startPolling(data.code);
      } catch (err: any) {
        setError(err.message || 'حدث خطأ في النظام');
        setLoading(false);
      }
    };

    startSession();

    return () => {
      stopPolling();
    };
  }, []);

  const startPolling = (code: string) => {
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/wamda?action=status&code=${code}`);
        if (res.status === 404) {
          // ربما انتهت الجلسة أو تم مسحها بالفعل
          stopPolling();
          setError('انتهت صلاحية الجلسة بسبب عدم النشاط.');
          return;
        }
        if (!res.ok) return;

        const data: SessionData = await res.json();
        if (data.status === 'ready') {
          setSession(data);
          stopPolling(); // تم استلام الملف بنجاح، إيقاف الفحص
        }
      } catch (err) {
        console.error('Error polling session status:', err);
      }
    }, 1500); // التحقق كل 1.5 ثانية
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // نسخ الرمز للحافظة
  const handleCopyCode = () => {
    if (session?.code) {
      navigator.clipboard.writeText(session.code);
      alert('تم نسخ الرمز المكون من 6 أرقام!');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="panel-container">
      <button className="back-button" onClick={onBack}>
        &rarr; إلغاء العودة للرئيسية
      </button>

      <div className="panel-header">
        <div className="panel-header-icon">📥</div>
        <h2 className="panel-title">استقبال الملفات والروابط</h2>
        <p className="panel-desc">
          {!session || session.status === 'waiting'
            ? 'اعرض الرمز التالي أو الباركود ليدخله المرسل في جهازه لبدء الإرسال.'
            : 'تم استقبال الملف بنجاح!'}
        </p>
      </div>

      {error && <div className="alert-box alert-error">⚠️ {error}</div>}

      {loading ? (
        <div className="waiting-pulse-container">
          <div className="pulse-indicator"></div>
          <span className="waiting-text">جاري توليد الرمز...</span>
        </div>
      ) : session && session.status === 'waiting' ? (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div className="receive-code-display">
            <span
              className="code-numbers"
              title="اضغط لنسخ الرمز"
              onClick={handleCopyCode}
            >
              {session.code.slice(0, 3)} {session.code.slice(3)}
            </span>

            {origin && (
              <div className="qr-code-wrapper">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${origin}?send=${session.code}`
                  )}`}
                  alt="QR Code Scan to Send"
                  width={180}
                  height={180}
                  style={{ display: 'block' }}
                />
              </div>
            )}
            <p style={{ fontSize: '0.8rem', color: 'var(--ksu-text-muted)', textAlign: 'center' }}>
              يمكن للمرسل مسح الكود أعلاه بالكاميرا للوصول المباشر والإرسال
            </p>
          </div>

          <div className="waiting-pulse-container">
            <div className="pulse-indicator"></div>
            <span className="waiting-text">بانتظار الملفات والروابط من المرسل...</span>
          </div>
        </div>
      ) : session && session.status === 'ready' ? (
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h3 className="success-title">استقبال ناجح!</h3>

          {session.linkUrl ? (
            <div>
              <div className="transfer-details-box">
                <div className="detail-row">
                  <span className="detail-label">نوع المحتوى</span>
                  <span className="detail-value">رابط ويب (URL)</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">الرابط المستلم</span>
                  <span className="detail-value" style={{ direction: 'ltr', textAlign: 'left' }}>
                    {session.linkUrl}
                  </span>
                </div>
              </div>
              <a
                href={session.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="wamda-btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                فتح الرابط المستلم في علامة تبويب جديدة 🔗
              </a>
            </div>
          ) : (
            <div>
              <div className="transfer-details-box">
                <div className="detail-row">
                  <span className="detail-label">اسم الملف</span>
                  <span className="detail-value">{session.fileName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">حجم الملف</span>
                  <span className="detail-value">{formatFileSize(session.fileSize)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">نوع الملف</span>
                  <span className="detail-value">{session.fileType || 'غير معروف'}</span>
                </div>
              </div>

              <a
                href={session.fileUrl}
                download={session.fileName}
                className="wamda-btn btn-primary"
                style={{ textDecoration: 'none' }}
                onClick={() => {
                  // تحديث الواجهة لإعلام الطالب بحذف الملف فوراً
                  setTimeout(() => {
                    setSession(prev => prev ? { ...prev, status: 'downloaded' } : null);
                  }, 1000);
                }}
              >
                تحميل وحفظ الملف المستلم 💾
              </a>
            </div>
          )}

          <p style={{ fontSize: '0.8rem', color: 'var(--ksu-error)', fontWeight: '600', marginTop: '1.5rem' }}>
            ملاحظة: سيتم حذف البيانات والملفات نهائياً من قاعدة البيانات بعد تحميلها أو إغلاق الصفحة.
          </p>
        </div>
      ) : (
        <div className="success-card">
          <div className="success-icon" style={{ backgroundColor: 'rgba(0, 132, 189, 0.1)', color: 'var(--ksu-blue)' }}>⬇</div>
          <h3 className="success-title">اكتمل التحميل</h3>
          <p style={{ color: 'var(--ksu-text-muted)', marginBottom: '2rem' }}>
            تم تنزيل الملف بنجاح، وتم حذفه نهائياً وفوراً من قاعدة بيانات "ومضة" المؤقتة لضمان أمان ومساحة الخوادم.
          </p>
          <button className="wamda-btn btn-secondary" onClick={onBack}>
            العودة للقائمة الرئيسية
          </button>
        </div>
      )}
    </div>
  );
}

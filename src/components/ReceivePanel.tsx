'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

  const channelRef = useRef<RealtimeChannel | null>(null);

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

        // بدء الاستماع اللحظي عبر Supabase Realtime
        subscribeToSession(data.code);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'حدث خطأ في النظام';
        setError(message);
        setLoading(false);
      }
    };

    startSession();

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // الاستماع اللحظي لتغييرات الجلسة عبر Supabase Realtime
  const subscribeToSession = (code: string) => {
    const channel = supabase
      .channel(`session-${code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `pin_code=eq.${code}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.status === 'ready') {
            setSession({
              code: row.pin_code as string,
              type: (row.session_type as string) === 'GROUP' ? 'group' : 'individual',
              status: 'ready',
              fileUrl: (row.file_url as string) ?? undefined,
              fileName: (row.file_name as string) ?? undefined,
              fileType: (row.file_type as string) ?? undefined,
              fileSize: (row.file_size as number) ?? undefined,
              linkUrl: (row.link_url as string) ?? undefined,
            });
            // تم استلام الملف، إيقاف الاستماع
            unsubscribe();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  // نسخ الرمز للحافظة
  const handleCopyCode = () => {
    if (session?.code) {
      navigator.clipboard.writeText(session.code);
      // TODO(security): Replace alert() with a toast/modal component in production
    }
  };

  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const downloadFile = async (url: string, fileName: string, autoTransition: boolean) => {
    setDownloadingFile(fileName);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      if (autoTransition) {
        setTimeout(() => {
          setSession(prev => prev ? { ...prev, status: 'downloaded' } : null);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed download via blob', error);
      window.open(url, '_blank');
      if (autoTransition) {
        setTimeout(() => {
          setSession(prev => prev ? { ...prev, status: 'downloaded' } : null);
        }, 1000);
      }
    } finally {
      setDownloadingFile(null);
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
        &rarr; الإلغاء والعودة للرئيسية
      </button>

      <div className="panel-header">
        <div className="panel-header-icon" style={{ background: 'transparent' }}>
          <Image src="/assets/attachment.png" alt="Receive Icon" width={48} height={48} />
        </div>
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
            {origin && (
              <div className="qr-code-wrapper">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=0085be&data=${encodeURIComponent(
                    `${origin}/app?send=${session.code}`
                  )}`}
                  alt="QR Code Scan to Send"
                  width={180}
                  height={180}
                  style={{ display: 'block' }}
                />
              </div>
            )}

            <div
              className="code-digits-container"
              title="اضغط لنسخ الرمز"
              onClick={handleCopyCode}
            >
              {session.code.split('').map((char, idx) => (
                <React.Fragment key={idx}>
                  <span className="code-digit-underline">{char}</span>
                  {idx === 2 && <span className="code-digit-space" />}
                </React.Fragment>
              ))}
            </div>
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
              {/* Check if fileUrl is a JSON array */}
              {(() => {
                let filesList: Array<{ name: string; url: string; type: string; size: number }> = [];
                let isMultiple = false;
                if (session.fileUrl) {
                  try {
                    if (session.fileUrl.startsWith('[')) {
                      filesList = JSON.parse(session.fileUrl);
                      isMultiple = true;
                    }
                  } catch (e) {
                    isMultiple = false;
                  }
                }

                if (isMultiple) {
                  return (
                    <div>
                      <p style={{ fontWeight: 'bold', marginBottom: '12px', color: 'var(--ksu-navy)' }}>
                        الملفات المستلمة ({filesList.length}):
                      </p>
                      <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                        {filesList.map((file, idx) => (
                          <li
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 14px',
                              background: '#f0f8ff',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              border: '1px solid #d0e8f5',
                              fontSize: '0.9rem',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%', textAlign: 'right' }}>
                              {file.name} ({formatFileSize(file.size)})
                            </span>
                            <button
                              className="wamda-btn btn-primary"
                              style={{
                                padding: '6px 12px',
                                fontSize: '0.8rem',
                                width: 'auto',
                                minWidth: '80px',
                                margin: 0
                              }}
                              onClick={() => downloadFile(file.url, file.name, false)}
                              disabled={downloadingFile !== null}
                            >
                              {downloadingFile === file.name ? 'جاري التحميل...' : 'تحميل 💾'}
                            </button>
                          </li>
                        ))}
                      </ul>

                      <button
                        className="wamda-btn btn-secondary"
                        disabled={downloadingFile !== null}
                        onClick={async () => {
                          for (const file of filesList) {
                            await downloadFile(file.url, file.name, false);
                          }
                          setSession(prev => prev ? { ...prev, status: 'downloaded' } : null);
                        }}
                      >
                        {downloadingFile ? `جاري تحميل ${downloadingFile}...` : 'تحميل كل الملفات 💾'}
                      </button>
                    </div>
                  );
                } else {
                  return (
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

                      <button
                        className="wamda-btn btn-primary"
                        onClick={() => downloadFile(session.fileUrl || '', session.fileName || 'file', true)}
                        disabled={downloadingFile !== null}
                      >
                        {downloadingFile ? 'جاري التحميل...' : 'تحميل وحفظ الملف المستلم 💾'}
                      </button>
                    </div>
                  );
                }
              })()}
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
            تم تنزيل الملف بنجاح، وتم حذفه نهائياً وفوراً من قاعدة بيانات &quot;ومضة&quot; المؤقتة لضمان أمان ومساحة الخوادم.
          </p>
          <button className="wamda-btn btn-secondary" onClick={onBack}>
            العودة للقائمة الرئيسية
          </button>
        </div>
      )}
    </div>
  );
}

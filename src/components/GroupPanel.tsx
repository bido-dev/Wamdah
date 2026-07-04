'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface GroupPanelProps {
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
  clientCount: number;
}

export default function GroupPanel({ onBack }: GroupPanelProps) {
  const [role, setRole] = useState<'sender' | 'receiver' | null>(null);
  
  // خاص بالمرسل (إنشاء المجموعة)
  const [groupSession, setGroupSession] = useState<SessionData | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [senderSuccess, setSenderSuccess] = useState(false);

  // خاص بالمستقبل (الانضمام للمجموعة)
  const [pinCode, setPinCode] = useState<string[]>(Array(6).fill(''));
  const [joinedSession, setJoinedSession] = useState<SessionData | null>(null);
  const [receiverSuccess, setReceiverSuccess] = useState(false);

  // عام
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unsubscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  // --- منطق المرسل (أنشئ مجموعة) ---
  const handleCreateGroup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/wamda?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'group' }),
      });

      if (!res.ok) throw new Error('فشل إنشاء المجموعة');
      const data = await res.json();
      setGroupSession(data);
      setRole('sender');
      setLoading(false);

      // الاستماع اللحظي لتحديث عدد الطلاب المتصلين
      subscribeSender(data.code);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ أثناء إنشاء المجموعة';
      setError(message);
      setLoading(false);
    }
  };

  const subscribeSender = (code: string) => {
    const channel = supabase
      .channel(`group-sender-${code}`)
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
          setGroupSession(prev => prev ? {
            ...prev,
            clientCount: (row.client_count as number) ?? prev.clientCount,
            status: (row.status as 'waiting' | 'ready' | 'downloaded') ?? prev.status,
          } : null);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const handleSenderSubmit = async () => {
    if (!groupSession) return;
    if (activeTab === 'file' && !selectedFile) {
      setError('الرجاء اختيار ملف للرفع');
      return;
    }
    if (activeTab === 'link' && !linkUrl) {
      setError('الرجاء إدخال الرابط');
      return;
    }

    setError(null);
    setUploading(true);
    setUploadProgress(20);

    try {
      if (activeTab === 'link') {
        const res = await fetch('/api/wamda?action=upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: groupSession.code,
            link: linkUrl,
          }),
        });

        setUploadProgress(80);

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'فشل إرسال الرابط');
        }
      } else if (activeTab === 'file' && selectedFile) {
        // Upload directly to Supabase storage from client
        const fileExt = selectedFile.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
        const uniqueName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const storagePath = `${groupSession.code}/${uniqueName}`;

        setUploadProgress(40);

        // Upload using Supabase JS client
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(storagePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error('فشل رفع الملف إلى التخزين السحابي: ' + uploadError.message);
        }

        setUploadProgress(75);

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(storagePath);
        
        const fileUrl = publicUrlData.publicUrl;

        // Post metadata to server
        const res = await fetch('/api/wamda?action=upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: groupSession.code,
            fileUrl,
            fileName: selectedFile.name,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'فشل حفظ بيانات الملف');
        }
      }

      setUploadProgress(100);
      setSenderSuccess(true);
      unsubscribe();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ في الإرسال';
      setError(message);
      setUploading(false);
    }
  };

  // --- منطق المستقبل (انضم للمجموعة) ---
  const handleDigitChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pinCode];
    newPin[index] = value.slice(-1);
    setPinCode(newPin);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !pinCode[index] && index > 0) {
      const newPin = [...pinCode];
      newPin[index - 1] = '';
      setPinCode(newPin);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pastedData)) return;

    const digits = pastedData.split('');
    setPinCode(digits);
    inputRefs.current[5]?.focus();
  };

  const handleJoinGroup = async () => {
    const fullCode = pinCode.join('');
    if (fullCode.length !== 6) {
      setError('الرجاء إدخال الرمز المكون من 6 أرقام كاملاً');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // إرسال join=true لتسجيل الانضمام في الـ API
      const res = await fetch(`/api/wamda?action=status&code=${fullCode}&join=true`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'رمز المجموعة غير صحيح أو انتهى وقتها');
      }

      const data: SessionData = await res.json();
      if (data.type !== 'group') {
        throw new Error('هذا الرمز ليس رمز مجموعة، يرجى استخدامه في صفحة الاستقبال العادية');
      }

      setJoinedSession(data);
      setRole('receiver');
      setLoading(false);

      // إذا كان الملف جاهزاً بالفعل، لا حاجة للاستماع
      if (data.status !== 'ready') {
        subscribeReceiver(data.code);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'حدث خطأ';
      setError(message);
      setLoading(false);
    }
  };

  const subscribeReceiver = (code: string) => {
    const channel = supabase
      .channel(`group-receiver-${code}`)
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
            setJoinedSession({
              code: row.pin_code as string,
              type: 'group',
              status: 'ready',
              fileUrl: (row.file_url as string) ?? undefined,
              fileName: (row.file_name as string) ?? undefined,
              fileType: (row.file_type as string) ?? undefined,
              fileSize: (row.file_size as number) ?? undefined,
              linkUrl: (row.link_url as string) ?? undefined,
              clientCount: (row.client_count as number) ?? 0,
            });
            unsubscribe();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="panel-container" style={{ maxWidth: '750px' }}>
      <button className="back-button" onClick={() => { unsubscribe(); onBack(); }}>
        &rarr; العودة للرئيسية
      </button>

      <div className="panel-header">
        <div className="panel-header-icon">👥</div>
        <h2 className="panel-title">مشاركة المجموعات (بث جماعي)</h2>
        <p className="panel-desc">
          {role === null && 'اختر دورك، إما كمُرسل لإنشاء رمز مجموعة وبث للمستمعين، أو كمُستقبل للانضمام وتنزيل الملف.'}
          {role === 'sender' && 'شارك الرمز مع جميع الحاضرين في القاعة لتنزيل الملف/الرابط فوراً وبشكل متوازي.'}
          {role === 'receiver' && 'تم الانضمام بنجاح. انتظر حتى يقوم المرسل برفع الملف ليظهر لديك فوراً.'}
        </p>
      </div>

      {error && <div className="alert-box alert-error">⚠️ {error}</div>}

      {/* --- 1. واجهة الاختيار البدئية --- */}
      {role === null && (
        <div className="modes-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%' }}>
          <div className="mode-card send-card" onClick={handleCreateGroup} style={{ padding: '2rem 1.5rem' }}>
            <div className="card-icon-container">📢</div>
            <h3 className="card-title">إنشاء بث (مرسل)</h3>
            <p className="card-desc">احصل على رمز لمشاركته مع الطلاب لبث ملفك إليهم جميعاً.</p>
          </div>

          <div className="mode-card receive-card" onClick={() => setRole('receiver')} style={{ padding: '2rem 1.5rem' }}>
            <div className="card-icon-container">👥</div>
            <h3 className="card-title">انضمام للبث (مستقبل)</h3>
            <p className="card-desc">أدخل الرمز الذي يقدمه المعلم لاستقبال الملف على جهازك.</p>
          </div>
        </div>
      )}

      {/* --- 2. واجهة المرسل (بث الملف للجميع) --- */}
      {role === 'sender' && groupSession && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div className="receive-code-display" style={{ marginBottom: '1.5rem' }}>
            <span className="code-numbers" onClick={() => navigator.clipboard.writeText(groupSession.code)}>
              {groupSession.code.slice(0, 3)} {groupSession.code.slice(3)}
            </span>
            <div className="group-member-count">
              عدد الطلاب المتصلين بالبث الآن: <span>{groupSession.clientCount}</span> طالب
            </div>
            
            {origin && (
              <div className="qr-code-wrapper">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                    `${origin}?group=${groupSession.code}`
                  )}`}
                  alt="QR Code Scan to Join Group"
                  width={150}
                  height={150}
                />
              </div>
            )}
          </div>

          {!senderSuccess ? (
            <div>
              <div className="send-type-tabs">
                <button
                  className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('file'); setError(null); }}
                >
                  📁 ملف للمجموعة
                </button>
                <button
                  className={`tab-btn ${activeTab === 'link' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('link'); setError(null); }}
                >
                  🔗 رابط للمجموعة
                </button>
              </div>

              {activeTab === 'file' ? (
                <div
                  className="upload-zone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setSelectedFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => inputRefs.current[6]?.click()}
                >
                  <div className="upload-icon">📤</div>
                  <div>
                    {selectedFile ? (
                      <p style={{ fontWeight: 'bold', color: 'var(--ksu-navy)' }}>
                        {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    ) : (
                      <p style={{ fontWeight: 'bold' }}>اسحب ملف البث هنا أو اضغط للاختيار</p>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={(el) => { if (el) inputRefs.current[6] = el; }}
                    className="file-input"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="url-input-container">
                  <input
                    type="url"
                    placeholder="أدخل رابط الويب هنا لبثه للجميع"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="text-input-field"
                  />
                </div>
              )}

              {uploading && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              <button className="wamda-btn btn-primary" onClick={handleSenderSubmit} disabled={uploading}>
                بث المحتوى للمجموعة الآن 🚀
              </button>
            </div>
          ) : (
            <div className="success-card">
              <div className="success-icon">✓</div>
              <h3 className="success-title">تم البث للجميع!</h3>
              <p style={{ color: 'var(--ksu-text-muted)', marginBottom: '1.5rem' }}>
                تم رفع محتوى البث وسيكون متاحاً لجميع المشتركين لمدة ساعتين قبل حذفه تلقائياً.
              </p>
              <button className="wamda-btn btn-secondary" onClick={onBack}>
                إنهاء البث والعودة
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- 3. واجهة انضمام المستقبل (كطالب) --- */}
      {role === 'receiver' && !joinedSession && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div className="pin-input-container">
            {pinCode.map((digit, idx) => (
              <input
                key={idx}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                onPaste={idx === 0 ? handlePaste : undefined}
                ref={(el) => { if (el) inputRefs.current[idx] = el; }}
                className="pin-digit-input"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          <button className="wamda-btn btn-primary" onClick={handleJoinGroup} disabled={loading}>
            {loading ? 'جاري الاتصال بالمجموعة...' : 'الانضمام واستقبال البث 👥'}
          </button>
        </div>
      )}

      {/* شاشة انتظار المستقبل أو عرض التحميل الفعلي بعد رفعه من المعلم */}
      {role === 'receiver' && joinedSession && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          {joinedSession.status === 'waiting' ? (
            <div className="waiting-pulse-container" style={{ padding: '2rem 0' }}>
              <div className="pulse-indicator"></div>
              <span className="waiting-text" style={{ fontSize: '1.1rem' }}>
                أنت متصل بالبث الجماعي ({joinedSession.code}). بانتظار رفع المعلم للملف...
              </span>
            </div>
          ) : (
            <div className="success-card" style={{ animation: 'bounceIn 0.5s' }}>
              <div className="success-icon">✓</div>
              <h3 className="success-title">محتوى البث جاهز!</h3>

              {joinedSession.linkUrl ? (
                <div>
                  <div className="transfer-details-box">
                    <div className="detail-row">
                      <span className="detail-label">رابط البث</span>
                      <span className="detail-value" style={{ direction: 'ltr', textAlign: 'left' }}>
                        {joinedSession.linkUrl}
                      </span>
                    </div>
                  </div>
                  <a
                    href={joinedSession.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wamda-btn btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    فتح الرابط المستلم 🔗
                  </a>
                </div>
              ) : (
                <div>
                  <div className="transfer-details-box">
                    <div className="detail-row">
                      <span className="detail-label">اسم الملف</span>
                      <span className="detail-value">{joinedSession.fileName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">حجم الملف</span>
                      <span className="detail-value">{formatFileSize(joinedSession.fileSize)}</span>
                    </div>
                  </div>

                  <a
                    href={joinedSession.fileUrl}
                    download={joinedSession.fileName}
                    className="wamda-btn btn-primary"
                    style={{ textDecoration: 'none' }}
                    onClick={() => setReceiverSuccess(true)}
                  >
                    تحميل الملف المستلم 💾
                  </a>
                </div>
              )}

              {receiverSuccess && (
                <p style={{ color: 'var(--ksu-success)', fontWeight: 'bold', marginTop: '1rem' }}>
                  تم حفظ الملف بنجاح! سيتم تنظيف الخوادم دورياً كل ساعتين.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

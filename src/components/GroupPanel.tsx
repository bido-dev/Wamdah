'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Users, AlertTriangle, File as FileIcon, Link as LinkIcon, UploadCloud, CheckCircle2, ArrowRight, X, Send, Trash2, Check, ExternalLink, Download } from 'lucide-react';

interface GroupPanelProps {
  initialCode?: string;
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

export default function GroupPanel({ initialCode, onBack }: GroupPanelProps) {
  const [role, setRole] = useState<'sender' | 'receiver' | null>(null);

  // خاص بالمرسل (إنشاء المجموعة)
  const [groupSession, setGroupSession] = useState<SessionData | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [senderSuccess, setSenderSuccess] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  // خاص بالمستقبل (الانضمام للمجموعة)
  const [pinCode, setPinCode] = useState<string[]>(Array(6).fill(''));
  const [joinedSession, setJoinedSession] = useState<SessionData | null>(null);
  const [receiverSuccess, setReceiverSuccess] = useState(false);
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
        setReceiverSuccess(true);
      }
    } catch (error) {
      console.error('Failed download via blob', error);
      window.open(url, '_blank');
      if (autoTransition) {
        setReceiverSuccess(true);
      }
    } finally {
      setDownloadingFile(null);
    }
  };

  // عام
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('');

  const channelRef = useRef<RealtimeChannel | null>(null);
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const creationCalledRef = useRef(false);

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

  const handleEndSession = async (code: string, andGoBack?: boolean) => {
    setEndingSession(true);
    try {
      await fetch(`/api/wamda?action=end&code=${code}`, { method: 'DELETE' });
    } catch {
      // Non-fatal — navigate away regardless
    } finally {
      setEndingSession(false);
      setSessionEnded(true);
      if (andGoBack) {
        unsubscribe();
        onBack();
      }
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

  const handleRemoveFile = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSenderSubmit = async () => {
    if (!groupSession) return;
    if (activeTab === 'file' && selectedFiles.length === 0) {
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
      } else if (activeTab === 'file' && selectedFiles.length > 0) {
        const uploadedFiles = [];
        let completedFilesCount = 0;

        for (const file of selectedFiles) {
          // Upload directly to Supabase storage from client
          const fileExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
          const uniqueName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
          const storagePath = `${groupSession.code}/${uniqueName}`;

          const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            throw new Error(`فشل رفع الملف ${file.name}: ` + uploadError.message);
          }

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('uploads')
            .getPublicUrl(storagePath);

          uploadedFiles.push({
            name: file.name,
            url: publicUrlData.publicUrl,
            type: file.type,
            size: file.size,
          });

          completedFilesCount++;
          setUploadProgress(20 + Math.floor((completedFilesCount / selectedFiles.length) * 60));
        }

        // Post metadata to server
        const res = await fetch('/api/wamda?action=upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: groupSession.code,
            fileUrl: JSON.stringify(uploadedFiles),
            fileName: 'multiple_files',
            fileType: 'application/json',
            fileSize: uploadedFiles.reduce((acc, f) => acc + f.size, 0),
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'فشل حفظ بيانات الملفات');
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

  const handleJoinGroup = async (customCode?: string) => {
    const fullCode = customCode || pinCode.join('');
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

  useEffect(() => {
    if (initialCode && /^\d{6}$/.test(initialCode)) {
      setPinCode(initialCode.split(''));
      handleJoinGroup(initialCode);
    } else {
      if (!creationCalledRef.current) {
        creationCalledRef.current = true;
        handleCreateGroup();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

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
      <button className="back-button" onClick={() => {
        if (role === 'sender' && groupSession && senderSuccess && !sessionEnded) {
          handleEndSession(groupSession.code, true);
        } else {
          unsubscribe();
          onBack();
        }
      }}>
        <ArrowRight className="w-4 h-4 inline-block ml-1" /> الإلغاء والعودة للرئيسية
      </button>

      <div className="panel-header">
        <div className="panel-header-icon" style={{ background: 'transparent' }}>
          <Users className="w-12 h-12 text-ksu-blue" />
        </div>
        <h2 className="panel-title">مشاركة المجموعات (بث جماعي)</h2>
        <p className="panel-desc">
          {role === null && 'اختر دورك، إما كمُرسل لإنشاء رمز مجموعة وبث للمستمعين، أو كمُستقبل للانضمام وتنزيل الملف.'}
          {role === 'sender' && 'شارك الرمز مع جميع الحاضرين في القاعة لتنزيل الملف/الرابط فوراً وبشكل متوازي.'}
          {role === 'receiver' && 'تم الانضمام بنجاح. انتظر حتى يقوم المرسل برفع الملف ليظهر لديك فوراً.'}
        </p>
      </div>

      {error && <div className="alert-box alert-error"><AlertTriangle className="w-5 h-5 inline-block mr-2" /> {error}</div>}

      {/* --- 1. واجهة التحضير التلقائي --- */}
      {role === null && (
        <div className="waiting-pulse-container" style={{ padding: '2rem 0' }}>
          <div className="pulse-indicator"></div>
          <span className="waiting-text" style={{ fontSize: '1.1rem' }}>
            جاري تحضير البث الجماعي...
          </span>
        </div>
      )}

      {/* --- 2. واجهة المرسل (بث الملف للجميع) --- */}
      {role === 'sender' && groupSession && (
        <div style={{ animation: 'fadeIn 0.3s' }}>
          <div className="receive-code-display" style={{ marginBottom: '1.5rem' }}>
            {origin && (
              <div className="qr-code-wrapper">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0085be&data=${encodeURIComponent(
                    `${origin}/app?group=${groupSession.code}`
                  )}`}
                  alt="QR Code Scan to Join Group"
                  width={150}
                  height={150}
                />
              </div>
            )}

            <div className="group-member-count">
              عدد الطلاب المتصلين بالبث الآن: <span>{groupSession.clientCount}</span> طالب
            </div>

            <div
              className="code-digits-container"
              title="اضغط لنسخ الرمز"
              onClick={() => navigator.clipboard.writeText(groupSession.code)}
            >
              {groupSession.code.split('').map((char, idx) => (
                <React.Fragment key={idx}>
                  <span className="code-digit-underline">{char}</span>
                  {idx === 2 && <span className="code-digit-space" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          {!senderSuccess ? (
            <div>
              <div className="send-type-tabs">
                <button
                  className={`tab-btn ${activeTab === 'file' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('file'); setError(null); }}
                >
                  <FileIcon className="w-4 h-4 inline-block ml-1" /> ملف للمجموعة
                </button>
                <button
                  className={`tab-btn ${activeTab === 'link' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('link'); setError(null); }}
                >
                  <LinkIcon className="w-4 h-4 inline-block ml-1" /> رابط للمجموعة
                </button>
              </div>

              {activeTab === 'file' ? (
                <div>
                  <div
                    className="upload-zone"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files) {
                        const filesArray = Array.from(e.dataTransfer.files);
                        setSelectedFiles(prev => [...prev, ...filesArray]);
                      }
                    }}
                    onClick={() => inputRefs.current[6]?.click()}
                  >
                    <div className="upload-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                      <UploadCloud className="w-12 h-12 text-gray-400" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 'bold' }}>اسحب الملفات وأفلتها هنا أو اضغط للاختيار</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--ksu-text-muted)', marginTop: '5px' }}>
                        يمكنك اختيار عدة ملفات (بحد أقصى 50 ميجابايت للملف الواحد)
                      </p>
                    </div>
                    <input
                      type="file"
                      multiple
                      ref={(el) => { if (el) inputRefs.current[6] = el; }}
                      className="file-input"
                      onChange={(e) => {
                        if (e.target.files) {
                          const filesArray = Array.from(e.target.files);
                          setSelectedFiles(prev => [...prev, ...filesArray]);
                        }
                      }}
                    />
                  </div>

                  {selectedFiles.length > 0 && (
                    <div style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
                      <p style={{ fontWeight: 'bold', marginBottom: '8px', color: 'var(--ksu-navy)' }}>
                        الملفات المختارة ({selectedFiles.length}):
                      </p>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {selectedFiles.map((file, idx) => (
                          <li
                            key={idx}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: '#f0f8ff',
                              borderRadius: '8px',
                              marginBottom: '6px',
                              border: '1px solid #d0e8f5',
                              fontSize: '0.9rem',
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                              {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleRemoveFile(idx, e)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--ksu-error)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 4px',
                              }}
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                <span className="flex items-center justify-center gap-2">بث المحتوى للمجموعة الآن <Send className="w-4 h-4" /></span>
              </button>
            </div>
          ) : (
            <div className="success-card">
              <div className="success-icon flex justify-center"><CheckCircle2 className="w-16 h-16 text-green-500" /></div>
              <h3 className="success-title">تم البث للجميع!</h3>
              {!sessionEnded ? (
                <>
                  <p style={{ color: 'var(--ksu-text-muted)', marginBottom: '1.5rem' }}>
                    محتوى البث متاح للمشتركين. عند الانتهاء، اضغط إنهاء الجلسة لحذف الملفات والبيانات نهائياً.
                  </p>
                  <button
                    className="wamda-btn btn-primary"
                    onClick={() => handleEndSession(groupSession.code)}
                    disabled={endingSession}
                    style={{ marginBottom: '0.75rem' }}
                  >
                    <span className="flex items-center justify-center gap-2">{endingSession ? 'جاري الحذف...' : <>إنهاء الجلسة وحذف الملفات <Trash2 className="w-4 h-4" /></>}</span>
                  </button>
                  <button className="wamda-btn btn-secondary" onClick={onBack}>
                    الرجوع للرئيسية (الجلسة ستُحذف لاحقاً)
                  </button>
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--ksu-success)', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check className="w-5 h-5" /> تم إنهاء الجلسة وحذف جميع الملفات من الخوادم بنجاح.
                  </p>
                  <button className="wamda-btn btn-secondary" onClick={onBack}>
                    العودة للقائمة الرئيسية
                  </button>
                </>
              )}
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

          <button className="wamda-btn btn-primary" onClick={() => handleJoinGroup()} disabled={loading}>
            <span className="flex items-center justify-center gap-2">{loading ? 'جاري الاتصال بالمجموعة...' : <>الانضمام واستقبال البث <Users className="w-4 h-4" /></>}</span>
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
              <div className="success-icon flex justify-center"><CheckCircle2 className="w-16 h-16 text-green-500" /></div>
              <h3 className="success-title">محتوى البث جاهز!</h3>

              {joinedSession.linkUrl ? (
                <div>
                  <div className="transfer-details-box">
                    <div className="detail-row">
                      <span className="detail-label">الرابط المستلم</span>
                      <span className="detail-value" style={{ direction: 'ltr', textAlign: 'left' }}>
                        {joinedSession.linkUrl}
                      </span>
                    </div>
                  </div>
                  <a
                    href={joinedSession.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wamda-btn btn-primary flex items-center justify-center gap-2"
                    style={{ textDecoration: 'none' }}
                  >
                    فتح الرابط المستلم <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                <div>
                  {/* Check if fileUrl is a JSON array */}
                  {(() => {
                    let filesList: Array<{ name: string; url: string; type: string; size: number }> = [];
                    let isMultiple = false;
                    if (joinedSession.fileUrl) {
                      try {
                        if (joinedSession.fileUrl.startsWith('[')) {
                          filesList = JSON.parse(joinedSession.fileUrl);
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
                            الملفات المرسلة من المعلم ({filesList.length}):
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
                                  <span className="flex items-center gap-1">{downloadingFile === file.name ? 'جاري التحميل...' : <>تحميل <Download className="w-4 h-4" /></>}</span>
                                </button>
                              </li>
                            ))}
                          </ul>

                          <button
                            className="wamda-btn btn-secondary"
                            onClick={() => {
                              setReceiverSuccess(true);
                            }}
                          >
                            تأكيد اكتمال تنزيل الكل
                          </button>
                        </div>
                      );
                    } else {
                      return (
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

                          <button
                            className="wamda-btn btn-primary"
                            onClick={() => downloadFile(joinedSession.fileUrl || '', joinedSession.fileName || 'file', true)}
                            disabled={downloadingFile !== null}
                          >
                            <span className="flex items-center justify-center gap-2">{downloadingFile ? 'جاري التحميل...' : <>تحميل وحفظ الملف المستلم <Download className="w-4 h-4" /></>}</span>
                          </button>
                        </div>
                      );
                    }
                  })()}
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

'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface SendPanelProps {
  initialCode?: string;
  onBack: () => void;
}

export default function SendPanel({ initialCode, onBack }: SendPanelProps) {
  const [code, setCode] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [sessionType, setSessionType] = useState<'individual' | 'group' | null>(null);
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
  const verifyCode = async (customCode?: string) => {
    const fullCode = customCode || code.join('');
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

  useEffect(() => {
    if (initialCode && /^\d{6}$/.test(initialCode)) {
      setCode(initialCode.split(''));
      verifyCode(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  // معالجة اختيار الملفات
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const handleRemoveFile = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // إرسال الملف أو الرابط
  const handleSubmit = async () => {
    const fullCode = code.join('');
    if (activeTab === 'file' && selectedFiles.length === 0) {
      setError('الرجاء اختيار ملف واحد على الأقل للإرسال');
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
      if (activeTab === 'link') {
        const res = await fetch('/api/wamda?action=upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: fullCode,
            link: linkUrl,
          }),
        });

        setUploadProgress(85);

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'حدث خطأ أثناء إرسال الرابط');
        }
      } else if (activeTab === 'file' && selectedFiles.length > 0) {
        const uploadedFiles = [];
        let completedFilesCount = 0;

        for (const file of selectedFiles) {
          // Upload directly to Supabase storage from the client
          const fileExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'bin';
          const uniqueName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
          const storagePath = `${fullCode}/${uniqueName}`;

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
          setUploadProgress(10 + Math.floor((completedFilesCount / selectedFiles.length) * 70));
        }

        // Post metadata to server
        const res = await fetch('/api/wamda?action=upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: fullCode,
            fileUrl: JSON.stringify(uploadedFiles),
            fileName: 'multiple_files',
            fileType: 'application/json',
            fileSize: uploadedFiles.reduce((acc, f) => acc + f.size, 0),
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'حدث خطأ أثناء حفظ بيانات الملفات');
        }
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
        &rarr; الإلغاء والعودة للرئيسية
      </button>

      <div className="panel-header">
        <div className="panel-header-icon" style={{ background: 'transparent' }}>
          <Image src="/assets/send.png" alt="Send Icon" width={48} height={48} />
        </div>
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

          <button className="wamda-btn btn-primary" onClick={() => verifyCode()}>
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
            <div>
              <div
                className="upload-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => inputRefs.current[6]?.click()}
              >
                <div className="upload-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Image src="/assets/files.png" alt="Upload Icon" width={48} height={48} />
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
                  ref={(el) => {
                    if (el) inputRefs.current[6] = el;
                  }}
                  className="file-input"
                  onChange={handleFileChange}
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
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            padding: '0 4px',
                          }}
                        >
                          ✕
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

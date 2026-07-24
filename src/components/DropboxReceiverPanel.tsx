'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { DownloadCloud, AlertTriangle, Download, ArrowRight, UploadCloud } from 'lucide-react';
import type { SessionFileRow } from '@/lib/db';

interface DropboxReceiverPanelProps {
  onBack: () => void;
}

interface SessionData {
  code: string;
  type: 'dropbox';
  status: 'waiting' | 'ready';
}

export default function DropboxReceiverPanel({ onBack }: DropboxReceiverPanelProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [files, setFiles] = useState<SessionFileRow[]>([]);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const startSession = async () => {
      try {
        const res = await fetch('/api/wamda?action=create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'dropbox' }),
        });

        if (!res.ok) throw new Error('فشل إنشاء صندوق التسليم');
        const data = await res.json();
        setSession(data);
        setLoading(false);

        subscribeToSessionFiles(data.code);
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
  }, []);

  const subscribeToSessionFiles = (code: string) => {
    const channel = supabase
      .channel(`session-files-${code}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_files',
          filter: `session_pin=eq.${code}`,
        },
        (payload) => {
          const newFile = payload.new as SessionFileRow;
          setFiles(prev => [newFile, ...prev]);
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

  const handleCopyCode = () => {
    if (session?.code) {
      navigator.clipboard.writeText(session.code);
    }
  };

  const downloadFile = async (url: string, fileName: string) => {
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
    } catch (error) {
      console.error('Failed download via blob', error);
      window.open(url, '_blank');
    } finally {
      setDownloadingFile(null);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="panel-container">
      <button className="back-button" onClick={onBack}>
        <ArrowRight className="w-4 h-4 inline-block ml-1" /> الإلغاء والعودة للرئيسية
      </button>

      <div className="panel-header">
        <div className="panel-header-icon" style={{ background: 'transparent' }}>
          <UploadCloud className="w-12 h-12 text-ksu-blue" />
        </div>
        <h2 className="panel-title">صندوق التسليم (Drop Box)</h2>
        <p className="panel-desc">
          اعرض الرمز التالي ليتمكن الطلاب من رفع ملفاتهم لهذا الصندوق بشكل متزامن.
        </p>
      </div>

      {error && <div className="alert-box alert-error"><AlertTriangle className="w-5 h-5 inline-block mr-2" /> {error}</div>}

      {loading ? (
        <div className="waiting-pulse-container">
          <div className="pulse-indicator"></div>
          <span className="waiting-text">جاري توليد الرمز...</span>
        </div>
      ) : session ? (
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

          <div className="mt-8">
            <h3 className="text-xl font-bold text-ksu-navy mb-4 flex items-center gap-2">
              الملفات المستلمة ({files.length})
            </h3>
            
            {files.length === 0 ? (
              <div className="waiting-pulse-container p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <div className="pulse-indicator"></div>
                <span className="waiting-text text-gray-500">بانتظار ملفات الطلاب...</span>
              </div>
            ) : (
              <ul className="space-y-3">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm"
                  >
                    <div className="flex flex-col text-right truncate w-2/3">
                      <span className="font-semibold text-gray-800 truncate" title={file.file_name}>{file.file_name}</span>
                      <span className="text-sm text-gray-500 flex gap-2">
                        <span>{formatFileSize(file.file_size)}</span>
                        <span>•</span>
                        <span dir="ltr">{new Date(file.uploaded_at).toLocaleTimeString()}</span>
                      </span>
                    </div>
                    <button
                      className="wamda-btn btn-primary m-0 px-4 py-2 flex-shrink-0"
                      style={{ width: 'auto', minWidth: '100px' }}
                      onClick={() => downloadFile(file.file_url, file.file_name)}
                      disabled={downloadingFile !== null}
                    >
                      <span className="flex items-center gap-2 justify-center">
                        {downloadingFile === file.file_name ? 'جاري التحميل...' : <>تحميل <Download className="w-4 h-4" /></>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

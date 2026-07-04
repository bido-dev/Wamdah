'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SendPanel from '@/components/SendPanel';
import ReceivePanel from '@/components/ReceivePanel';
import GroupPanel from '@/components/GroupPanel';

function WamdaContent() {
  const [activeMode, setActiveMode] = useState<'send' | 'receive' | 'group' | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const sendCode = searchParams.get('send');
    const receiveCode = searchParams.get('receive');
    const groupCode = searchParams.get('group');

    if (sendCode) {
      setActiveMode('send');
    } else if (receiveCode) {
      setActiveMode('receive');
    } else if (groupCode) {
      setActiveMode('group');
    }
  }, [searchParams]);

  return (
    <main className="app-main">
      {activeMode === null && (
        <div style={{ width: '100%' }}>
          <section className="home-hero-section">
            <span className="hero-badge">⚡ مشاركة سريعة داخل القاعات</span>
            <h2 className="home-title">
              منصة <span>ومضة</span> لمشاركة الملفات
            </h2>
            <p className="home-desc">
              الحل الأكاديمي الأسرع لنقل الملفات والروابط بين الطلاب وأجهزة العرض في القاعات الدراسية والجامعة بخصوصية وأمان تامين.
            </p>
          </section>

          <div className="modes-grid">
            <div className="mode-card send-card" onClick={() => setActiveMode('send')}>
              <div className="card-icon-container">📤</div>
              <h3 className="card-title">إرسال ملف أو رابط</h3>
              <p className="card-desc">
                أدخل رمز المستقبل لإرسال ملفات عروضك أو الروابط المهمة مباشرة إلى جهاز العرض.
              </p>
            </div>

            <div className="mode-card receive-card" onClick={() => setActiveMode('receive')}>
              <div className="card-icon-container">📥</div>
              <h3 className="card-title">استقبال ملف أو رابط</h3>
              <p className="card-desc">
                احصل على رمز استقبال فريد وباركود لعرضه في القاعة واستقبال ملفات الطلاب فوراً.
              </p>
            </div>

            <div className="mode-card group-card" onClick={() => setActiveMode('group')}>
              <div className="card-icon-container">👥</div>
              <h3 className="card-title">مجموعات وبث جماعي</h3>
              <p className="card-desc">
                أنشئ مجموعة لبث ملفك إلى عدة مستقبلين، أو انضم لبث نشط لتنزيل الملفات دفعة واحدة.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeMode === 'send' && <SendPanel onBack={() => setActiveMode(null)} />}
      {activeMode === 'receive' && <ReceivePanel onBack={() => setActiveMode(null)} />}
      {activeMode === 'group' && <GroupPanel onBack={() => setActiveMode(null)} />}
    </main>
  );
}

export default function AppPage() {
  return (
    <div className="wamda-app-container">
      <Header />
      <Suspense
        fallback={
          <main className="app-main">
            <div className="waiting-pulse-container">
              <div className="pulse-indicator"></div>
              <span className="waiting-text">جاري تحميل واجهة ومضة...</span>
            </div>
          </main>
        }
      >
        <WamdaContent />
      </Suspense>
      <Footer />
    </div>
  );
}

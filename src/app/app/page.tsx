'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Footer from '@/components/Footer';
import SendPanel from '@/components/SendPanel';
import ReceivePanel from '@/components/ReceivePanel';
import GroupPanel from '@/components/GroupPanel';

function WamdaContent() {
  const [activeMode, setActiveMode] = useState<'send' | 'receive' | 'group' | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

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
    } else {
      router.replace('/');
    }
  }, [searchParams, router]);

  return (
    <main className="app-main">
      {activeMode === 'send' && <SendPanel onBack={() => router.push('/')} />}
      {activeMode === 'receive' && <ReceivePanel onBack={() => router.push('/')} />}
      {activeMode === 'group' && <GroupPanel onBack={() => router.push('/')} />}
    </main>
  );
}

export default function AppPage() {
  return (
    <div className="wamda-app-container">
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

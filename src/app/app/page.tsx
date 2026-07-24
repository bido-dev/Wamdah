'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import SendPanel from '@/components/SendPanel';
import ReceivePanel from '@/components/ReceivePanel';
import GroupPanel from '@/components/GroupPanel';import DropboxReceiverPanel from '@/components/DropboxReceiverPanel';

function WamdaContent() {
  const [activeMode, setActiveMode] = useState<'send' | 'receive' | 'group' | 'dropbox' | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const sendCode = searchParams.get('send');
    const receiveCode = searchParams.get('receive');
    const groupCode = searchParams.get('group');
    const dropboxCode = searchParams.get('dropbox');

    if (sendCode) {
      setActiveMode('send');
    } else if (receiveCode) {
      setActiveMode('receive');
    } else if (groupCode) {
      setActiveMode('group');
    } else if (dropboxCode) {
      setActiveMode('dropbox');
    } else {
      router.replace('/');
    }
  }, [searchParams, router]);

  return (
    <main className="app-main">
      {activeMode === 'send' && <SendPanel initialCode={searchParams.get('send') || undefined} onBack={() => router.push('/')} />}
      {activeMode === 'receive' && <ReceivePanel onBack={() => router.push('/')} />}
      {activeMode === 'group' && <GroupPanel initialCode={searchParams.get('group') || undefined} onBack={() => router.push('/')} />}
      {activeMode === 'dropbox' && <DropboxReceiverPanel onBack={() => router.push('/')} />}
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
    </div>
  );
}

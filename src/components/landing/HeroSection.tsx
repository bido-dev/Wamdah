'use client';

import Link from 'next/link';
import Image from 'next/image';
import DecorativeShapes from './DecorativeShapes';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Count-up animation — runs whenever target changes
function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(target);
  const rafRef = useRef<number | null>(null);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (from === target) return;

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + (target - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else setCount(target);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return count;
}

export default function HeroSection() {
  const [users, setUsers] = useState(0);
  const [files, setFiles] = useState(0);

  // جلب الإحصائيات الأولية
  const fetchStats = () => {
    fetch('/api/wamda?action=stats')
      .then(r => r.json())
      .then(d => {
        setUsers(d.users ?? 0);
        setFiles(d.files ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchStats();

    // الاستماع لأي تغيير في جدول sessions عبر Supabase Realtime
    const channel = supabase
      .channel('stats-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sessions' },
        () => {
          // عند أي إدراج أو تحديث أو حذف، أعد جلب الإحصائيات
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const usersCount = useCountUp(users);
  const filesCount = useCountUp(files);

  return (
    <section className="landing-hero">
      <div className="hero-rectangle-wrap" aria-hidden="true">
        <Image
          src="/assets/Rectangle.png"
          alt=""
          width={720}
          height={480}
          className="hero-rectangle"
          priority
        />
      </div>
      <DecorativeShapes />

      <div className="landing-container hero-content">
        <h1 className="hero-title">
          مرحباً بك في <span className="hero-brand">ومضة</span> (Wamdah)!
        </h1>
        <p className="hero-description">
         الحل الأسرع والأذكى لمشاركة موادك الدراسية ومحاضراتك. ودّع عناء تسجيل الدخول المتكرر، والانتظار الطويل، واستخدام الطرق التقليدية. ب ومضة واحدة، أرسل واستقبل ملفاتك فوراً وبسهولة تامة.
        </p>

        <div className="hero-actions">
          <div className="hero-actions-row">
            <Link href="/app?send=1" className="hero-btn hero-btn-send">
              إرسال
            </Link>
            <Link href="/app?receive=1" className="hero-btn hero-btn-receive">
              استقبال
            </Link>
          </div>
          <div className="hero-actions-row">
            <Link href="/app?group=1" className="hero-btn hero-btn-solo">
              مجموعة
            </Link>
            <Link href="/app?dropbox=1" className="hero-btn hero-btn-solo" style={{ background: '#c19c5b' }}>
              صندوق تسليم
            </Link>
          </div>

          {/* إحصائيات حية */}
          <div className="hero-stats">
            <div className="hero-stat-item">
              <div className="hero-stat-top">
                <svg className="hero-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span className="hero-stat-number">{usersCount.toLocaleString('en-US')}+</span>
              </div>
              <span className="hero-stat-label">مستخدم</span>
            </div>
            <div className="hero-stat-divider" aria-hidden="true" />
            <div className="hero-stat-item">
              <div className="hero-stat-top">
                <svg className="hero-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                  <polyline points="13 2 13 9 20 9"/>
                </svg>
                <span className="hero-stat-number">{filesCount.toLocaleString('en-US')}+</span>
              </div>
              <span className="hero-stat-label">ملف تمت مشاركته</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

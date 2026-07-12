'use client';

import { useEffect, useState, useRef } from 'react';

interface Stats {
  users: number;
  files: number;
  links: number;
}

function useCountUp(target: number, duration = 1800) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCount(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  const count = useCountUp(value);

  return (
    <div className="stat-card">
      <div className="stat-icon-wrap" style={{ background: color }}>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-number">{count.toLocaleString('ar-SA')}+</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function StatsSection() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/wamda?action=stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => setStats({ users: 0, files: 0, links: 0 }));
  }, []);

  // Trigger count animation when section enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const data = [
    {
      icon: '👥',
      label: 'مستخدم استخدم المنصة',
      value: visible && stats ? stats.users : 0,
      color: 'linear-gradient(135deg, #29ABE2, #0083BC)',
    },
    {
      icon: '📁',
      label: 'ملف تم مشاركته',
      value: visible && stats ? stats.files : 0,
      color: 'linear-gradient(135deg, #0083BC, #005F88)',
    },
    {
      icon: '🔗',
      label: 'رابط تم إرساله',
      value: visible && stats ? stats.links : 0,
      color: 'linear-gradient(135deg, #00AEEF, #29ABE2)',
    },
  ];

  return (
    <section className="stats-section" ref={sectionRef}>
      <div className="landing-container">
        <div className="stats-header">
          <h2 className="stats-title">ومضة بالأرقام</h2>
          <p className="stats-subtitle">إحصائيات حية من المنصة</p>
        </div>
        <div className="stats-grid">
          {data.map((item) => (
            <StatCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              color={item.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

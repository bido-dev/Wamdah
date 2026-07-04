'use client';

import { useState, useEffect } from 'react';

import Image from 'next/image';

const screens = [
  {
    id: 'profile',
    header: 'linear-gradient(135deg, #662D91, #29ABE2)',
    content: 'profile',
  },
  {
    id: 'list',
    header: 'linear-gradient(135deg, #7B3FA0, #00AEEF)',
    content: 'list',
  },
  {
    id: 'dashboard',
    header: 'linear-gradient(135deg, #662D91, #D4145A)',
    content: 'dashboard',
    featured: true,
  },
  {
    id: 'media',
    header: 'linear-gradient(135deg, #29ABE2, #662D91)',
    content: 'media',
  },
  {
    id: 'chat',
    header: 'linear-gradient(135deg, #00AEEF, #7B3FA0)',
    content: 'chat',
  },
];

function PhoneScreen({ content, header }: { content: string; header: string }) {
  return (
    <div className="phone-screen-inner">
      <div className="phone-notch" />
      <div className="phone-header" style={{ background: header }}>
        <div className="phone-header-icons">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className={`phone-body phone-body-${content}`}>
        {content === 'profile' && (
          <>
            <div className="phone-avatar" />
            <div className="phone-line phone-line-lg" />
            <div className="phone-line phone-line-md" />
            <div className="phone-line phone-line-sm" />
          </>
        )}
        {content === 'list' && (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="phone-list-item">
                <div className="phone-list-avatar" />
                <div className="phone-list-lines">
                  <div className="phone-line phone-line-md" />
                  <div className="phone-line phone-line-sm" />
                </div>
              </div>
            ))}
          </>
        )}
        {content === 'dashboard' && (
          <>
            <div className="phone-chart">
              <svg viewBox="0 0 200 80" preserveAspectRatio="none">
                <path d="M0,60 Q50,20 100,45 T200,15" fill="none" stroke="#29ABE2" strokeWidth="3" />
                <path d="M0,70 Q50,40 100,55 T200,35" fill="none" stroke="#D4145A" strokeWidth="3" />
                <path d="M0,50 Q50,10 100,35 T200,25" fill="none" stroke="#D9E021" strokeWidth="3" />
              </svg>
            </div>
            <div className="phone-stats-row">
              <div className="phone-stat-box" />
              <div className="phone-stat-box" />
              <div className="phone-stat-box" />
            </div>
          </>
        )}
        {content === 'media' && (
          <>
            <div className="phone-media-image" />
            <div className="phone-line phone-line-lg" />
            <div className="phone-line phone-line-md" />
          </>
        )}
        {content === 'chat' && (
          <>
            <div className="phone-bubble phone-bubble-left" />
            <div className="phone-bubble phone-bubble-right" />
            <div className="phone-bubble phone-bubble-left phone-bubble-short" />
          </>
        )}
      </div>
    </div>
  );
}

export default function AppShowcase() {
  const [activeIndex, setActiveIndex] = useState(2);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % screens.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="landing-showcase">
      <div className="landing-container showcase-content">
        <h2 className="showcase-title">
          شارك ملفاتك بسهولة
          <span className="showcase-underline" aria-hidden="true" />
        </h2>
        <p className="showcase-subtitle">
          واجهة بسيطة وسريعة لإرسال واستقبال الملفات والروابط داخل القاعة الدراسية
        </p>

        <div className="phone-carousel">
          <div className="phone-carousel-track">
            {screens.map((screen, index) => (
              <div
                key={screen.id}
                className={`phone-mockup ${index === activeIndex ? 'phone-mockup-active' : ''} ${screen.featured ? 'phone-mockup-featured' : ''}`}
                onClick={() => setActiveIndex(index)}
              >
                <PhoneScreen content={screen.content} header={screen.header} />
              </div>
            ))}
          </div>
        </div>

        <div className="carousel-dots">
          {screens.map((_, index) => (
            <button
              key={index}
              type="button"
              className={`carousel-dot ${index === activeIndex ? 'carousel-dot-active' : ''}`}
              onClick={() => setActiveIndex(index)}
              aria-label={`الشاشة ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

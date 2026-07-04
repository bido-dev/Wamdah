'use client';

import { useState, useEffect } from 'react';

import Image from 'next/image';

const screens = [
  {
    id: 'home',
    path: '/app',
  },
  {
    id: 'send',
    path: '/app?mode=send',
  },
  {
    id: 'receive',
    path: '/app?mode=receive',
    featured: true,
  },
  {
    id: 'group',
    path: '/app?group=1',
  },
  {
    id: 'success',
    path: '/app',
  },
];

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
                <iframe
                  src={screen.path}
                  title={`Wamdah UI Screen - ${screen.id}`}
                  style={{
                    width: '320px',
                    height: '600px',
                    border: 'none',
                    borderRadius: '24px',
                    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
                    backgroundColor: 'white',
                    pointerEvents: index === activeIndex ? 'auto' : 'none',
                    overflow: 'hidden'
                  }}
                  sandbox="allow-scripts allow-same-origin allow-forms"
                />
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

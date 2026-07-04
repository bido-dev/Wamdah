'use client';

import { useState, useEffect } from 'react';

import Image from 'next/image';

const screens = [
  {
    id: 'home',
    src: '/assets/app-home.png',
  },
  {
    id: 'send',
    src: '/assets/app-send.png',
  },
  {
    id: 'receive',
    src: '/assets/app-receive.png',
    featured: true,
  },
  {
    id: 'group',
    src: '/assets/app-group.png',
  },
  {
    id: 'success',
    src: '/assets/app-success.png',
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
                <Image
                  src={screen.src}
                  alt={`Wamdah UI Screen - ${screen.id}`}
                  width={240}
                  height={500}
                  style={{ width: '100%', height: 'auto', borderRadius: '24px', boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)' }}
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

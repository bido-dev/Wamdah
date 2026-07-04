'use client';

import { useState } from 'react';

const faqItems = [
  {
    question: 'ما هي منصة ومضة؟',
    answer:
      'ومضة هي منصة مشاركة ملفات فورية مصممة للبيئة الأكاديمية. تتيح للطلاب إرسال واستقبال الملفات والروابط داخل القاعات الدراسية دون الحاجة لتسجيل حساب أو انتظار طويل.',
  },
  {
    question: 'هل أحتاج لإنشاء حساب؟',
    answer:
      'لا، لا حاجة لإنشاء حساب. فقط أدخل رمز الاستقبال أو امسح رمز QR للبدء فوراً في مشاركة ملفاتك.',
  },
  {
    question: 'ما أنواع الملفات المدعومة؟',
    answer:
      'يمكنك مشاركة الملفات (PDF، PowerPoint، Word، صور) والروابط. المنصة تدعم مشاركة سريعة وآمنة داخل شبكة الجامعة.',
  },
  {
    question: 'كيف تعمل المجموعات؟',
    answer:
      'يمكن للمحاضر إنشاء مجموعة بث لإرسال ملف واحد إلى عدة طلاب في آن واحد، أو للطلاب الانضمام لمجموعة نشطة لتنزيل الملفات دفعة واحدة.',
  },
  {
    question: 'هل البيانات آمنة؟',
    answer:
      'نعم، جميع عمليات النقل تتم داخل شبكة الجامعة مع رموز مؤقتة تنتهي صلاحيتها تلقائياً لضمان الخصوصية والأمان.',
  },
];

function MegaphoneIllustration() {
  return (
    <div className="faq-illustration">
      <div className="faq-illustration-glow" />
      <div className="faq-float-icon faq-float-q">?</div>
      <div className="faq-float-icon faq-float-chat">💬</div>
      <div className="faq-float-icon faq-float-star">★</div>
      <svg className="faq-megaphone" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="megaphoneGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#29ABE2" />
            <stop offset="100%" stopColor="#662D91" />
          </linearGradient>
        </defs>
        <path
          d="M25 55 L55 40 L55 80 L25 65 Z"
          fill="url(#megaphoneGrad)"
        />
        <path
          d="M55 40 C75 30 95 35 100 60 C95 85 75 90 55 80 Z"
          fill="url(#megaphoneGrad)"
          opacity="0.85"
        />
        <rect x="18" y="52" width="12" height="16" rx="3" fill="#662D91" />
        <path d="M100 55 L115 48 L115 72 L100 65 Z" fill="#29ABE2" opacity="0.6" />
      </svg>
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="landing-faq">
      <div className="landing-container faq-grid">
        <div className="faq-left">
          <h2 className="faq-heading">
            FAQ
            <span className="faq-heading-underline" aria-hidden="true" />
          </h2>
          <p className="faq-intro">
            إجابات على أكثر الأسئلة شيوعاً حول منصة ومضة وكيفية استخدامها داخل القاعات الدراسية.
          </p>
          <MegaphoneIllustration />
        </div>

        <div className="faq-accordion">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className={`faq-item ${isOpen ? 'faq-item-open' : ''}`}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                >
                  <span>{item.question}</span>
                  <svg
                    className={`faq-chevron ${isOpen ? 'faq-chevron-open' : ''}`}
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                {isOpen && <div className="faq-answer">{item.answer}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

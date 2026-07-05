'use client';

import { useState } from 'react';
import Image from 'next/image';

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
      'يمكن للمحاضر إنشاء مجموعة بث إرسال ملف واحد إلى عدة طلاب في آن واحد، أو للطلاب الانضمام لمجموعة نشطة لتنزيل الملفات دفعة واحدة.',
  },
  {
    question: 'هل البيانات آمنة؟',
    answer:
      'نعم، جميع عمليات النقل تتم داخل شبكة الجامعة مع رموز مؤقتة تنتهي صلاحيتها تلقائياً لضمان الخصوصية والأمان.',
  },
];

function FAQIllustration() {
  return (
    <div className="faq-illustration" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="faq-illustration-glow" />
      <Image 
        src="/assets/faq.png" 
        alt="FAQ Illustration" 
        width={220} 
        height={220} 
        style={{ objectFit: 'contain', zIndex: 2 }}
      />
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
          <FAQIllustration />
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

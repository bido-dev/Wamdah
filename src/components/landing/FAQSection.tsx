'use client';

import { useState } from 'react';
import { ChevronDown, MessageSquareQuote } from 'lucide-react';

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
      <MessageSquareQuote 
        className="text-blue-600"
        style={{ width: '200px', height: '200px', zIndex: 2, strokeWidth: 1 }}
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
                  <ChevronDown
                    className={`faq-chevron ${isOpen ? 'faq-chevron-open' : ''} transition-transform duration-200`}
                    width="20"
                    height="20"
                    aria-hidden="true"
                  />
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

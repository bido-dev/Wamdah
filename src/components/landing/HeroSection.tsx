import Link from 'next/link';
import Image from 'next/image';
import DecorativeShapes from './DecorativeShapes';

export default function HeroSection() {
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
          <Link href="/app?group=1" className="hero-btn hero-btn-solo">
            مجموعة
          </Link>
        </div>
      </div>
    </section>
  );
}

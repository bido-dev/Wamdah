import Link from 'next/link';

export default function LandingNav() {
  return (
    <nav className="landing-nav">
      <Link href="/" className="landing-nav-logo">
        <span className="landing-nav-icon">⚡</span>
        <span className="landing-nav-title">ومضة</span>
      </Link>
    </nav>
  );
}

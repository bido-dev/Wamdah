import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function LandingNav() {
  return (
    <nav className="landing-nav">
      <Link href="/" className="landing-nav-logo">
        <span className="landing-nav-icon"><Zap className="w-6 h-6 text-yellow-400 fill-current" /></span>
        <span className="landing-nav-title">ومضة</span>
      </Link>
    </nav>
  );
}

import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import WaveDivider from '@/components/landing/WaveDivider';
import AppShowcase from '@/components/landing/AppShowcase';
import FAQSection from '@/components/landing/FAQSection';
import TeamSection from '@/components/landing/TeamSection';
import './landing.css';

export default function Home() {
  return (
    <div className="landing-page">
      <HeroSection />
      <WaveDivider variant="hero-bottom" />
      <AppShowcase />
      <WaveDivider variant="purple-bottom" />
      <FAQSection />
      <WaveDivider variant="faq-bottom" />
      <TeamSection />
    </div>
  );
}

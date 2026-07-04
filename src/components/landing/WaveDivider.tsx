type WaveVariant = 'hero-bottom' | 'purple-top' | 'purple-bottom' | 'faq-bottom' | 'team-top';

interface WaveDividerProps {
  variant: WaveVariant;
  className?: string;
}

const fills: Record<WaveVariant, string> = {
  'hero-bottom': 'var(--landing-purple)',
  'purple-top': 'var(--landing-purple)',
  'purple-bottom': 'var(--landing-white)',
  'faq-bottom': 'var(--landing-sky-light)',
  'team-top': 'var(--landing-sky-light)',
};

export default function WaveDivider({ variant, className = '' }: WaveDividerProps) {
  const fill = fills[variant];
  const flip = variant === 'purple-bottom' || variant === 'faq-bottom';

  return (
    <div className={`wave-divider wave-${variant} ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className={flip ? 'wave-flip' : ''}>
        <path
          fill={fill}
          d="M0,64 C240,120 480,0 720,48 C960,96 1200,24 1440,64 L1440,120 L0,120 Z"
        />
      </svg>
    </div>
  );
}

import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 26, className }: Props) {
  // SVG inner viewBox is 22x22; we render scaled inside a rounded square.
  const inner = Math.round(size * (22 / 26));
  return (
    <span
      className={cn('inline-flex items-center justify-center shrink-0', className)}
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: '#C8845A',
      }}
      aria-hidden
    >
      <svg width={inner} height={inner} viewBox="0 0 22 22" fill="none">
        <rect x="2" y="5" width="18" height="13" rx="2" stroke="white" strokeWidth="1.6" />
        <line x1="2" y1="9" x2="20" y2="9" stroke="white" strokeWidth="1.6" />
        <line x1="7" y1="5" x2="7" y2="9" stroke="white" strokeWidth="1.6" />
        <circle cx="11" cy="14" r="2" fill="white" />
      </svg>
    </span>
  );
}

interface WordmarkProps {
  className?: string;
  style?: React.CSSProperties;
}

export function BrandWordmark({ className, style }: WordmarkProps) {
  return (
    <span
      className={cn(className)}
      style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 500, ...style }}
    >
      <span style={{ color: '#4A3728' }}>memory</span>
      <span style={{ color: '#C8845A' }}>drawer</span>
    </span>
  );
}

export function BrandLockup({ size = 26, className, textSize = 18 }: Props & { textSize?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandLogo size={size} />
      <BrandWordmark style={{ fontSize: textSize, lineHeight: 1 }} />
    </span>
  );
}

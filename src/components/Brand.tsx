import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  className?: string;
}

export function BrandLogo({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <rect x="36" y="36" width="96" height="118" rx="10" fill="#C8B4A2" />
      <rect x="23" y="23" width="96" height="118" rx="10" fill="#E2CEBC" />
      <rect x="10" y="10" width="96" height="118" rx="10" fill="#D4793A" />
      <circle cx="58" cy="50" r="17" fill="#9E5520" opacity="0.2" />
      <rect x="19" y="87" width="78" height="32" rx="7" fill="#9E5520" opacity="0.16" />
    </svg>
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
      <span style={{ color: '#D4793A' }}>drawer</span>
    </span>
  );
}

export function BrandLockup({ size = 32, className, textSize = 18 }: Props & { textSize?: number }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <BrandLogo size={size} />
      <BrandWordmark style={{ fontSize: textSize, lineHeight: 1 }} />
    </span>
  );
}

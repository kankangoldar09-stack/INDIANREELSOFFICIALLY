import { cn } from '@/lib/utils';

interface IndianSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

// size → outer container px
const sizeMap = {
  sm: 20,
  md: 32,
  lg: 48,
  xl: 64,
};

export default function IndianSpinner({ size = 'md', className }: IndianSpinnerProps) {
  const s = sizeMap[size];
  const stroke = Math.max(2, Math.round(s * 0.1));
  const r = (s - stroke * 2) / 2;
  const cx = s / 2;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * 0.72; // 72% visible arc

  return (
    <div
      className={cn('relative flex items-center justify-center shrink-0', className)}
      style={{ width: s, height: s }}
      role="status"
      aria-label="Loading"
    >
      {/* Outer arc — saffron, spins clockwise */}
      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        className="absolute inset-0"
        style={{ animation: 'tikSpin 0.9s linear infinite' }}
      >
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="#FF9933"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeDashoffset={0}
        />
      </svg>

      {/* Inner arc — green, spins counter-clockwise, slightly faster */}
      <svg
        width={s * 0.62}
        height={s * 0.62}
        viewBox={`0 0 ${s} ${s}`}
        className="absolute"
        style={{
          animation: 'tikSpinReverse 0.72s linear infinite',
          width: s * 0.62,
          height: s * 0.62,
        }}
      >
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="#138808"
          strokeWidth={stroke * 1.1}
          strokeLinecap="round"
          strokeDasharray={`${arc * 0.55} ${circumference - arc * 0.55}`}
          strokeDashoffset={0}
        />
      </svg>

      {/* Centre dot — Ashoka navy */}
      <div
        className="absolute rounded-full"
        style={{
          width: Math.max(3, s * 0.18),
          height: Math.max(3, s * 0.18),
          background: 'radial-gradient(circle, #000080 60%, #FF9933 100%)',
          opacity: 0.9,
        }}
      />
    </div>
  );
}

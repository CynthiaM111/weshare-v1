type Props = {
  className?: string
}

export default function LogoMark({ className = 'w-10 h-10' }: Props) {
  // Keep gradient ids stable to avoid collisions.
  const g1 = 'weshareLogoGradient1'
  const g2 = 'weshareLogoGradient2'

  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="30" cy="50" r="15" fill={`url(#${g1})`} opacity="0.9" />
      <circle cx="50" cy="50" r="18" fill={`url(#${g2})`} />
      <circle cx="70" cy="50" r="15" fill={`url(#${g1})`} opacity="0.9" />

      <path d="M45 50 L55 50" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M25 50 L35 50" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      <path d="M65 50 L75 50" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

      <path d="M20 75 Q50 65 80 75" stroke={`url(#${g2})`} strokeWidth="4" strokeLinecap="round" fill="none" />

      <defs>
        <linearGradient id={g1} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
        <linearGradient id={g2} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  )
}


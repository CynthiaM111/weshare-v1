type IconProps = { className?: string };

export function PinIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2.25" />
    </svg>
  );
}

export function RouteIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <circle cx="6" cy="6" r="2.25" />
      <circle cx="18" cy="18" r="2.25" />
      <path d="M8 6h5a4 4 0 0 1 4 4v2" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path d="M12 3 20 7v6c0 4.4-3.2 8.5-8 9-4.8-.5-8-4.6-8-9V7l8-4Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WalletIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path d="M4 8V6a2 2 0 0 1 2-2h12v16H6a2 2 0 0 1-2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 12h14a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.5" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UsersIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" strokeLinecap="round" />
      <circle cx="9" cy="8" r="3" />
      <path d="M22 19v-1a4 4 0 0 0-3-3.87" strokeLinecap="round" />
      <path d="M16 4.13a4 4 0 0 1 0 7.75" strokeLinecap="round" />
    </svg>
  );
}

export function PhoneIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 17h2" strokeLinecap="round" />
    </svg>
  );
}

export function SearchIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

export function PlusRouteIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function SeatIcon({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden="true">
      <path d="M7 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" strokeLinecap="round" />
      <path d="M5 10h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8Z" strokeLinejoin="round" />
      <path d="M8 20v2M16 20v2" strokeLinecap="round" />
    </svg>
  );
}

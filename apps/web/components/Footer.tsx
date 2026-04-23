import Link from 'next/link'
import LogoMark from '@/components/LogoMark'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200 bg-white/80 backdrop-blur">
      <div className="ws-container py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <LogoMark className="w-10 h-10" />
              <span className="text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-blue-700 transition">
                WeShare
              </span>
            </Link>
            <p className="mt-3 max-w-lg text-sm text-slate-600 leading-relaxed">
              A safer, more affordable way to move across Rwanda. Find trusted carpooling rides, book bus tickets,
              and stay connected with drivers and passengers.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="ws-badge-neutral">Carpooling</span>
              <span className="ws-badge-neutral">Bus tickets</span>
              <span className="ws-badge-neutral">Messaging</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Product</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/trips" className="text-slate-600 hover:text-blue-700 font-semibold transition">
                  Browse carpool trips
                </Link>
              </li>
              <li>
                <Link href="/bus-trips" className="text-slate-600 hover:text-emerald-700 font-semibold transition">
                  Browse bus tickets
                </Link>
              </li>
              <li>
                <Link href="/bookings" className="text-slate-600 hover:text-blue-700 font-semibold transition">
                  My bookings
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-slate-600 hover:text-blue-700 font-semibold transition">
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Company</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-slate-600 hover:text-blue-700 font-semibold transition">
                  About WeShare
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-slate-600 hover:text-blue-700 font-semibold transition">
                  Login / Sign up
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@weshare.rw"
                  className="text-slate-600 hover:text-blue-700 font-semibold transition"
                >
                  support@weshare.rw
                </a>
              </li>
              <li>
                <span className="text-slate-500">Kigali, Rwanda</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-slate-500">
            © {year} WeShare. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <span className="text-slate-500">Terms</span>
            <span className="text-slate-500">Privacy</span>
            <span className="text-slate-500">Safety</span>
          </div>
        </div>
      </div>
    </footer>
  )
}


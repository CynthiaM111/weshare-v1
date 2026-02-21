'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface User {
  id: string
  phone: string
  name: string
  role: string
  profileImageUrl?: string | null
  isVerified?: boolean
}

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (userStr) {
          const userData = JSON.parse(userStr)
          if (userData && userData.id) {
            setUser(userData)
            // Fetch fresh profile (isVerified, profileImageUrl) - fixes stale localStorage
            try {
              const res = await fetch('/api/profile', { headers: { 'x-user-id': userData.id } })
              if (res.ok) {
                const profile = await res.json()
                const updated = {
                  ...userData,
                  profileImageUrl: profile.profileImageUrl ?? userData.profileImageUrl,
                  isVerified: profile.isVerified ?? userData.isVerified,
                }
                setUser(updated)
                localStorage.setItem('user', JSON.stringify(updated))
              }
            } catch (_) {}
          } else {
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Error parsing user data in Navigation:', error)
        setUser(null)
      }
    }

    checkUser()

    // Listen for storage changes (when user logs in/out in another tab)
    window.addEventListener('storage', checkUser)
    
    // Listen for custom login/logout events (same window)
    window.addEventListener('userLogin', checkUser)
    window.addEventListener('userLogout', checkUser)

    // Check user on pathname change (when navigating after login)
    // Small delay to ensure localStorage is ready
    const timer = setTimeout(checkUser, 50)

    return () => {
      window.removeEventListener('storage', checkUser)
      window.removeEventListener('userLogin', checkUser)
      window.removeEventListener('userLogout', checkUser)
      clearTimeout(timer)
    }
  }, [pathname])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && !(event.target as Element).closest('.relative')) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      setUser(null)
      setShowMenu(false)
      // Trigger custom event to update navigation
      window.dispatchEvent(new CustomEvent('userLogout'))
      router.push('/')
    }
  }

  // Don't show navigation on login page
  if (pathname === '/login') {
    return null
  }

  const isActive = (path: string) => pathname === path

  return (
    <nav className="relative bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center hover:opacity-80 transition-all duration-300 hover:scale-105">
              <svg 
                className="w-10 h-10 text-blue-600" 
                viewBox="0 0 100 100" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Interconnected circles representing sharing/connection (Venn diagram style) */}
                <circle cx="30" cy="50" r="15" fill="url(#navGradient1)" opacity="0.9" />
                <circle cx="50" cy="50" r="18" fill="url(#navGradient2)" />
                <circle cx="70" cy="50" r="15" fill="url(#navGradient1)" opacity="0.9" />
                
                {/* Connection lines */}
                <path 
                  d="M45 50 L55 50" 
                  stroke="white" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                />
                <path 
                  d="M25 50 L35 50" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <path 
                  d="M65 50 L75 50" 
                  stroke="white" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                  opacity="0.8"
                />
                
                {/* Road/route symbol at bottom */}
                <path 
                  d="M20 75 Q50 65 80 75" 
                  stroke="url(#navGradient2)" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  fill="none"
                />
                
                <defs>
                  <linearGradient id="navGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                  <linearGradient id="navGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="50%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
            </Link>
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-700"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileNavOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <div className="hidden md:flex md:items-center md:space-x-1">
              {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
                <>
                  {user?.role === 'SUPER_ADMIN' && (
                    <Link
                      href="/admin/super"
                      className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        pathname?.startsWith('/admin/super')
                          ? 'text-amber-600 bg-amber-50'
                          : 'text-gray-700 hover:text-amber-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        Manage Admins
                      </span>
                      {pathname?.startsWith('/admin/super') && (
                        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-amber-600 rounded-full"></span>
                      )}
                    </Link>
                  )}
                  <Link
                    href="/admin/verification"
                    className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      pathname?.startsWith('/admin/verification')
                        ? 'text-amber-600 bg-amber-50'
                        : 'text-gray-700 hover:text-amber-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Driver Verifications
                    </span>
                    {pathname?.startsWith('/admin/verification') && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-amber-600 rounded-full"></span>
                    )}
                  </Link>
                  <Link
                    href="/"
                    className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      pathname === '/'
                        ? 'text-gray-800 bg-gray-100'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      View Site
                    </span>
                    {pathname === '/' && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-600 rounded-full"></span>
                    )}
                  </Link>
                  <Link
                    href="/about"
                    className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive('/about')
                        ? 'text-gray-800 bg-gray-100'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      About
                    </span>
                    {isActive('/about') && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-600 rounded-full"></span>
                    )}
                  </Link>
                </>
              ) : user ? (
                <>
                  <Link
                    href="/my-trips"
                    className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive('/my-trips')
                        ? 'text-purple-600 bg-purple-50'
                        : 'text-gray-700 hover:text-purple-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      My Trips
                    </span>
                    {isActive('/my-trips') && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-600 rounded-full"></span>
                    )}
                  </Link>
                  <Link
                    href="/bookings"
                    className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive('/bookings')
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      My Bookings
                    </span>
                    {isActive('/bookings') && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"></span>
                    )}
                  </Link>
                  <Link
                    href="/about"
                    className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isActive('/about')
                        ? 'text-gray-800 bg-gray-100'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      About
                    </span>
                    {isActive('/about') && (
                      <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-600 rounded-full"></span>
                    )}
                  </Link>
                  {user.role === 'DRIVER' && (
                    <Link
                      href="/driver"
                      className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        isActive('/driver')
                          ? 'text-orange-600 bg-orange-50'
                          : 'text-gray-700 hover:text-orange-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Dashboard
                      </span>
                      {isActive('/driver') && (
                        <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-600 rounded-full"></span>
                      )}
                    </Link>
                  )}
                </>
              ) : (
                <Link
                  href="/about"
                  className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive('/about')
                      ? 'text-gray-800 bg-gray-100'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    About
                  </span>
                  {isActive('/about') && (
                    <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-gray-600 rounded-full"></span>
                  )}
                </Link>
              )}
            </div>
          </div>

          {/* Mobile nav overlay */}
          {mobileNavOpen && (
            <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg py-4 px-4 z-40">
              <div className="flex flex-col gap-1">
                {user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? (
                  <>
                    {user?.role === 'SUPER_ADMIN' && (
                      <Link href="/admin/super" className="px-4 py-3 rounded-lg hover:bg-amber-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                        Manage Admins
                      </Link>
                    )}
                    <Link href="/admin/verification" className="px-4 py-3 rounded-lg hover:bg-amber-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                      Driver Verifications
                    </Link>
                    <Link href="/" className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                      View Site
                    </Link>
                    <Link href="/about" className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                      About
                    </Link>
                  </>
                ) : user ? (
                  <>
                    <Link href="/trips" className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                      Carpooling
                    </Link>
                    <Link href="/bus-trips" className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                      Bus Tickets
                    </Link>
                    <Link href="/my-trips" className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                      My Trips
                    </Link>
                    <Link href="/bookings" className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                      My Bookings
                    </Link>
                    <Link href="/about" className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                      About
                    </Link>
                    {user.role === 'DRIVER' && (
                      <Link href="/driver" className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                        Dashboard
                      </Link>
                    )}
                  </>
                ) : (
                  <Link href="/about" className="px-4 py-3 rounded-lg hover:bg-gray-50 text-gray-900 font-medium" onClick={() => setMobileNavOpen(false)}>
                    About
                  </Link>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 border border-transparent hover:border-gray-200"
                >
                    <div className="flex items-center space-x-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden shrink-0 ${
                      !user.profileImageUrl && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                        ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-600')
                    }`}>
                      {user.profileImageUrl ? (
                        <img src={`/api/profile/image/${user.id}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                        user.isVerified ? 'text-emerald-600' : 'text-gray-500'
                      }`}>
                        {user.isVerified ? 'Verified' : 'Not verified'}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 -mt-0.5">
                        {user.name}
                      </span>
                    </div>
                    <span className="md:hidden text-sm font-semibold text-gray-900">
                      {user.name}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${showMenu ? 'transform rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl py-2 z-50 border border-gray-100 overflow-hidden animate-fade-in-up">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                      onClick={() => setShowMenu(false)}
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Login/SignUp
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

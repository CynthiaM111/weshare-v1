'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface User {
  id: string
  phone: string
  name: string
  role: string
}

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    const checkUser = () => {
      try {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (userStr) {
          const userData = JSON.parse(userStr)
          // Only set user if data is valid
          if (userData && userData.id) {
            setUser(userData)
          } else {
            // Invalid data, but don't clear it here - let the auth pages handle it
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        // Error parsing user data, but don't clear localStorage here
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

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600 hover:text-blue-700">
              WeShare
            </Link>
            <div className="hidden md:flex md:ml-10 md:space-x-4">
              <Link
                href="/trips"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              >
                Carpooling
              </Link>
              <Link
                href="/bus-trips"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
              >
                Bus Tickets
              </Link>
              {user && (
                <>
                  <Link
                    href="/my-trips"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  >
                    My Trips
                  </Link>
                  <Link
                    href="/bookings"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                  >
                    My Bookings
                  </Link>
                  {user.role === 'DRIVER' && (
                    <Link
                      href="/driver"
                      className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100"
                    >
                      Driver Dashboard
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-900">
                      {user.name}
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-600"
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-900 hover:bg-gray-100"
                      onClick={() => setShowMenu(false)}
                    >
                      My Profile
                    </Link>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

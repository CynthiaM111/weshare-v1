'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type SearchMode = 'carpooling' | 'bus'

export default function Home() {
  const router = useRouter()
  const [mode, setMode] = useState<SearchMode>('carpooling')
  const [departCity, setDepartCity] = useState('')
  const [destinationCity, setDestinationCity] = useState('')
  const [date, setDate] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!departCity && !destinationCity && !date) {
      toast.error('Please enter at least one search criteria (depart city, destination city, or date)')
      return
    }
    const params = new URLSearchParams()
    if (departCity) params.set('departCity', departCity)
    if (destinationCity) params.set('destinationCity', destinationCity)
    if (date) params.set('date', date)
    const query = params.toString()
    const path = mode === 'carpooling' ? '/trips' : '/bus-trips'
    router.push(query ? `${path}?${query}` : path)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Hero with Search */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/55 via-white to-indigo-50/35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.16),transparent_45%),radial-gradient(circle_at_82%_28%,rgba(99,102,241,0.14),transparent_48%),radial-gradient(circle_at_60%_85%,rgba(16,185,129,0.10),transparent_42%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          {/* Hero: text left, image right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight animate-fade-in-up">
                Share Rides,
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Save Money
                </span>
              </h1>
              <p className="mt-4 text-lg text-gray-600 animate-fade-in-up animation-delay-200">
                Search carpooling rides or bus tickets across Rwanda.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 animate-fade-in-up animation-delay-400">
                <span className="ws-badge-neutral">Verified drivers</span>
                <span className="ws-badge-neutral">Clear pricing</span>
                <span className="ws-badge-neutral">In-app messaging</span>
              </div>
            </div>

            <div className="lg:col-span-6 animate-fade-in-up animation-delay-400">
              <div className="ws-card-elevated overflow-hidden">
                <div className="relative w-full aspect-[16/10] overflow-hidden">
                  <Image
                    src="/images/new_carpool_image.jpg"
                    alt="People sharing a ride in a car"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Search box stretched below */}
          <div className="mt-10 max-w-5xl mx-auto animate-fade-in-up animation-delay-600">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {/* Mode Tabs */}
              <div className="flex border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setMode('carpooling')}
                  className={`flex-1 py-4 px-6 font-semibold text-sm transition-all ${
                    mode === 'carpooling'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Carpooling
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('bus')}
                  className={`flex-1 py-4 px-6 font-semibold text-sm transition-all ${
                    mode === 'bus'
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Bus Tickets
                  </span>
                </button>
              </div>

              <form onSubmit={handleSearch} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Depart city"
                    value={departCity}
                    onChange={(e) => setDepartCity(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Destination city"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder:text-gray-500"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
                  />
                  <button
                    type="submit"
                    className={`px-8 py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 ${
                      mode === 'carpooling'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                    }`}
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>

            <p className="mt-4 text-center text-sm text-gray-500">
              Enter at least one field to search. Learn more about WeShare{' '}
              <Link href="/about" className="text-blue-600 hover:text-blue-700 font-medium">
                here
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Benefits / How it works (fills space before footer) */}
      <section className="py-14 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Travel smarter with WeShare
            </h2>
            <p className="mt-3 text-gray-600">
              Save time and money, meet verified drivers, and keep everything organized in one place.
            </p>
          </div>

          {/* Alternating sections (text/image, then image/text) */}
          <div className="mt-10 space-y-10">
            <div className="ws-card-elevated overflow-hidden animate-fade-in-up">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-12 items-stretch">
                <div className="lg:col-span-6 p-7 md:p-10 lg:pr-0 flex flex-col justify-center min-h-[260px] md:min-h-[320px] lg:min-h-[420px]">
                  <p className="text-xs font-extrabold tracking-wide text-blue-700">CARPOOLING</p>
                  <h3 className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-900">Share rides, split costs.</h3>
                  <p className="mt-3 text-sm md:text-base text-gray-600 leading-relaxed">
                    Find a trusted driver, compare seats and pricing, then message to coordinate pickup details.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/trips" className="ws-btn-primary px-5 py-2.5 text-sm">
                      Find a ride
                    </Link>
                    <Link
                      href="/login"
                      className="ws-btn px-5 py-2.5 text-sm bg-slate-900 text-white shadow-sm hover:shadow-md hover:bg-slate-800"
                    >
                      Create account
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-6 p-7 md:p-10 lg:pl-0 lg:pt-12">
                  <div className="ws-card-elevated overflow-hidden">
                    <div className="relative w-full aspect-[16/11] overflow-hidden">
                    <Image
                      src="/images/sinitta-leunen-4TuQPkTFHU4-unsplash.jpg"
                      alt="People sharing a ride in a car"
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                </div>
                </div>
              </div>
            </div>

            <div className="ws-card-elevated overflow-hidden animate-fade-in-up animation-delay-200">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-12 items-stretch">
                <div className="lg:col-span-6 order-2 lg:order-1 p-7 md:p-10 lg:pr-0 lg:pt-12">
                  <div className="ws-card-elevated overflow-hidden">
                    <div className="relative w-full aspect-[16/11] overflow-hidden">
                      <Image
                        src="/images/bus-real.jpg"
                        alt="Passengers riding inside a bus"
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-6 p-7 md:p-10 order-1 lg:order-2 lg:pl-0 flex flex-col justify-center min-h-[260px] md:min-h-[320px] lg:min-h-[420px]">
                  <p className="text-xs font-extrabold tracking-wide text-emerald-700">BUS TICKETS</p>
                  <h3 className="mt-2 text-2xl md:text-3xl font-extrabold text-gray-900">Book faster, travel easier.</h3>
                  <p className="mt-3 text-sm md:text-base text-gray-600 leading-relaxed">
                    Browse routes, pick your trip, and manage bookings from one place.
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/bus-trips"
                      className="ws-btn px-5 py-2.5 text-sm text-white shadow-lg hover:shadow-xl transform-gpu hover:-translate-y-0.5 transition-all bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      Browse buses
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="ws-card-elevated p-7 transform-gpu transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-fade-in-up">
              <h3 className="text-lg font-extrabold text-gray-900">How it works</h3>
              <ol className="mt-4 space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="ws-badge-neutral">1</span>
                  <span>Search by depart city, destination, or date.</span>
                </li>
                <li className="flex gap-3">
                  <span className="ws-badge-neutral">2</span>
                  <span>Compare price, seats, and driver verification.</span>
                </li>
                <li className="flex gap-3">
                  <span className="ws-badge-neutral">3</span>
                  <span>Book and message to coordinate pickup details.</span>
                </li>
              </ol>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/trips" className="ws-btn-primary px-5 py-2.5 text-sm">
                  Browse trips
                </Link>
                <Link href="/bus-trips" className="ws-btn-secondary px-5 py-2.5 text-sm">
                  Browse buses
                </Link>
              </div>
            </div>

            <div className="ws-card-elevated p-7 transform-gpu transition-all duration-300 hover:-translate-y-1 hover:shadow-xl animate-fade-in-up animation-delay-200">
              <h3 className="text-lg font-extrabold text-gray-900">Quick safety tips</h3>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <span className="ws-badge-success">Tip</span>
                  <span>Prefer verified drivers and confirm the car model before pickup.</span>
                </li>
                <li className="flex gap-3">
                  <span className="ws-badge-success">Tip</span>
                  <span>Share trip details with a friend and meet in well-lit locations.</span>
                </li>
                <li className="flex gap-3">
                  <span className="ws-badge-success">Tip</span>
                  <span>Use in-app messages to keep agreements clear (time, seats, price).</span>
                </li>
              </ul>
              <p className="mt-6 text-xs text-gray-500">
                Always use your best judgment. If something feels off, cancel and choose another trip.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

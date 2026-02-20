'use client'

import { useState } from 'react'
import Link from 'next/link'
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />

        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight animate-fade-in-up">
              Share Rides,
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Save Money
              </span>
            </h1>
            <p className="mt-3 text-lg text-gray-600 animate-fade-in-up animation-delay-200">
              Search carpooling rides or bus tickets across Rwanda
            </p>
          </div>

          {/* Search Box */}
          <div className="max-w-2xl mx-auto animate-fade-in-up animation-delay-400">
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    </main>
  )
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Hero Section - Alternative Design 1: Split Layout */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30"></div>
        {/* Animated background blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Left side - Content */}
            <div className="text-center lg:text-left space-y-8">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight animate-fade-in-up">
                Share Rides,
                <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent animate-gradient">
                  Save Money
                </span>
              </h1>
              
              {/* Redesigned "Your Travel Companion" - subtle tagline style */}
              <div className="flex items-center gap-3 justify-center lg:justify-start animate-fade-in-up animation-delay-200">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-blue-400"></div>
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                  Your Trusted Travel Companion
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-blue-400"></div>
              </div>
              
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0 animate-fade-in-up animation-delay-400">
                Connect with fellow travelers, split costs, and book bus tickets across Rwanda. 
                Simple, affordable, and reliable transportation solutions.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up animation-delay-600">
                <Link
                  href="/trips"
                  className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg flex items-center justify-center gap-2 animate-bounce-slow"
                >
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Find Rides
                </Link>
                <Link
                  href="/bus-trips"
                  className="px-8 py-4 bg-white text-gray-900 border-2 border-gray-300 rounded-xl hover:border-blue-600 hover:text-blue-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-semibold text-lg flex items-center justify-center gap-2 group"
                >
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Bus Tickets
                </Link>
              </div>
            </div>
            
            {/* Right side - Visual */}
            <div className="relative animate-fade-in-up animation-delay-800">
              <div className="relative z-10">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl p-8 md:p-12 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                  <div className="flex items-center justify-center mb-8">
                    <svg 
                      className="w-32 h-32 md:w-40 md:h-40 text-blue-600 animate-bounce-slow" 
                      viewBox="0 0 100 100" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <circle cx="30" cy="50" r="15" fill="url(#heroGradient1)" opacity="0.9" className="animate-bounce-slow" style={{ animationDelay: '0s' }} />
                      <circle cx="50" cy="50" r="18" fill="url(#heroGradient2)" className="animate-bounce-slow" style={{ animationDelay: '0.2s' }} />
                      <circle cx="70" cy="50" r="15" fill="url(#heroGradient1)" opacity="0.9" className="animate-bounce-slow" style={{ animationDelay: '0.4s' }} />
                      <path d="M45 50 L55 50" stroke="white" strokeWidth="3" strokeLinecap="round" className="animate-draw-path" />
                      <path d="M25 50 L35 50" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" className="animate-draw-path" style={{ animationDelay: '0.3s' }} />
                      <path d="M65 50 L75 50" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" className="animate-draw-path" style={{ animationDelay: '0.5s' }} />
                      <path d="M20 75 Q50 65 80 75" stroke="url(#heroGradient2)" strokeWidth="4" strokeLinecap="round" fill="none" className="animate-draw-path" style={{ animationDelay: '0.7s' }} />
                      <defs>
                        <linearGradient id="heroGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#6366F1" />
                        </linearGradient>
                        <linearGradient id="heroGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="50%" stopColor="#6366F1" />
                          <stop offset="100%" stopColor="#8B5CF6" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 shadow-md transform hover:scale-105 transition-all duration-200 hover:shadow-lg animate-slide-in-left">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Kigali → Musanze</div>
                          <div className="text-sm text-gray-600">Today, 2:00 PM</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-md transform hover:scale-105 transition-all duration-200 hover:shadow-lg animate-slide-in-left animation-delay-1000">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center animate-pulse" style={{ animationDelay: '0.3s' }}>
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Bus to Huye</div>
                          <div className="text-sm text-gray-600">Tomorrow, 8:00 AM</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative elements with animation */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-200 rounded-full blur-2xl opacity-50 animate-blob"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-indigo-200 rounded-full blur-2xl opacity-50 animate-blob animation-delay-2000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-sm font-bold">
                ✨ Why Choose WeShare?
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
              Travel Made
              <span className="block bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Simple & Affordable
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience seamless transportation across Rwanda with our innovative platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Carpooling Card */}
            <div className="group bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 animate-slide-in-left hover:scale-[1.02] hover:-translate-y-2">
              <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-8 overflow-hidden">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse-slow"></div>
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-2xl animate-pulse-slow animation-delay-2000"></div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg transform group-hover:rotate-12 transition-transform duration-300">
                      <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white">Carpooling</h3>
                      <p className="text-blue-100 text-sm mt-1">Share & Save Together</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-white">
                <ul className="space-y-5">
                  <li className="flex items-start gap-4 animate-fade-in-up animation-delay-800 group/item">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mt-0.5 group-hover/item:bg-blue-200 transition-colors">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-gray-900 font-semibold block">Post trips and share your ride</span>
                      <span className="text-gray-500 text-sm">Easily create and manage your trips</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 animate-fade-in-up animation-delay-1000 group/item">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mt-0.5 group-hover/item:bg-blue-200 transition-colors">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-gray-900 font-semibold block">Split travel costs</span>
                      <span className="text-gray-500 text-sm">Save money by sharing expenses</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 animate-fade-in-up animation-delay-1200 group/item">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mt-0.5 group-hover/item:bg-blue-200 transition-colors">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-gray-900 font-semibold block">Verified drivers</span>
                      <span className="text-gray-500 text-sm">Connect with trusted community members</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 animate-fade-in-up animation-delay-1400 group/item">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mt-0.5 group-hover/item:bg-blue-200 transition-colors">
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-gray-900 font-semibold block">Secure messaging</span>
                      <span className="text-gray-500 text-sm">Communicate safely with drivers</span>
                    </div>
                  </li>
                </ul>
                <Link
                  href="/trips"
                  className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold group"
                >
                  Explore Carpooling
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Bus Ticketing Card */}
            <div className="group bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 animate-slide-in-right hover:scale-[1.02] hover:-translate-y-2">
              <div className="relative bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 p-8 overflow-hidden">
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse-slow"></div>
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-2xl animate-pulse-slow animation-delay-2000"></div>
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg transform group-hover:rotate-12 transition-transform duration-300">
                      <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white">Bus Ticketing</h3>
                      <p className="text-green-100 text-sm mt-1">Book & Travel Easy</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-8 bg-white">
                <ul className="space-y-5">
                  <li className="flex items-start gap-4 animate-fade-in-up animation-delay-800 group/item">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mt-0.5 group-hover/item:bg-green-200 transition-colors">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-gray-900 font-semibold block">Instant online booking</span>
                      <span className="text-gray-500 text-sm">Reserve your seat in seconds</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 animate-fade-in-up animation-delay-1000 group/item">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mt-0.5 group-hover/item:bg-green-200 transition-colors">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-gray-900 font-semibold block">Trusted agencies</span>
                      <span className="text-gray-500 text-sm">Multiple reliable bus operators</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 animate-fade-in-up animation-delay-1200 group/item">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mt-0.5 group-hover/item:bg-green-200 transition-colors">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-gray-900 font-semibold block">Easy cancellation</span>
                      <span className="text-gray-500 text-sm">Flexible booking policies</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-4 animate-fade-in-up animation-delay-1400 group/item">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mt-0.5 group-hover/item:bg-green-200 transition-colors">
                      <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-gray-900 font-semibold block">Mobile Money payments</span>
                      <span className="text-gray-500 text-sm">MTN & Airtel Rwanda supported</span>
                    </div>
                  </li>
                </ul>
                <Link
                  href="/bus-trips"
                  className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold group"
                >
                  Book Bus Tickets
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse-slow animation-delay-2000"></div>
        </div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Join thousands of travelers using WeShare across Rwanda
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
              >
                Get Started
              </Link>
              <Link
                href="/trips"
                className="px-8 py-4 bg-blue-700/50 text-white rounded-xl hover:bg-blue-700/70 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg border-2 border-white/30"
              >
                Browse Trips
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">Welcome to WeShare</h1>
          <p className="text-xl text-gray-700 mb-8">
            Connect drivers with passengers and book inter-city bus tickets across Rwanda
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/trips"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg"
            >
              Browse Carpooling Trips
            </Link>
            <Link
              href="/bus-trips"
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-lg"
            >
              Book Bus Tickets
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
            >
              Login / Register
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto mt-16">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">🚗 Carpooling</h2>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Post trips and share your ride</li>
              <li>✓ Split travel costs</li>
              <li>✓ Connect with fellow travelers</li>
              <li>✓ Safe and verified drivers</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-4 text-green-600">🚌 Bus Ticketing</h2>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Book inter-city bus tickets online</li>
              <li>✓ Multiple travel agencies</li>
              <li>✓ Easy cancellation</li>
              <li>✓ Mobile Money payments</li>
            </ul>
          </div>
        </div>

        <div className="text-center mt-12 text-gray-600">
          <p>Join thousands of travelers using WeShare across Rwanda</p>
        </div>
      </div>
    </main>
  );
}


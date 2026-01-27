# WeShare - Carpooling & Bus Ticketing Platform

A full-stack Next.js web application for carpooling and inter-city bus ticketing services in Rwanda.

## Features

### Carpooling
- Drivers can post trips with detailed location information
- Passengers can browse and book available trips
- Driver confirmation workflow
- In-app messaging between drivers and passengers
- Mobile Money payment integration

### Bus Ticketing
- Travel agencies can post bus trips (minimum 2 days in advance)
- Users can book tickets online (maximum 2 hours before departure)
- Ticket cancellation with time limits

### Authentication
- Mobile number-based authentication (MTN/Airtel Rwanda)
- Auto-verification for Rwandan phone numbers
- Role-based access control (Driver, Passenger, Agency)

## Tech Stack

- **Framework**: Next.js 14+ (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Mobile number-based with auto-verification
- **Payments**: Mobile Money integration (MTN, Airtel)
- **UI**: Tailwind CSS + Sonner for toasts
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd weshare-v3
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` and add your:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for authentication
- `NEXTAUTH_URL`: Your application URL (e.g., http://localhost:3000)
- Mobile Money API keys (MTN_API_KEY, AIRTEL_API_KEY)

4. Set up the database
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed the database with test data
npm run db:seed
```

5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Seeding

The seed script creates realistic test data:
- 9 drivers, 17 passengers, 4 agencies
- 35 carpooling trips with various statuses
- 45 bookings with different states
- 60 messages between drivers and passengers
- 35 completed payments
- 18 bus trips
- 25 ticket bookings

Run seeding with:
```bash
npm run db:seed
```

## Project Structure

```
weshare-v3/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── trips/            # Trip pages
│   ├── bookings/         # Booking pages
│   ├── messages/         # Messaging pages
│   └── login/            # Authentication pages
├── components/            # React components
├── lib/                   # Utility functions
│   ├── prisma.ts         # Prisma client
│   ├── auth.ts           # Authentication helpers
│   └── mobile-money.ts   # Payment integration
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed script
└── types/                 # TypeScript types
```

## API Routes

### Authentication
- `POST /api/auth/login` - Login/Register with phone number

### Trips
- `GET /api/trips` - List trips (with filters)
- `POST /api/trips` - Create a new trip (Driver only)

### Bookings
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings` - Create a booking
- `PATCH /api/bookings/[id]/confirm` - Confirm booking (Driver only)

### Messages
- `GET /api/messages/[bookingId]` - Get messages for a booking
- `POST /api/messages/[bookingId]` - Send a message

### Payments
- `POST /api/payments/process` - Process Mobile Money payment

### Bus Trips
- `GET /api/bus-trips` - List bus trips
- `POST /api/bus-trips` - Create bus trip (Agency only)

### Ticket Bookings
- `POST /api/ticket-bookings` - Book a bus ticket
- `DELETE /api/ticket-bookings` - Cancel a ticket

## Development

### Database Management
```bash
# Open Prisma Studio (database GUI)
npm run db:studio

# Generate Prisma client after schema changes
npm run db:generate
```

### Building for Production
```bash
npm run build
npm start
```

## Notes

- Authentication uses localStorage for session management (simplified for MVP)
- Mobile Money integration uses placeholder functions - replace with actual API calls
- OTP verification is deferred to a future phase (auto-verification enabled for MVP)
- Real-time messaging uses polling (can be upgraded to WebSockets)

## License

MIT


# WeShare - Carpooling & Bus Ticketing Platform

This repository is an **npm workspaces monorepo**: the Next.js web app lives under `apps/web`, and the Expo React Native app under `apps/mobile`. Shared libraries can go in `packages/` as you add them.

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

2. Install dependencies (from the repository root)
```bash
npm install
```

3. Set up environment variables for the web app
```bash
cp .env.example apps/web/.env
```

(if you do not have `.env.example`, create `apps/web/.env` manually)

Edit `apps/web/.env` and add your:
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

5. Run the development server (web)
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Mobile (Expo)

From the repository root:

```bash
npm run mobile
```

Or from `apps/mobile`: `npm run start` (then choose iOS simulator, Android emulator, or Expo Go).

Set **`EXPO_PUBLIC_API_URL`** to your Next.js origin when the API is not on the same machine (for example `http://192.168.1.10:3000` on a phone, or `http://10.0.2.2:3000` for the Android emulator hitting your computer’s localhost).

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
├── apps/
│   ├── web/               # Next.js 14 (App Router)
│   │   ├── app/           # Routes & API
│   │   ├── components/
│   │   ├── lib/
│   │   ├── prisma/
│   │   └── public/
│   └── mobile/            # Expo (React Native)
├── packages/              # Optional shared packages (types, UI, API client)
└── package.json           # Workspaces root
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

For hosts such as Vercel or Netlify, set the app **root directory** to `apps/web` so installs and builds run in the correct workspace.

## Notes

- Authentication uses localStorage for session management (simplified for MVP)
- Mobile Money integration uses placeholder functions - replace with actual API calls
- OTP verification is deferred to a future phase (auto-verification enabled for MVP)
- Real-time messaging uses polling (can be upgraded to WebSockets)

## License

MIT


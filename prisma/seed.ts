import { PrismaClient, UserRole, TripStatus, BookingStatus, PaymentStatus, PaymentMethod } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

// Rwandan cities and locations
const cities = ['Kigali', 'Musanze', 'Rubavu', 'Huye', 'Nyagatare', 'Karongi', 'Rusizi']
const kigaliLocations = ['Kigali-Sonatube', 'Kigali-Nyabugo', 'Kigali-Kimisagara', 'Kigali-Kacyiru', 'Kigali-Remera']
const musanzeLocations = ['Musanze-Gare', 'Musanze-Center', 'Musanze-Kinigi']
const rubavuLocations = ['Rubavu-Petite barière', 'Rubavu-Center', 'Rubavu-Karongi']
const carModels = ['Toyota Corolla', 'Toyota RAV4', 'Honda CR-V', 'Nissan X-Trail', 'Toyota Land Cruiser', 'Mazda CX-5']

// Generate Rwandan phone numbers
function generateRwandanPhone(): string {
  const prefixes = ['078', '079', '072', '073']
  const prefix = faker.helpers.arrayElement(prefixes)
  const number = faker.string.numeric(7)
  return `+250${prefix}${number}`
}

// Generate Rwandan names
function generateRwandanName(): string {
  const firstNames = [
    'Jean', 'Marie', 'Paul', 'Claire', 'François', 'Aline', 'Joseph', 'Ange',
    'Pierre', 'Grace', 'David', 'Chantal', 'Emmanuel', 'Yvonne', 'Eric', 'Diane',
    'Patrick', 'Solange', 'Alexandre', 'Immaculée', 'Olivier', 'Josiane', 'Daniel', 'Claudine'
  ]
  const lastNames = [
    'Mukamana', 'Nkurunziza', 'Niyonsenga', 'Uwimana', 'Mugabo', 'Niyonshuti',
    'Habyarimana', 'Nkurikiye', 'Mukamurezi', 'Niyomugabo', 'Mukamana', 'Nkurunziza',
    'Niyonsenga', 'Uwimana', 'Mugabo', 'Niyonshuti', 'Habyarimana', 'Nkurikiye'
  ]
  return `${faker.helpers.arrayElement(firstNames)} ${faker.helpers.arrayElement(lastNames)}`
}

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clear existing data
  console.log('🧹 Cleaning existing data...')
  await prisma.verificationAuditLog.deleteMany()
  await prisma.driverVerificationSubmission.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.message.deleteMany()
  await prisma.ticketBooking.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.busTrip.deleteMany()
  await prisma.trip.deleteMany()
  await prisma.user.deleteMany()
  await prisma.otpVerification.deleteMany()

  // Create users
  console.log('👥 Creating users...')
  const drivers: any[] = []
  const passengers: any[] = []
  const agencies: any[] = []

  // Create super admin (login: +250788000000) - can create other admins
  const superAdmin = await prisma.user.create({
    data: {
      phone: '+250788000000',
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      phoneVerified: true,
    },
  })
  console.log(`✅ Super Admin created: ${superAdmin.phone} (login → /admin/super to manage admins)`)

  // Create drivers (8-10) - seed with verification for existing drivers
  for (let i = 0; i < 9; i++) {
    const driver = await prisma.user.create({
      data: {
        phone: generateRwandanPhone(),
        name: generateRwandanName(),
        role: UserRole.DRIVER,
        phoneVerified: true,
        driverVerified: true,
        nationalId: `1199${String(i).padStart(10, '0')}`,
        drivingLicenseNumber: `DL-${100000 + i}`,
        licensePlate: `RAB ${100 + i} ${String.fromCharCode(65 + (i % 26))}`,
      },
    })
    drivers.push(driver)
  }

  // Create passengers (15-18)
  for (let i = 0; i < 17; i++) {
    const passenger = await prisma.user.create({
      data: {
        phone: generateRwandanPhone(),
        name: generateRwandanName(),
        role: UserRole.PASSENGER,
        phoneVerified: true,
      },
    })
    passengers.push(passenger)
  }

  // Create agencies (3-5)
  const agencyNames = ['Rwanda Express', 'Volcano Express', 'Kivu Express', 'Virunga Travel']
  for (let i = 0; i < 4; i++) {
    const agency = await prisma.user.create({
      data: {
        phone: generateRwandanPhone(),
        name: agencyNames[i],
        role: UserRole.AGENCY,
        phoneVerified: true,
      },
    })
    agencies.push(agency)
  }

  console.log(`✅ Created ${drivers.length} drivers, ${passengers.length} passengers, ${agencies.length} agencies`)

  // Create carpooling trips (30-40)
  console.log('🚗 Creating carpooling trips...')
  const trips: any[] = []
  const today = new Date()

  for (let i = 0; i < 35; i++) {
    const driver = faker.helpers.arrayElement(drivers)
    const departCity = faker.helpers.arrayElement(cities)
    const destinationCity = faker.helpers.arrayElement(cities.filter(c => c !== departCity))
    
    let departLocation = ''
    let destinationLocation = ''
    
    if (departCity === 'Kigali') {
      departLocation = faker.helpers.arrayElement(kigaliLocations)
    } else if (departCity === 'Musanze') {
      departLocation = faker.helpers.arrayElement(musanzeLocations)
    } else if (departCity === 'Rubavu') {
      departLocation = faker.helpers.arrayElement(rubavuLocations)
    } else {
      departLocation = `${departCity}-Center`
    }

    if (destinationCity === 'Kigali') {
      destinationLocation = faker.helpers.arrayElement(kigaliLocations)
    } else if (destinationCity === 'Musanze') {
      destinationLocation = faker.helpers.arrayElement(musanzeLocations)
    } else if (destinationCity === 'Rubavu') {
      destinationLocation = faker.helpers.arrayElement(rubavuLocations)
    } else {
      destinationLocation = `${destinationCity}-Center`
    }

    // Mix of past, present, and future dates
    const daysOffset = faker.number.int({ min: -7, max: 14 })
    const tripDate = new Date(today)
    tripDate.setDate(today.getDate() + daysOffset)
    tripDate.setHours(faker.number.int({ min: 6, max: 20 }), faker.number.int({ min: 0, max: 59 }), 0, 0)

    let status: TripStatus = TripStatus.ACTIVE
    if (daysOffset < 0) {
      status = faker.helpers.arrayElement([TripStatus.COMPLETED, TripStatus.CANCELLED])
    }

    const trip = await prisma.trip.create({
      data: {
        driverId: driver.id,
        departCity,
        departLocation,
        destinationCity,
        destinationLocation,
        date: tripDate,
        time: `${String(tripDate.getHours()).padStart(2, '0')}:${String(tripDate.getMinutes()).padStart(2, '0')}`,
        availableSeats: faker.number.int({ min: 1, max: 4 }),
        price: faker.number.int({ min: 2000, max: 15000 }),
        carModel: faker.helpers.arrayElement(carModels),
        status,
      },
    })
    trips.push(trip)
  }

  console.log(`✅ Created ${trips.length} carpooling trips`)

  // Create bookings (40-50)
  console.log('📋 Creating bookings...')
  const bookings: any[] = []
  const activeTrips = trips.filter(t => t.status === TripStatus.ACTIVE)

  for (let i = 0; i < 45; i++) {
    const trip = faker.helpers.arrayElement(activeTrips)
    const passenger = faker.helpers.arrayElement(passengers)
    
    // Get existing bookings for this trip
    const existingBookings = await prisma.booking.findMany({
      where: { tripId: trip.id },
    })
    const bookedSeats = existingBookings
      .filter(b => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + b.seats, 0)
    const availableSeats = trip.availableSeats - bookedSeats

    if (availableSeats <= 0) continue

    const seats = faker.number.int({ min: 1, max: Math.min(availableSeats, 3) })
    
    // Mix of statuses
    let status: BookingStatus = BookingStatus.PENDING
    if (i < 15) {
      status = BookingStatus.CONFIRMED
    } else if (i < 25) {
      status = BookingStatus.COMPLETED
    } else if (i < 30) {
      status = BookingStatus.CANCELLED
    }

    const booking = await prisma.booking.create({
      data: {
        tripId: trip.id,
        userId: passenger.id,
        seats,
        status,
      },
    })
    bookings.push(booking)
  }

  console.log(`✅ Created ${bookings.length} bookings`)

  // Create messages (50-70) - only for confirmed bookings
  console.log('💬 Creating messages...')
  const confirmedBookings = bookings.filter(b => b.status === BookingStatus.CONFIRMED)
  
  for (let i = 0; i < 60; i++) {
    const booking = faker.helpers.arrayElement(confirmedBookings)
    const trip = trips.find(t => t.id === booking.tripId)!
    
    // Get messages for this booking to determine sender/receiver
    const existingMessages = await prisma.message.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'asc' },
    })

    let senderId: string
    let receiverId: string

    if (existingMessages.length === 0) {
      // First message - randomly choose sender
      const isPassengerFirst = faker.datatype.boolean()
      senderId = isPassengerFirst ? booking.userId : trip.driverId
      receiverId = isPassengerFirst ? trip.driverId : booking.userId
    } else {
      // Alternate between sender and receiver
      const lastMessage = existingMessages[existingMessages.length - 1]
      senderId = lastMessage.receiverId
      receiverId = lastMessage.senderId
    }

    const messages = [
      'Muraho! Ndi kureba ko twari kujya hamwe.',
      'Hello! I was checking if we\'re still going together.',
      'Ndi hafi ya Sonatube. Wari kugeza ryari?',
      'I\'m near Sonatube. When will you arrive?',
      'Ndi kugeze. Wari hehe?',
      'I\'ve arrived. Where are you?',
      'Murakoze cyane!',
      'Thank you very much!',
      'Twongere gukorana.',
      'Let\'s work together again.',
    ]

    await prisma.message.create({
      data: {
        bookingId: booking.id,
        senderId,
        receiverId,
        content: faker.helpers.arrayElement(messages),
        read: faker.datatype.boolean(),
      },
    })
  }

  console.log(`✅ Created 60 messages`)

  // Create payments (30-40) - for completed bookings
  console.log('💳 Creating payments...')
  const completedBookings = bookings.filter(b => b.status === BookingStatus.COMPLETED)
  
  for (let i = 0; i < 35; i++) {
    const booking = faker.helpers.arrayElement(completedBookings)
    const trip = trips.find(t => t.id === booking.tripId)!
    const amount = trip.price * booking.seats

    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        userId: booking.userId,
        amount,
        method: faker.helpers.arrayElement([PaymentMethod.MTN_MOBILE_MONEY, PaymentMethod.AIRTEL_MONEY]),
        status: PaymentStatus.COMPLETED,
        transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      },
    })
  }

  console.log(`✅ Created 35 payments`)

  // Create bus trips (15-20)
  console.log('🚌 Creating bus trips...')
  const busTrips: any[] = []

  for (let i = 0; i < 18; i++) {
    const agency = faker.helpers.arrayElement(agencies)
    const departCity = faker.helpers.arrayElement(cities)
    const destinationCity = faker.helpers.arrayElement(cities.filter(c => c !== departCity))
    
    // Must be at least 2 days in the future
    const daysOffset = faker.number.int({ min: 2, max: 14 })
    const tripDate = new Date(today)
    tripDate.setDate(today.getDate() + daysOffset)
    tripDate.setHours(faker.number.int({ min: 6, max: 20 }), 0, 0, 0)

    const totalSeats = faker.number.int({ min: 30, max: 50 })
    
    let status: TripStatus = TripStatus.ACTIVE
    if (daysOffset < 0) {
      status = TripStatus.COMPLETED
    }

    const busTrip = await prisma.busTrip.create({
      data: {
        agencyId: agency.id,
        departCity,
        destinationCity,
        date: tripDate,
        time: `${String(tripDate.getHours()).padStart(2, '0')}:00`,
        totalSeats,
        availableSeats: totalSeats,
        status,
      },
    })
    busTrips.push(busTrip)
  }

  console.log(`✅ Created ${busTrips.length} bus trips`)

  // Create ticket bookings (20-30)
  console.log('🎫 Creating ticket bookings...')
  const activeBusTrips = busTrips.filter(t => t.status === TripStatus.ACTIVE)

  for (let i = 0; i < 25; i++) {
    const busTrip = faker.helpers.arrayElement(activeBusTrips)
    const passenger = faker.helpers.arrayElement(passengers)
    
    const existingBookings = await prisma.ticketBooking.findMany({
      where: { busTripId: busTrip.id },
    })
    const bookedSeats = existingBookings
      .filter(b => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + b.seats, 0)
    const availableSeats = busTrip.availableSeats - bookedSeats

    if (availableSeats <= 0) continue

    const seats = faker.number.int({ min: 1, max: Math.min(availableSeats, 3) })
    
    let status: BookingStatus = BookingStatus.CONFIRMED
    if (i < 20) {
      status = BookingStatus.CONFIRMED
    } else if (i < 23) {
      status = BookingStatus.COMPLETED
    } else {
      status = BookingStatus.CANCELLED
    }

    const ticketBooking = await prisma.ticketBooking.create({
      data: {
        busTripId: busTrip.id,
        userId: passenger.id,
        seats,
        status,
      },
    })

    // Update available seats if confirmed
    if (status === BookingStatus.CONFIRMED || status === BookingStatus.COMPLETED) {
      await prisma.busTrip.update({
        where: { id: busTrip.id },
        data: {
          availableSeats: {
            decrement: seats,
          },
        },
      })
    }
  }

  console.log(`✅ Created 25 ticket bookings`)

  console.log('🎉 Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


// Email notification service
// Placeholder implementation - replace with actual email service (e.g., SendGrid, Resend, etc.)

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Placeholder implementation
  // In production, integrate with an email service provider
  
  console.log('📧 Email would be sent:', {
    to: options.to,
    subject: options.subject,
  })
  
  // Simulate email sending
  await new Promise((resolve) => setTimeout(resolve, 100))
  
  return true
}

export async function sendBookingConfirmationEmail(
  passengerEmail: string,
  driverName: string,
  tripDetails: {
    departCity: string
    destinationCity: string
    date: string
    time: string
  }
): Promise<boolean> {
  return sendEmail({
    to: passengerEmail,
    subject: 'Booking Confirmed - WeShare',
    html: `
      <h2>Your booking has been confirmed!</h2>
      <p>Driver: ${driverName}</p>
      <p>Route: ${tripDetails.departCity} → ${tripDetails.destinationCity}</p>
      <p>Date: ${new Date(tripDetails.date).toLocaleDateString()}</p>
      <p>Time: ${tripDetails.time}</p>
    `,
  })
}

export async function sendPaymentReceiptEmail(
  userEmail: string,
  amount: number,
  transactionId: string
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Payment Receipt - WeShare',
    html: `
      <h2>Payment Receipt</h2>
      <p>Amount: RWF ${amount.toLocaleString()}</p>
      <p>Transaction ID: ${transactionId}</p>
      <p>Thank you for using WeShare!</p>
    `,
  })
}

export async function sendTripReminderEmail(
  userEmail: string,
  tripDetails: {
    departCity: string
    destinationCity: string
    date: string
    time: string
  }
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Trip Reminder - WeShare',
    html: `
      <h2>Reminder: Your trip is tomorrow!</h2>
      <p>Route: ${tripDetails.departCity} → ${tripDetails.destinationCity}</p>
      <p>Date: ${new Date(tripDetails.date).toLocaleDateString()}</p>
      <p>Time: ${tripDetails.time}</p>
      <p>Please be ready on time!</p>
    `,
  })
}


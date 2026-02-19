import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

const FROM = process.env.EMAIL_FROM || 'noreply@medicalbooking.com';

export async function sendBookingConfirmation({ to, patientName, doctorName, appointmentType, date, time, duration }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Appointment Confirmed</h2>
      <p>Dear ${patientName},</p>
      <p>Your appointment has been successfully booked. Here are the details:</p>
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Doctor</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${doctorName}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Type</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${appointmentType}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${date}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${time}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Duration</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${duration} minutes</td></tr>
      </table>
      <p>Please arrive a few minutes early. If you need to reschedule or cancel, please do so through the app.</p>
      <p>Best regards,<br>Medical Booking System</p>
    </div>
  `;

  const mailOptions = {
    from: FROM,
    to,
    subject: `Appointment Confirmed - ${appointmentType} with ${doctorName}`,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}

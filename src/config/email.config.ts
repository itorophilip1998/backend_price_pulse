import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '',
  from: process.env.SMTP_FROM || process.env.SMTP_SENDER || 'noreply@pricepulse.ai',
  replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM || 'noreply@pricepulse.ai',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@pricepulse.ai',
}));


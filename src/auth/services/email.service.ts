import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS') || this.configService.get<string>('SMTP_PASSWORD');
    
    // Only create transporter if credentials are provided
    if (smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<boolean>('SMTP_SECURE', false),
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    } else {
      this.logger.warn('SMTP credentials not configured. Email functionality will be disabled.');
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Email service not configured. Skipping verification email to ${email}`);
      return;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    const fromEmail = this.configService.get<string>('SMTP_SENDER') || 
                      this.configService.get<string>('SMTP_FROM', 'noreply@pricepulse.ai');
    const replyTo = this.configService.get<string>('SMTP_REPLY_TO') || fromEmail;

    const mailOptions = {
      from: fromEmail,
      replyTo: replyTo,
      to: email,
      subject: 'Verify your PricePulse account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to PricePulse!</h2>
          <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Verify Email
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      // Don't throw - allow signup to succeed even if email fails
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Email service not configured. Skipping password reset email to ${email}`);
      return;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/auth/reset-password/${token}`;

    const fromEmail = this.configService.get<string>('SMTP_SENDER') || 
                      this.configService.get<string>('SMTP_FROM', 'noreply@pricepulse.ai');
    const replyTo = this.configService.get<string>('SMTP_REPLY_TO') || fromEmail;

    const mailOptions = {
      from: fromEmail,
      replyTo: replyTo,
      to: email,
      subject: 'Reset your PricePulse password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the link below to create a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Reset Password
          </a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}:`, error);
      // Don't throw - allow password reset to proceed even if email fails
    }
  }
}


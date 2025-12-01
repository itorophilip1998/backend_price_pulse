import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS') || this.configService.get<string>('SMTP_PASSWORD');
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpSecure = this.configService.get<boolean>('SMTP_SECURE', false);
    
    // Only create transporter if credentials are provided
    if (smtpUser && smtpPass) {
      // Office365 requires specific TLS configuration
      const isOffice365 = smtpHost.includes('office365.com') || smtpHost.includes('outlook.com');
      
      // Configure transporter based on SMTP provider
      const isMailtrap = smtpHost?.includes('mailtrap.io');
      
      const transporterConfig: any = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure, // true for 465 (SSL), false for other ports (STARTTLS)
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      };

      // Mailtrap configuration (port 2525 uses STARTTLS)
      if (isMailtrap) {
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
      }
      // Office365 specific settings for port 587 (STARTTLS)
      else if (isOffice365 && smtpPort === 587) {
        transporterConfig.secure = false;
        transporterConfig.requireTLS = true;
        transporterConfig.ignoreTLS = false;
        transporterConfig.tls = {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        };
      }

      this.transporter = nodemailer.createTransport(transporterConfig);

      this.logger.log(`Email service initialized with SMTP: ${smtpHost}:${smtpPort} (User: ${smtpUser})`);
    } else {
      this.logger.warn('SMTP credentials not configured. Email functionality will be disabled.');
      this.logger.warn(`SMTP_USER: ${smtpUser ? 'Set' : 'Missing'}, SMTP_PASS: ${smtpPass ? 'Set' : 'Missing'}`);
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`Email service not configured. Skipping verification email to ${email}`);
      return;
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    // For Office365, the "from" email must match the authenticated user
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const fromEmail = this.configService.get<string>('SMTP_SENDER') || 
                      this.configService.get<string>('SMTP_FROM') ||
                      smtpUser || // Fallback to SMTP_USER for Office365 compatibility
                      'noreply@pricepulse.ai';
    const replyTo = this.configService.get<string>('SMTP_REPLY_TO') || fromEmail;

    // Generate 6-digit numeric OTP code from token
    // We'll use a hash of the token to generate a consistent 6-digit code
    // This ensures the same token always produces the same OTP
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    // Use first 8 hex chars from hash, convert to number, then to 6-digit string
    const numericHash = parseInt(hash.substring(0, 8), 16);
    const otpCode = String(numericHash % 1000000).padStart(6, '0');

    const mailOptions = {
      from: fromEmail,
      replyTo: replyTo,
      to: email,
      subject: 'Verify your PricePulse account',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Verify your PricePulse account</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px 0;">
            <tr>
              <td align="center" style="padding: 20px 10px;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Welcome to PricePulse!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px 20px;">
                      <p style="font-size: 16px; color: #374151; line-height: 1.6; margin: 0 0 24px 0; padding: 0;">Thank you for signing up! Please verify your email address using one of the options below:</p>
                      
                      <!-- OTP Code Section -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f9fafb; border: 2px solid #667eea; border-radius: 12px; margin: 24px 0;">
                        <tr>
                          <td style="padding: 24px 16px; text-align: center;">
                            <p style="margin: 0 0 16px 0; font-size: 13px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                            <div style="background: #ffffff; border: 2px dashed #667eea; border-radius: 8px; padding: 20px 16px; margin: 16px 0;">
                              <p style="font-size: 32px; font-weight: 700; color: #667eea; letter-spacing: 6px; margin: 0; font-family: 'Courier New', monospace; word-break: break-all; overflow-wrap: break-word;">${otpCode}</p>
                            </div>
                            <p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280; line-height: 1.5; padding: 0 8px;">Enter this code in the app to verify your account</p>
                          </td>
                        </tr>
                      </table>

                      <!-- OR Divider -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                        <tr>
                          <td align="center" style="padding: 0 20px;">
                            <div style="position: relative; text-align: center;">
                              <span style="background: #ffffff; padding: 0 12px; color: #9ca3af; font-size: 14px; position: relative; z-index: 1;">OR</span>
                              <div style="position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #e5e7eb; z-index: 0;"></div>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Click Link Option -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                        <tr>
                          <td align="center" style="padding: 0 8px;">
                            <p style="font-size: 14px; color: #6b7280; margin: 0 0 16px 0; line-height: 1.5;">Click the button below to verify automatically:</p>
                            <a href="${verificationUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3); word-break: break-word;">Verify Email Address</a>
                          </td>
                        </tr>
                      </table>

                      <!-- Manual Link -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <tr>
                          <td style="padding: 0 8px;">
                            <p style="font-size: 13px; color: #6b7280; margin: 0 0 10px 0; line-height: 1.5;">Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; overflow-wrap: break-word; color: #667eea; font-size: 12px; background: #f9fafb; padding: 12px; border-radius: 6px; font-family: 'Courier New', monospace; margin: 0; line-height: 1.6;">${verificationUrl}</p>
                          </td>
                        </tr>
                      </table>

                      <!-- Expiration Notice -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                        <tr>
                          <td style="padding: 16px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px;">
                            <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
                              <strong>⏰ Important:</strong> This verification code will expire in <strong>5 minutes</strong>.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Footer -->
                      <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 24px 0 0 0; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <tr>
                          <td align="center" style="padding: 0 8px;">
                            <p style="font-size: 12px; color: #9ca3af; margin: 8px 0; line-height: 1.5;">If you didn't create an account, please ignore this email.</p>
                            <p style="font-size: 12px; color: #9ca3af; margin: 8px 0; line-height: 1.5;">© ${new Date().getFullYear()} PricePulse. All rights reserved.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `
Welcome to PricePulse!

Thank you for signing up! Please verify your email address.

Your Verification Code: ${otpCode}

Enter this code in the app to verify your account, or click the link below:

${verificationUrl}

This code will expire in 5 minutes.

If you didn't create an account, please ignore this email.
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent to ${email}. Message ID: ${info.messageId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send verification email to ${email}:`, {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack,
      });
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

    // For Office365, the "from" email must match the authenticated user
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const fromEmail = this.configService.get<string>('SMTP_SENDER') || 
                      this.configService.get<string>('SMTP_FROM') ||
                      smtpUser || // Fallback to SMTP_USER for Office365 compatibility
                      'noreply@pricepulse.ai';
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
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${email}. Message ID: ${info.messageId}`);
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email to ${email}:`, {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack,
      });
      // Don't throw - allow password reset to proceed even if email fails
    }
  }

  async testEmailConnection(testEmail: string): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    // Check if transporter is configured
    if (!this.transporter) {
      const smtpUser = this.configService.get<string>('SMTP_USER');
      const smtpPass = this.configService.get<string>('SMTP_PASS') || this.configService.get<string>('SMTP_PASSWORD');
      const smtpHost = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
      const smtpPort = this.configService.get<number>('SMTP_PORT', 587);

      return {
        success: false,
        message: 'Email service is not configured',
        details: {
          smtpUser: smtpUser ? 'Set' : 'Missing',
          smtpPass: smtpPass ? 'Set' : 'Missing',
          smtpHost,
          smtpPort,
          error: 'SMTP credentials are missing. Please configure SMTP_USER and SMTP_PASSWORD in your .env file.',
        },
      };
    }

    // Skip verify() for Office365 as it can cause SSL issues
    // We'll test the connection by actually sending an email instead
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const isOffice365 = smtpHost?.includes('office365.com') || smtpHost?.includes('outlook.com');
    
    if (!isOffice365) {
      // Verify SMTP connection for non-Office365 servers
      try {
        await this.transporter.verify();
        this.logger.log('SMTP connection verified successfully');
      } catch (error: any) {
        this.logger.error('SMTP connection verification failed:', error);
        return {
          success: false,
          message: 'SMTP connection failed',
          details: {
            error: error.message || 'Unknown error',
            code: error.code,
            command: error.command,
            response: error.response,
            smtpHost: this.configService.get<string>('SMTP_HOST'),
            smtpPort: this.configService.get<number>('SMTP_PORT'),
          },
        };
      }
    } else {
      this.logger.log('Skipping SMTP verify for Office365, will test by sending email');
    }

    // Try to send a test email
    // For Office365, the "from" email must match the authenticated user
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const fromEmail = this.configService.get<string>('SMTP_SENDER') || 
                      this.configService.get<string>('SMTP_FROM') ||
                      smtpUser || // Fallback to SMTP_USER for Office365 compatibility
                      'noreply@pricepulse.ai';
    const replyTo = this.configService.get<string>('SMTP_REPLY_TO') || fromEmail;

    const testMailOptions = {
      from: fromEmail,
      replyTo: replyTo,
      to: testEmail,
      subject: 'PricePulse Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Test Successful!</h2>
          <p>This is a test email from PricePulse to verify that email sending is working correctly.</p>
          <p>If you received this email, your SMTP configuration is correct.</p>
          <p><strong>Test Details:</strong></p>
          <ul>
            <li>SMTP Host: ${this.configService.get<string>('SMTP_HOST')}</li>
            <li>SMTP Port: ${this.configService.get<number>('SMTP_PORT')}</li>
            <li>From Email: ${fromEmail}</li>
            <li>Test Time: ${new Date().toISOString()}</li>
          </ul>
        </div>
      `,
      text: 'This is a test email from PricePulse. If you received this, email sending is working correctly.',
    };

    try {
      const info = await this.transporter.sendMail(testMailOptions);
      this.logger.log(`Test email sent successfully to ${testEmail}. Message ID: ${info.messageId}`);
      return {
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        details: {
          messageId: info.messageId,
          response: info.response,
          from: fromEmail,
          to: testEmail,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to send test email to ${testEmail}:`, error);
      return {
        success: false,
        message: `Failed to send test email: ${error.message || 'Unknown error'}`,
        details: {
          error: error.message || 'Unknown error',
          code: error.code,
          command: error.command,
          response: error.response,
          from: fromEmail,
          to: testEmail,
        },
      };
    }
  }
}


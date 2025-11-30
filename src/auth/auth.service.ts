import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { EmailService } from './services/email.service';
import { AuditService } from './services/audit.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    private emailService: EmailService,
    private auditService: AuditService,
  ) {}

  async signup(signupDto: SignupDto, ipAddress?: string, userAgent?: string) {
    const { email, password, firstName, lastName } = signupDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(password);

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hours

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.USER,
        isVerified: false,
        verificationToken,
        verificationExpires,
        profile: {
          create: {
            firstName,
            lastName,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      // Log error but don't fail signup
      console.error('Failed to send verification email:', error);
    }

    // Audit log
    await this.auditService.log('SIGNUP', user.id, ipAddress, userAgent);

    return {
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: user.id,
        email: user.email,
        isVerified: user.isVerified,
      },
    };
  }

  async verifyEmail(token: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new NotFoundException('Invalid verification token');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (user.verificationExpires && user.verificationExpires < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationExpires: null,
      },
    });

    await this.auditService.log('EMAIL_VERIFIED', user.id, ipAddress, userAgent);

    return {
      message: 'Email verified successfully',
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      return null;
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async signin(signinDto: SigninDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = signinDto;

    const user = await this.validateUser(email, password);

    if (!user) {
      await this.auditService.log('LOGIN', null, ipAddress, userAgent, {
        email,
        success: false,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is verified
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!fullUser?.isVerified) {
      throw new UnauthorizedException('Please verify your email before signing in');
    }

    // Generate tokens
    const tokens = await this.tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // Update admin last login if admin
    if (user.role === UserRole.ADMIN) {
      await this.prisma.adminSettings.updateMany({
        where: { userId: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    // Audit log
    await this.auditService.log('LOGIN', user.id, ipAddress, userAgent, {
      success: true,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async forgotPassword(email: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists for security
    if (!user) {
      return {
        message: 'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // Send reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    await this.auditService.log('PASSWORD_RESET', user.id, ipAddress, userAgent);

    return {
      message: 'If an account exists with this email, a password reset link has been sent.',
    };
  }

  async resetPassword(token: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new NotFoundException('Invalid reset token');
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const passwordHash = await this.passwordService.hashPassword(password);

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    // Revoke all sessions for security
    await this.tokenService.revokeAllUserSessions(user.id);

    await this.auditService.log('PASSWORD_RESET', user.id, ipAddress, userAgent, {
      action: 'password_changed',
    });

    return {
      message: 'Password reset successfully',
    };
  }

  async googleLogin(googleUser: any, ipAddress?: string, userAgent?: string) {
    const { googleId, email, firstName, lastName } = googleUser;

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
      include: { profile: true },
    });

    if (!user) {
      // Create new user
      user = await this.prisma.user.create({
        data: {
          email,
          googleId,
          role: UserRole.USER,
          isVerified: true, // Google emails are pre-verified
          profile: {
            create: {
              firstName: firstName || '',
              lastName: lastName || '',
            },
          },
        },
        include: { profile: true },
      });

      await this.auditService.log('SIGNUP', user.id, ipAddress, userAgent, {
        method: 'google',
      });
    } else if (!user.googleId) {
      // Link Google account to existing user
      await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId },
      });
    }

    // Generate tokens
    const tokens = await this.tokenService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    await this.auditService.log('LOGIN', user.id, ipAddress, userAgent, {
      method: 'google',
      success: true,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string) {
    const payload = await this.tokenService.validateRefreshToken(refreshToken);

    const tokens = await this.tokenService.generateTokens({
      id: payload.id,
      email: payload.email,
      role: payload.role,
    });

    // Revoke old refresh token
    await this.tokenService.revokeRefreshToken(refreshToken);

    return tokens;
  }

  async logout(refreshToken: string, userId: string) {
    await this.tokenService.revokeRefreshToken(refreshToken);
    await this.auditService.log('LOGOUT', userId);
    return { message: 'Logged out successfully' };
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        adminSettings: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      profile: user.profile,
      adminSettings: user.adminSettings,
    };
  }
}


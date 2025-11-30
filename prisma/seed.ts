import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pricepulse.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');
  } else {
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        isVerified: true,
        profile: {
          create: {
            firstName: 'Admin',
            lastName: 'User',
          },
        },
        adminSettings: {
          create: {
            twoFactorEnabled: false,
          },
        },
      },
    });

    console.log('✅ Created admin user:', admin.email);
  }

  // Create a test regular user (optional, for development)
  const testUserEmail = 'test@pricepulse.ai';
  const testUserPassword = 'Test@123!';
  const hashedTestPassword = await bcrypt.hash(testUserPassword, 10);

  const existingTestUser = await prisma.user.findUnique({
    where: { email: testUserEmail },
  });

  if (!existingTestUser) {
    await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash: hashedTestPassword,
        role: UserRole.USER,
        isVerified: true,
        profile: {
          create: {
            firstName: 'Test',
            lastName: 'User',
          },
        },
      },
    });

    console.log('✅ Created test user:', testUserEmail);
  } else {
    console.log('✅ Test user already exists');
  }

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


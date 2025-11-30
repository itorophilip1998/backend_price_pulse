import { registerAs } from '@nestjs/config';

export default registerAs('cors', () => ({
  origins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8081',
  ],
  credentials: true,
}));


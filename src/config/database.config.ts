import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL || 'postgresql://pricepulse:pricepulse123@localhost:5432/pricepulse?schema=public',
}));


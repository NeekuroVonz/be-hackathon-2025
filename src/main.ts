import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowlist = new Set([
    'http://localhost:3000',
    'http://10.0.109.54:3000',
    'http://10.0.109.54:8080',
    'https://nekooitine.io.vn',
  ]);

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      return allowlist.has(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });
  app.setGlobalPrefix('api');
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'hackathon-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production', // true on prod (https)
      },
    }),
  );

  // 🔥 Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Hackathon 2025 API')
    .setDescription('Simple session-based auth API')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}

bootstrap();

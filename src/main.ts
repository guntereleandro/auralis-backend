// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS - configurado para desenvolvimento + produção
  app.enableCors({
    origin: [
      'http://localhost:3000',      // React/Vite padrão
      'http://127.0.0.1:3000',
      'http://localhost:5173',      // Vite padrão (caso use)
      process.env.FRONTEND_URL || '*', // variável de ambiente (para produção)
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Porta configurável via .env (melhor prática)
  const port = process.env.PORT || 3001;

  await app.listen(port);

  console.log(`🚀 Auralis Backend rodando em http://localhost:${port}`);
  console.log(`🌐 Frontend deve apontar para: http://localhost:${port}`);
}

bootstrap();
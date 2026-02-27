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

  // ✅ CORS mais permissivo para desenvolvimento com celular
  app.enableCors({
    origin: true,                    // permite qualquer origem (celular, Postman, etc.)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3001;

  await app.listen(port);

  console.log(`🚀 Auralis Backend rodando em http://localhost:${port}`);
  console.log(`📱 Pronto para acessar pelo celular na mesma rede`);
}

bootstrap();
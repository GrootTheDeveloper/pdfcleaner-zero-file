import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function parseAllowedOrigins(value: string | undefined): string | string[] {
  if (!value) return 'http://localhost:3000';
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length === 1 ? origins[0] : origins;
}

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    origin: parseAllowedOrigins(process.env.CORS_ORIGIN),
    credentials: true,
  });

  const prefix = process.env.API_PREFIX || 'api/v1';
  const cleanPrefix = prefix.replace(/^\//, '');
  app.setGlobalPrefix(cleanPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableShutdownHooks();

  if (!isProduction || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('PDFCleaner Control Plane API')
      .setDescription(
        'REST API for authentication, custom presets, telemetry, and administration in PDFCleaner.',
      )
      .setVersion('0.1.0')
      .addCookieAuth('jwt', {
        type: 'apiKey',
        in: 'cookie',
        name: 'jwt',
        description: 'JWT token inside httpOnly cookie',
      })
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.API_PORT) || 3001;
  await app.listen(port);
  console.log(
    `PDFCleaner API is running on http://localhost:${port}/${cleanPrefix}`,
  );
}
void bootstrap();

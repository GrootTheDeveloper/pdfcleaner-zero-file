import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const prefix = process.env.API_PREFIX || 'api/v1';
  const cleanPrefix = prefix.replace(/^\//, '');
  app.setGlobalPrefix(cleanPrefix);

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);
  console.log(
    `Application is running on: http://localhost:${port}/${cleanPrefix}`,
  );
}
void bootstrap();

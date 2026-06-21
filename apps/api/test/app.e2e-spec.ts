import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import cookieParser from 'cookie-parser';

describe('PDFCleaner Control Plane API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;
  const testEmail = `test-${Date.now()}-${Math.round(Math.random() * 100000)}@example.com`;
  const testPassword = 'testpassword123';
  let cookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Register cookie-parser in E2E tests so the JwtAuthGuard can read cookies
    app.use(cookieParser());
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    redis = moduleFixture.get<RedisService>(RedisService);
    await app.init();
  });

  afterAll(async () => {
    // Cleanup database records created by tests
    await prisma.preset.deleteMany({
      where: { user: { email: testEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    // Clear rate limits in redis
    try {
      const client = redis.getClient();
      const keys = await client.keys('rate_limit:*');
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch (err) {
      console.error('Redis cleanup error during test tear-down:', err);
    }

    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('PDFCleaner API is running!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body).toHaveProperty('database', 'CONNECTED');
        expect(res.body).toHaveProperty('redis', 'CONNECTED');
      });
  });

  it('/auth/register (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: testEmail, password: testPassword })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect((response.body as { email: string }).email).toBe(testEmail);
  });

  it('/auth/login (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect((response.body as { user: { email: string } }).user.email).toBe(
      testEmail,
    );

    // Get cookie
    const cookies = response.get('Set-Cookie') || [];
    expect(cookies).toBeDefined();
    cookie = cookies[0];
    expect(cookie).toContain('jwt=');
  });

  it('/auth/me (GET) - Unauthorized without cookie', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('/auth/me (GET) - Success with cookie', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', [cookie])
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect((response.body as { user: { email: string } }).user.email).toBe(
      testEmail,
    );
  });

  it('/presets (POST) - Create custom preset', async () => {
    const config = {
      mode: 'custom',
      dpi: 200,
      jpegQuality: 85,
      grayscale: true,
      gamma: 1.0,
      contrast: 1.2,
      enableNoiseReduction: true,
      enableBackgroundNorm: true,
      enableThresholding: true,
      enableMorphology: true,
    };

    const response = await request(app.getHttpServer())
      .post('/presets')
      .set('Cookie', [cookie])
      .send({
        name: 'My Custom Clean E2E',
        config,
        isPublic: false,
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect((response.body as { name: string }).name).toBe(
      'My Custom Clean E2E',
    );
  });

  it('/telemetry (POST) - Log usage statistics', () => {
    return request(app.getHttpServer())
      .post('/telemetry')
      .send({
        mode: 'light-clean',
        pagesProcessed: 3,
        pagesSkipped: 1,
        durationMs: 1500,
        outputSizeBytes: 89000,
      })
      .expect(201);
  });

  it('/errors (POST) - Log client errors', () => {
    return request(app.getHttpServer())
      .post('/errors')
      .send({
        errorCode: 'PROCESSING_FAILED',
        errorMessage: 'Test error message',
        stackTrace: 'TypeError: test at C:\\Users\\User\\project',
        mode: 'strong-background-removal',
      })
      .expect(201);
  });

  it('should trigger rate limiting on login after 5 requests', async () => {
    // We already made 1 registration and 1 login request (total 2).
    // Let's make 3 more logins (total 5) which should succeed.
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);
    }

    // The 6th request (total) must trigger rate limiting and fail with a 429 status code
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testEmail, password: testPassword })
      .expect(429);
  });

  it('/auth/logout (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    const cookies = response.get('Set-Cookie') || [];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('jwt=;'); // cleared
  });
});

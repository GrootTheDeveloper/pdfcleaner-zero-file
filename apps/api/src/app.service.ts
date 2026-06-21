import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { LIMITS } from '@pdfcleaner/shared';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  getHello(): string {
    return 'PDFCleaner API is running!';
  }

  async checkHealth() {
    let dbPing = false;
    let redisPing = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbPing = true;
    } catch (err) {
      console.error('Healthcheck DB Ping failed:', err);
    }

    try {
      const client = this.redisService.getClient();
      const pong = await client.ping();
      redisPing = pong === 'PONG';
    } catch (err) {
      console.error('Healthcheck Redis Ping failed:', err);
    }

    return {
      status: dbPing && redisPing ? 'OK' : 'DEGRADED',
      database: dbPing ? 'CONNECTED' : 'DISCONNECTED',
      redis: redisPing ? 'CONNECTED' : 'DISCONNECTED',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getEngineConfig(id: string) {
    try {
      const config = await this.prisma.engineConfig.findUnique({
        where: { id },
      });
      if (config) {
        return config.value;
      }
    } catch (err) {
      console.error('Failed to fetch engine config:', err);
    }
    // Fallback to shared LIMITS constant if not defined in database
    return LIMITS;
  }

  async getLatestVersion() {
    try {
      const version = await this.prisma.appVersion.findFirst({
        orderBy: { releasedAt: 'desc' },
      });
      if (version) {
        return version;
      }
    } catch (err) {
      console.error('Failed to fetch latest version:', err);
    }
    return {
      version: '1.0.0',
      forceUpdate: false,
      releasedAt: new Date(),
    };
  }
}

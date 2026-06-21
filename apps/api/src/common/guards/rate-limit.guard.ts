import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import type { Request, Response } from 'express';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    // Resolve IP address
    const ip =
      (request.headers['x-forwarded-for'] as string) ||
      request.ip ||
      request.socket.remoteAddress ||
      '127.0.0.1';

    const url = request.url;

    // Define window size and limits
    let limit = 120;
    const windowMs = 60000; // 1 minute window
    let category = 'general';

    if (url.includes('/auth/register') || url.includes('/auth/login')) {
      limit = 5;
      category = 'auth';
    } else if (url.includes('/telemetry') || url.includes('/errors')) {
      limit = 60;
      category = 'telemetry';
    }

    const key = `rate_limit:${ip}:${category}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const redis = this.redisService.getClient();

      // sliding window algorithm via Redis transactional sorted sets
      const multi = redis.multi();
      multi.zremrangebyscore(key, '-inf', windowStart);
      multi.zadd(key, now, `${now}-${Math.random()}`);
      multi.zcard(key);
      multi.expire(key, Math.ceil(windowMs / 1000));

      const results = await multi.exec();
      if (!results) {
        return true; // Fail open
      }

      // zcard is the 3rd operation (index 2)
      const countResult = results[2];
      const count =
        typeof countResult[1] === 'number'
          ? countResult[1]
          : Number(countResult[1]);

      const remaining = Math.max(0, limit - count);

      // Estimate reset time based on the oldest element in the set
      let resetTimeSeconds = Math.ceil(windowMs / 1000);
      const oldestResult = await redis.zrange(key, 0, 0, 'WITHSCORES');
      if (oldestResult && oldestResult.length > 0) {
        // WITHSCORES returns [element, score]
        const oldestTimestamp = Number(oldestResult[1] || oldestResult[0]);
        if (!isNaN(oldestTimestamp)) {
          resetTimeSeconds = Math.ceil(
            (oldestTimestamp + windowMs - now) / 1000,
          );
        }
      }

      response.setHeader('X-RateLimit-Limit', limit);
      response.setHeader('X-RateLimit-Remaining', remaining);
      response.setHeader('X-RateLimit-Reset', Math.max(0, resetTimeSeconds));

      if (count > limit) {
        throw new HttpException(
          {
            success: false,
            errorCode: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.',
            timestamp: new Date().toISOString(),
            path: request.url,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (err) {
      if (err instanceof HttpException) {
        throw err;
      }
      console.error('Rate Limiting Error:', err);
      // Fail open to avoid blocking users if Redis is down
    }

    return true;
  }
}

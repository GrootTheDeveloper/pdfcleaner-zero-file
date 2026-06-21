import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreatePresetDto } from './dto/create-preset.dto';
import { UpdatePresetDto } from './dto/update-preset.dto';
import { Preset, Prisma } from '@prisma/client';

const PUBLIC_PRESETS_CACHE_KEY = 'presets:public';
const CACHE_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class PresetsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  private async invalidatePublicCache() {
    try {
      await this.redisService.del(PUBLIC_PRESETS_CACHE_KEY);
    } catch (err) {
      console.error('Redis cache invalidation error:', err);
    }
  }

  async getPublicPresets(): Promise<Preset[]> {
    // Try to get from Redis cache first
    try {
      const cached = await this.redisService.get(PUBLIC_PRESETS_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as Preset[];
      }
    } catch (err) {
      console.error('Redis cache retrieval error:', err);
    }

    // Fetch from database
    const presets = await this.prisma.preset.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: 'asc' },
    });

    // Save to Redis cache
    try {
      await this.redisService.set(
        PUBLIC_PRESETS_CACHE_KEY,
        JSON.stringify(presets),
        CACHE_TTL_SECONDS,
      );
    } catch (err) {
      console.error('Redis cache storage error:', err);
    }

    return presets;
  }

  async getPresetById(id: string): Promise<Preset> {
    const preset = await this.prisma.preset.findUnique({
      where: { id },
    });

    if (!preset) {
      throw new NotFoundException(`Preset with ID ${id} not found`);
    }

    return preset;
  }

  async getMyPresets(userId: string): Promise<Preset[]> {
    return this.prisma.preset.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createPreset(userId: string, dto: CreatePresetDto): Promise<Preset> {
    const preset = await this.prisma.preset.create({
      data: {
        name: dto.name,
        config: dto.config as unknown as Prisma.InputJsonValue,
        isPublic: dto.isPublic ?? false,
        userId,
      },
    });

    if (preset.isPublic) {
      await this.invalidatePublicCache();
    }

    return preset;
  }

  async updatePreset(
    id: string,
    userId: string,
    userRole: string,
    dto: UpdatePresetDto,
  ): Promise<Preset> {
    const preset = await this.getPresetById(id);

    // Ownership check (Admins can edit anything, users can only edit their own)
    if (preset.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to modify this preset',
      );
    }

    const updated = await this.prisma.preset.update({
      where: { id },
      data: {
        name: dto.name,
        config: dto.config
          ? (dto.config as unknown as Prisma.InputJsonValue)
          : undefined,
        isPublic: dto.isPublic,
      },
    });

    // Invalidate cache
    if (preset.isPublic || updated.isPublic) {
      await this.invalidatePublicCache();
    }

    return updated;
  }

  async deletePreset(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<{ success: boolean }> {
    const preset = await this.getPresetById(id);

    // Ownership check
    if (preset.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'You do not have permission to delete this preset',
      );
    }

    await this.prisma.preset.delete({
      where: { id },
    });

    if (preset.isPublic) {
      await this.invalidatePublicCache();
    }

    return { success: true };
  }
}

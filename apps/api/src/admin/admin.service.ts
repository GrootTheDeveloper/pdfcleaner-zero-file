import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { UpdateEngineConfigDto } from './dto/update-engine-config.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsageSummary() {
    const aggregate = await this.prisma.telemetry.aggregate({
      _sum: {
        pagesProcessed: true,
        pagesSkipped: true,
        outputSizeBytes: true,
      },
      _avg: {
        durationMs: true,
      },
      _count: {
        id: true,
      },
    });

    const modeGroups = await this.prisma.telemetry.groupBy({
      by: ['mode'],
      _sum: {
        pagesProcessed: true,
        pagesSkipped: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalRuns: aggregate._count.id,
      totalPagesProcessed: aggregate._sum.pagesProcessed || 0,
      totalPagesSkipped: aggregate._sum.pagesSkipped || 0,
      totalOutputSizeBytes: aggregate._sum.outputSizeBytes || 0,
      averageDurationMs: Math.round(aggregate._avg.durationMs || 0),
      byMode: modeGroups.map((g) => ({
        mode: g.mode,
        runs: g._count.id,
        pagesProcessed: g._sum.pagesProcessed || 0,
        pagesSkipped: g._sum.pagesSkipped || 0,
      })),
    };
  }

  async getErrorReports(page = 1, limit = 20, errorCode?: string) {
    const skip = (page - 1) * limit;

    const where = errorCode ? { errorCode } : {};

    const [items, total] = await Promise.all([
      this.prisma.errorReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.errorReport.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateEngineConfig(id: string, dto: UpdateEngineConfigDto) {
    return this.prisma.engineConfig.upsert({
      where: { id },
      update: { value: dto.value },
      create: { id, value: dto.value },
    });
  }

  async getEngineConfig(id: string) {
    const config = await this.prisma.engineConfig.findUnique({
      where: { id },
    });
    if (!config) {
      throw new NotFoundException(
        `Engine configuration with ID ${id} not found`,
      );
    }
    return config;
  }

  async createAppVersion(dto: CreateAppVersionDto) {
    return this.prisma.appVersion.create({
      data: {
        version: dto.version,
        forceUpdate: dto.forceUpdate ?? false,
      },
    });
  }

  async getLatestVersion() {
    const version = await this.prisma.appVersion.findFirst({
      orderBy: { releasedAt: 'desc' },
    });
    if (!version) {
      return { version: '1.0.0', forceUpdate: false, releasedAt: new Date() };
    }
    return version;
  }
}

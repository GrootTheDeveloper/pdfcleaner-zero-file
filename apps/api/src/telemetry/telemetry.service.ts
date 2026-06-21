import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { CreateErrorReportDto } from './dto/create-error-report.dto';
import { Telemetry, ErrorReport } from '@prisma/client';

@Injectable()
export class TelemetryService {
  constructor(private prisma: PrismaService) {}

  async createTelemetry(
    userId: string | null,
    dto: CreateTelemetryDto,
  ): Promise<Telemetry> {
    return this.prisma.telemetry.create({
      data: {
        userId,
        mode: dto.mode,
        pagesProcessed: dto.pagesProcessed,
        pagesSkipped: dto.pagesSkipped,
        durationMs: dto.durationMs,
        outputSizeBytes: dto.outputSizeBytes,
      },
    });
  }

  async createErrorReport(
    userId: string | null,
    dto: CreateErrorReportDto,
  ): Promise<ErrorReport> {
    const sanitizedStack = this.sanitizeStackTrace(dto.stackTrace);

    return this.prisma.errorReport.create({
      data: {
        userId,
        errorCode: dto.errorCode,
        errorMessage: dto.errorMessage,
        stackTrace: sanitizedStack,
        mode: dto.mode,
      },
    });
  }

  private sanitizeStackTrace(stack?: string): string | undefined {
    if (!stack) return undefined;

    let sanitized = stack;

    // Replace typical Windows/Mac/Linux user profile directories to protect developer/user identity
    sanitized = sanitized.replace(
      /[a-zA-Z]:\\[Uu]sers\\[^\\]+/gi,
      'C:\\Users\\User',
    );
    sanitized = sanitized.replace(/\/Users\/[^/]+/g, '/Users/User');
    sanitized = sanitized.replace(/\/home\/[^/]+/g, '/home/User');

    // Clean project root paths (e.g., F:\github-project\PDFCleaner\apps\web\src...)
    sanitized = sanitized.replace(
      /[a-zA-Z]:\\[^\\]+\\PDFCleaner/gi,
      'PDFCleaner',
    );

    return sanitized;
  }
}

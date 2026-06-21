import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { CreateErrorReportDto } from './dto/create-error-report.dto';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Telemetry, ErrorReport } from '@prisma/client';

@ApiTags('Telemetry')
@Controller()
export class TelemetryController {
  constructor(private telemetryService: TelemetryService) {}

  @Post('telemetry')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: 'Submit anonymous or authenticated processing telemetry',
  })
  @ApiResponse({ status: 201, description: 'Telemetry successfully logged' })
  logTelemetry(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateTelemetryDto,
  ): Promise<Telemetry> {
    const userId = user ? user.id : null;
    return this.telemetryService.createTelemetry(userId, dto);
  }

  @Post('errors')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Submit anonymous or authenticated error report' })
  @ApiResponse({ status: 201, description: 'Error report successfully logged' })
  logError(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Body() dto: CreateErrorReportDto,
  ): Promise<ErrorReport> {
    const userId = user ? user.id : null;
    return this.telemetryService.createErrorReport(userId, dto);
  }
}

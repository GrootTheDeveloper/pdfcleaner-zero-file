import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAppVersionDto } from './dto/create-app-version.dto';
import { UpdateEngineConfigDto } from './dto/update-engine-config.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiCookieAuth()
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('usage-summary')
  @ApiOperation({ summary: 'Get aggregated usage metrics' })
  @ApiResponse({ status: 200, description: 'Return summary statistics' })
  async getUsageSummary() {
    return this.adminService.getUsageSummary();
  }

  @Get('error-reports')
  @ApiOperation({ summary: 'Get paginated list of client error reports' })
  @ApiResponse({ status: 200, description: 'Return list of error reports' })
  async getErrorReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('errorCode') errorCode?: string,
  ) {
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 20;
    return this.adminService.getErrorReports(pageNum, limitNum, errorCode);
  }

  @Put('engine-config/:id')
  @ApiOperation({ summary: 'Create or update dynamic engine configuration' })
  @ApiResponse({
    status: 200,
    description: 'Configuration successfully updated',
  })
  async updateEngineConfig(
    @Param('id') id: string,
    @Body() dto: UpdateEngineConfigDto,
  ) {
    return this.adminService.updateEngineConfig(id, dto);
  }

  @Post('app-version')
  @ApiOperation({ summary: 'Release a new app version' })
  @ApiResponse({ status: 201, description: 'Version successfully created' })
  async createAppVersion(@Body() dto: CreateAppVersionDto) {
    return this.adminService.createAppVersion(dto);
  }
}

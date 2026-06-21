import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get root hello message' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Retrieve system health status' })
  @ApiResponse({ status: 200, description: 'Return system check data' })
  async checkHealth() {
    return this.appService.checkHealth();
  }

  @Get('engine-config/:id')
  @ApiOperation({ summary: 'Retrieve active engine configurations by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return engine configuration parameters',
  })
  async getEngineConfig(@Param('id') id: string) {
    return this.appService.getEngineConfig(id);
  }

  @Get('app-version/latest')
  @ApiOperation({
    summary: 'Retrieve the latest available application version',
  })
  @ApiResponse({ status: 200, description: 'Return latest app version info' })
  async getLatestVersion() {
    return this.appService.getLatestVersion();
  }
}

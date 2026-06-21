import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { PresetsService } from './presets.service';
import { CreatePresetDto } from './dto/create-preset.dto';
import { UpdatePresetDto } from './dto/update-preset.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/auth.interface';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';

@ApiTags('Presets')
@Controller('presets')
export class PresetsController {
  constructor(private presetsService: PresetsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all public presets (cached)' })
  @ApiResponse({ status: 200, description: 'Return public presets list' })
  getPublicPresets() {
    return this.presetsService.getPublicPresets();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current user custom presets' })
  @ApiResponse({ status: 200, description: 'Return user presets list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyPresets(@CurrentUser() user: AuthenticatedUser) {
    return this.presetsService.getMyPresets(user.id);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get preset by ID' })
  @ApiResponse({ status: 200, description: 'Return preset detail' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden access to private preset',
  })
  @ApiResponse({ status: 404, description: 'Preset not found' })
  async getPresetById(
    @Param('id') id: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const preset = await this.presetsService.getPresetById(id);
    if (!preset.isPublic) {
      if (!user || (preset.userId !== user.id && user.role !== 'ADMIN')) {
        throw new ForbiddenException('You do not have access to this preset');
      }
    }
    return preset;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Create a custom preset' })
  @ApiResponse({ status: 201, description: 'Preset successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  createPreset(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePresetDto,
  ) {
    return this.presetsService.createPreset(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Update a custom preset' })
  @ApiResponse({ status: 200, description: 'Preset successfully updated' })
  @ApiResponse({ status: 403, description: 'Forbidden modify' })
  @ApiResponse({ status: 404, description: 'Preset not found' })
  updatePreset(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePresetDto,
  ) {
    return this.presetsService.updatePreset(id, user.id, user.role, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Delete a custom preset' })
  @ApiResponse({ status: 200, description: 'Preset successfully deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden delete' })
  @ApiResponse({ status: 404, description: 'Preset not found' })
  deletePreset(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.presetsService.deletePreset(id, user.id, user.role);
  }
}

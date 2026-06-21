import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProcessingConfigDto } from './processing-config.dto';

export class UpdatePresetDto {
  @ApiProperty({
    example: 'Updated Clean Name',
    required: false,
    description: 'Updated name',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    type: ProcessingConfigDto,
    required: false,
    description: 'Updated configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProcessingConfigDto)
  config?: ProcessingConfigDto;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Updated visibility status',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

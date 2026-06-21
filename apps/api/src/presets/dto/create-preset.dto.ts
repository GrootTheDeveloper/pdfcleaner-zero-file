import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProcessingConfigDto } from './processing-config.dto';

export class CreatePresetDto {
  @ApiProperty({
    example: 'My Custom Clean',
    description: 'Name of the custom preset',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: ProcessingConfigDto,
    description: 'Processing configuration parameters',
  })
  @ValidateNested()
  @Type(() => ProcessingConfigDto)
  config: ProcessingConfigDto;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Whether the preset is public',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppVersionDto {
  @ApiProperty({ example: '1.0.0', description: 'Application version string' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Whether this update is mandatory',
  })
  @IsOptional()
  @IsBoolean()
  forceUpdate?: boolean;
}

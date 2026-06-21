import { IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateEngineConfigDto {
  @ApiProperty({
    example: { MAX_PAGES: 100, MAX_FILE_SIZE_MB: 200 },
    description: 'JSON value for the dynamic configuration',
  })
  @IsObject()
  @IsNotEmpty()
  value: Record<string, any>;
}

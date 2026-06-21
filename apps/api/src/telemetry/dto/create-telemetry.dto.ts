import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTelemetryDto {
  @ApiProperty({ example: 'light-clean', description: 'Processing mode used' })
  @IsString()
  @IsNotEmpty()
  mode: string;

  @ApiProperty({
    example: 5,
    description: 'Number of successfully processed pages',
  })
  @IsInt()
  @Min(0)
  pagesProcessed: number;

  @ApiProperty({
    example: 0,
    description: 'Number of skipped pages due to errors',
  })
  @IsInt()
  @Min(0)
  pagesSkipped: number;

  @ApiProperty({
    example: 1200,
    description: 'Execution duration in milliseconds',
  })
  @IsInt()
  @Min(0)
  durationMs: number;

  @ApiProperty({
    example: 450000,
    description: 'Size of the generated output file in bytes',
  })
  @IsInt()
  @Min(0)
  outputSizeBytes: number;
}

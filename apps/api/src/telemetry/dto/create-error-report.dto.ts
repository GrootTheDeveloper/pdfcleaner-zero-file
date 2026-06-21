import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateErrorReportDto {
  @ApiProperty({
    example: 'PROCESSING_FAILED',
    description: 'Application error code',
  })
  @IsString()
  @IsNotEmpty()
  errorCode: string;

  @ApiProperty({
    example: 'cv.minAreaRect is not a function',
    description: 'Detailed error message',
  })
  @IsString()
  @IsNotEmpty()
  errorMessage: string;

  @ApiProperty({
    example: 'TypeError: cv.minAreaRect is not a function\n    at deskew...',
    required: false,
    description: 'Optional stack trace',
  })
  @IsOptional()
  @IsString()
  stackTrace?: string;

  @ApiProperty({
    example: 'light-clean',
    description: 'Processing mode during which the error occurred',
  })
  @IsString()
  @IsNotEmpty()
  mode: string;
}

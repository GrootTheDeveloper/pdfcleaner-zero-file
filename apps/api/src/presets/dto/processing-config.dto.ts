import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessingConfigDto {
  @ApiProperty({ example: 'custom', description: 'Preset processing mode' })
  @IsString()
  mode: string;

  @ApiProperty({ example: 200, description: 'DPI resolution (150-300)' })
  @IsNumber()
  @Min(150)
  @Max(300)
  dpi: number;

  @ApiProperty({ example: 85, description: 'JPEG export quality (70-95)' })
  @IsNumber()
  @Min(70)
  @Max(95)
  jpegQuality: number;

  @ApiProperty({ example: true, description: 'Convert to grayscale output' })
  @IsBoolean()
  grayscale: boolean;

  @ApiProperty({
    example: 1.0,
    description: 'Gamma correction parameter (0.5-2.0)',
  })
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  gamma: number;

  @ApiProperty({
    example: 1.2,
    description: 'Contrast scaling parameter (0.5-2.0)',
  })
  @IsNumber()
  @Min(0.5)
  @Max(2.0)
  contrast: number;

  @ApiProperty({
    example: 21,
    required: false,
    description: 'Adaptive threshold block size',
  })
  @IsOptional()
  @IsNumber()
  thresholdBlockSize?: number;

  @ApiProperty({
    example: 5,
    required: false,
    description: 'Adaptive threshold constant C',
  })
  @IsOptional()
  @IsNumber()
  thresholdC?: number;

  @ApiProperty({
    example: 3,
    required: false,
    description: 'Blur filter kernel size',
  })
  @IsOptional()
  @IsNumber()
  blurKernelSize?: number;

  @ApiProperty({
    example: 'median',
    required: false,
    enum: ['gaussian', 'median'],
    description: 'Type of blur filter',
  })
  @IsOptional()
  @IsString()
  blurType?: 'gaussian' | 'median';

  @ApiProperty({
    example: 2,
    required: false,
    description: 'Morphology filter kernel size',
  })
  @IsOptional()
  @IsNumber()
  morphologyKernelSize?: number;

  @ApiProperty({
    example: 'open',
    required: false,
    enum: ['open', 'close'],
    description: 'Type of morphological filter',
  })
  @IsOptional()
  @IsString()
  morphType?: 'open' | 'close';

  @ApiProperty({
    example: 25,
    required: false,
    description: 'Background normalization kernel size',
  })
  @IsOptional()
  @IsNumber()
  normKernelSize?: number;

  @ApiProperty({ example: true, description: 'Enable noise reduction step' })
  @IsBoolean()
  enableNoiseReduction: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Enable auto deskew rotation step',
  })
  @IsOptional()
  @IsBoolean()
  enableDeskew?: boolean;

  @ApiProperty({
    example: true,
    description: 'Enable background normalization step',
  })
  @IsBoolean()
  enableBackgroundNorm: boolean;

  @ApiProperty({
    example: true,
    description: 'Enable adaptive thresholding step',
  })
  @IsBoolean()
  enableThresholding: boolean;

  @ApiProperty({ example: true, description: 'Enable morphology step' })
  @IsBoolean()
  enableMorphology: boolean;
}

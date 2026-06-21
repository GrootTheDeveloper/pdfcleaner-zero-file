import { Module } from '@nestjs/common';
import { PresetsService } from './presets.service';
import { PresetsController } from './presets.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PresetsController],
  providers: [PresetsService],
  exports: [PresetsService],
})
export class PresetsModule {}

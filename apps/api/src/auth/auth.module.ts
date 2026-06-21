import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { getJwtSecret } from './jwt-secret';

@Module({
  imports: [
    JwtModule.register({
      secret: getJwtSecret(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

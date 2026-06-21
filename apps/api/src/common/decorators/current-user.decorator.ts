import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as express from 'express';
import { AuthenticatedUser } from '../interfaces/auth.interface';

interface RequestWithUser extends express.Request {
  user?: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);

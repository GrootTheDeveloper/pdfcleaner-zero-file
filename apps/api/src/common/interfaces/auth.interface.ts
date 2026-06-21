import { Role } from '@prisma/client';

export class AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

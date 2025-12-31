import { SetMetadata } from '@nestjs/common';

export const ROLE = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

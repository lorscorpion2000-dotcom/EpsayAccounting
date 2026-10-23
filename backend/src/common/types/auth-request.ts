import type { Request } from 'express';

/**
 * User object attached to request by JwtStrategy.
 * Contains user data + flattened permissions.
 */
export interface AuthUser {
  id: string;
  username: string;
  fullName?: string;
  email?: string | null;
  mobile?: string | null;
  roles: string[];
  permissions: string[];
  isStaff?: boolean;
  projectIds?: string[];
  defaultProjectId?: string | null;
  mustChangePassword?: boolean;
}

/**
 * Express Request with authenticated user.
 * Use as `@Req() req: AuthRequest` in controllers.
 */
export interface AuthRequest extends Request {
  user: AuthUser;
}
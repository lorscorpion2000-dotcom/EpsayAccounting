export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  nationalCode?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  roles: Role[];
}

export interface Role {
  id: string;
  code: string;
  displayName: string;
  description?: string | null;
  isSystem?: boolean;
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  displayName: string;
  module: string;
  action: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    email?: string | null;
    mobile?: string | null;
    roles: string[];
    permissions: string[];
    mustChangePassword?: boolean;
  };
}
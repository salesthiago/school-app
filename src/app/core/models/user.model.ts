export type Role = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  institutionId?: string;
  avatarUrl?: string;
  bio?: string;
  socialLinks?: { instagram?: string; twitter?: string };
  passwordChangedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

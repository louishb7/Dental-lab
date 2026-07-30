export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: 'bearer';
  username: string;
  email: string;
}

export interface AuthUserResponse {
  id: number;
  username: string;
  email: string;
}

export interface JwtPayload {
  sub?: unknown;
}

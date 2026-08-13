export const JWT_ALGORITHM = 'HS256' as const;
export const ACCESS_TOKEN_EXPIRE_MINUTES: number = 0;
export const PASSWORD_HASH_ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12;
export const ACCOUNT_LOCK_MAX_ATTEMPTS = 5;
export const ACCOUNT_LOCK_MINUTES = 15;
export const LOGIN_RATE_LIMIT_ATTEMPTS = 10;
export const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 60;

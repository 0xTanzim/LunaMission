/**
 * Server Configuration module.
 * SRP: Externalizes runtime environment variables, ports, limits, and CORS origins.
 */

export interface ServerConfig {
  port: number;
  host: string;
  allowedOrigins: string[];
  maxRequestBodyBytes: number;
  environment: 'development' | 'production' | 'test';
}

export const SERVER_CONFIG: ServerConfig = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || '0.0.0.0',
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  maxRequestBodyBytes: 2 * 1024 * 1024, // 2MB cap
  environment: (process.env.NODE_ENV as any) || 'development',
};

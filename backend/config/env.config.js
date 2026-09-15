import 'dotenv/config';

export const env = {
  PORT: 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_APP_PASSWORD: process.env.EMAIL_APP_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER || '',
  // Oracle SQL Database Configuration
  ORACLE_USER: process.env.ORACLE_USER || 'system',
  ORACLE_PASSWORD: process.env.ORACLE_PASSWORD || '',
  ORACLE_CONNECT_STRING: process.env.ORACLE_CONNECT_STRING || (
    process.env.ORACLE_HOST 
      ? `${process.env.ORACLE_HOST}:${process.env.ORACLE_PORT || 1521}/${process.env.ORACLE_SERVICE_NAME || 'XEPDB1'}`
      : 'localhost:1521/XEPDB1'
  ),
  ORACLE_HOST: process.env.ORACLE_HOST || 'localhost',
  ORACLE_PORT: parseInt(process.env.ORACLE_PORT || '1521', 10),
  ORACLE_SERVICE_NAME: process.env.ORACLE_SERVICE_NAME || 'XEPDB1',
  ORACLE_POOL_MIN: parseInt(process.env.ORACLE_POOL_MIN || '1', 10),
  ORACLE_POOL_MAX: parseInt(process.env.ORACLE_POOL_MAX || '10', 10),
  ORACLE_POOL_INCREMENT: parseInt(process.env.ORACLE_POOL_INCREMENT || '1', 10),
  ORACLE_TIMEOUT: parseInt(process.env.ORACLE_TIMEOUT || '60', 10)
};

export default env;
